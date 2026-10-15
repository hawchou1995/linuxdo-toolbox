# Base 编码自动识别与格式选择实施计划

> **For agentic workers:** 按 `executing-plans` 逐任务执行。步骤使用 checkbox 跟踪；每个任务完成后跑所列自检，不做 Git commit 或远端发布，除非另行获准。

**Goal:** 在 LINUX DO 工具箱的帖子自动扫描和手动面板中支持 Base16、RFC 4648 Base32、Bitcoin 原始 Base58、标准 Base64 与 Base64URL 的识别/解码，并允许加码时选择格式。

**Architecture:** 在现有单文件 userscript 中增加共享字节 codec 注册表，手动解码与帖子扫描共用格式校验和文本判据。自动扫描只接受唯一且可读的解码文本；多个格式若产生相同文本则合并（Base64/Base64URL 共享字母表时以 Base64 为准，出现 `-` 或 `_` 时以 Base64URL 为准），不同文本结果才构成歧义。手动自动模式展示不同结果并允许强制选择；面板复用现有方向切换、参数存储和输出渲染。

**Tech Stack:** 原生 JavaScript、UTF-8 `TextEncoder` / `TextDecoder`、现有离线 Chromium 自检页与 Node.js/Playwright 自检执行器；不加外部依赖。

## Global Constraints

- 支持 Base16、RFC 4648 Base32、Bitcoin 字母表的原始 Base58、标准 Base64、Base64URL；暂不支持 Base58Check、Ascii85/Z85、basE91。
- Base16/Base32/Base58/Base64 codec 共用字节接口；Base58 必须保留前导零字节与前导 `1` 的对应关系。
- 自动正文扫描仅在恰好一个不同文本结果通过校验、严格 UTF-8、现有 `CFG.minDecoded` 和可打印性判据时替换原文；同结果候选合并；无效或存在多个不同文本结果时保持原文。
- 多层解码每轮重新识别格式，并分别遵守 `CFG.maxRounds` 与 `MANUAL.maxRounds`；编码的所有轮次使用选定的同一格式。
- 保留手动解码首轮 `lossy` 回退及其标记；正文自动扫描、后续下钻只接受严格 UTF-8。
- 不引入第三方库、不存储示例帖的 key-like 字符串、不改变其他功能或 Cloudflare 逻辑。
- 更新 userscript 版本锚点为 `2.9.0`；只改本地文件，不提交、不推送、不发布。

## Files and Responsibilities

- Modify `linuxdo-toolbox.user.js`: codec 字节转换、候选检测、正文/手动解码接线、格式选择 UI、持久化、版本锚点。
- Modify `scripts/selfcheck.html`: 在现有浏览器自检中加入 codec 向量、检测歧义、面板选择与帖子正文识别断言。
- Modify `README.md`: 更新支持格式、歧义行为、格式选择、测试说明与 v2.9.0 记录。
- `CONTEXT.md`: 已补领域词汇；若实现没有新增术语，不再扩写。
- Read-only standards: RFC 4648 §§3.2, 4, 6, 8；Bitcoin Core `src/base58.cpp` 对前导零字节/Base58Check 分离的处理。

---

### Task 1: 建立共享 Base codec 字节层

**Files:**
- Modify: `linuxdo-toolbox.user.js`，编码核心约第 633–669、1108–1149 行及调试出口约第 4198 行。
- Test: `scripts/selfcheck.html`，现有「密文自解」测试段约第 444–493 行。

**Interfaces:**
- `window.__LDB64__.baseCodecs.decodeBytes(format, encoded)` → `Uint8Array` 或 `null`。
- `window.__LDB64__.baseCodecs.encodeBytes(format, bytes)` → encoded `string` 或 `null`。
- 格式 ID 固定为 `base16`、`base32`、`base58`、`base64`、`base64url`。
- Base16 输出大写；Base32 使用 RFC 4648 大写字母表及标准 padding；Base64/Base64URL 复用现有字节路径；Base58 用 Bitcoin 原始字母表，禁止把 Base58Check checksum 当作 codec 的一部分。

- [x] **Step 1: 先在 selfcheck 添加纯字节 codec 断言**

```js
const codecs = window.__LDB64__.baseCodecs;
const decodeUtf8 = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
const bytes = text => new TextEncoder().encode(text);
ok('Base16 Hello 向量', decodeUtf8(codecs.decodeBytes('base16', '48656C6C6F')) === 'Hello');
ok('Base32 Hello 向量', decodeUtf8(codecs.decodeBytes('base32', 'JBSWY3DP')) === 'Hello');
ok('Base64 Hello 向量', decodeUtf8(codecs.decodeBytes('base64', 'SGVsbG8=')) === 'Hello');
ok('Base58 保留两个前导零字节', codecs.encodeBytes('base58', Uint8Array.of(0, 0)) === '11'
  && codecs.decodeBytes('base58', '11').length === 2
  && codecs.decodeBytes('base58', '11')[0] === 0
  && codecs.decodeBytes('base58', '11')[1] === 0);
ok('Base58 文本往返', decodeUtf8(codecs.decodeBytes('base58', codecs.encodeBytes('base58', bytes('Base58 fixture')))) === 'Base58 fixture');
ok('Base58 拒绝非法字符', codecs.decodeBytes('base58', '0OIl') === null);
ok('Base64URL 输出与逆变换', codecs.encodeBytes('base64url', Uint8Array.of(251, 255)) === '-_8'
  && codecs.decodeBytes('base64url', '-_8').join(',') === '251,255');
```

- [x] **Step 2: 运行自检确认新断言先失败**

Run: `node scripts/run-selfcheck.cjs`（在 `linuxdo-toolbox` 目录执行）。
Expected: 新 codec 断言失败，因为 `baseCodecs` 尚未导出。

- [x] **Step 3: 实现严格字节 codec**

在用户脚本 Base64 字节核心旁新增 `decodeBaseBytes(format, encoded)` 与 `encodeBaseBytes(format, bytes)`；所有 decoder 先验证字母表、长度与 padding，再返回字节，不在该层做 UTF-8 转换。Base58 用 BigInt 进行 base-58/base-256 转换，逐个保留前导 `1` 与零字节；Base16 要求偶数个十六进制数字；Base32 仅接受 RFC 4648 字母表及合法尾部 padding。

- [x] **Step 4: 将 codec 接口暴露给离线自检**

在 `window.__LDB64__` 的无副作用调试出口加：

```js
baseCodecs: { decodeBytes: decodeBaseBytes, encodeBytes: encodeBaseBytes }
```

- [x] **Step 5: 重跑完整自检验证 codec 断言**

Run: `node scripts/run-selfcheck.cjs`。
Expected: 新增向量全 PASS；现有断言不回退。

---

### Task 2: 接入自动候选识别、歧义判定与双解码路径

**Files:**
- Modify: `linuxdo-toolbox.user.js`，自动解码与手动解码核心，以及 `window.__LDB64__` 出口。
- Test: `scripts/selfcheck.html`。

**Interfaces:**
- `detectBaseCandidates(input, options)` → `[{format, label, text, lossy}]`；`options` 为 `{format = 'auto', allowLossy = false, minDecoded}`。
- `options.format === 'auto'` 表示检测所有支持格式；显式格式只尝试该 codec。
- `resolveText(token)` 继续返回最终字符串或 `null`，但只在每层恰好一个不同文本结果时下钻；相同文本候选合并。
- `decodeManualInput(raw, format)` 保持现有 `{ok, segments}` 返回形状；每个 segment 增加 `format`，自动模式只为不同文本结果提供候选。

- [x] **Step 1: 添加 detector 与歧义测试**

在 selfcheck 增加合成碰撞向量 `3456265A2645`：Base16 与 Base64 均会形成通过手动文本判据且文本不同的候选。断言 `detectBaseCandidates(input, {format: 'auto', allowLossy: false, minDecoded: 1}).length >= 2`，并断言自动 resolver 返回 `null` 而不择一。另断言 `SGVsbG8=` 的 Base64/Base64URL 等价候选被合并且 `resolveText` 返回 `Hello`；含 `-` / `_` 的载荷被标记为 `base64url`。用编码器生成非敏感 Base58 文本，断言检测结果包含 `base58`。

- [x] **Step 2: 运行自检确认 detector 断言失败**

Run: `node scripts/run-selfcheck.cjs`。
Expected: `detectBaseCandidates` 尚不存在导致新增断言失败。

- [x] **Step 3: 实现候选检测与唯一候选策略**

新增 `detectBaseCandidates(input, options)`，其中 `options.format` 缺省为 `'auto'`：清除现有空白后逐个调用 codec；将字节用 `TextDecoder('utf-8', {fatal:true})` 解码；复用 `isPrintable` 与 `minDecoded`。Auto 将解码后文本相同的候选合并，并返回不同文本结果；正文 resolver 只接受一个不同文本结果；多个不同文本结果不修改 DOM。Base64/Base64URL 等价输入优先标记 Base64，除非输入含 URL-safe 专用字符 `-` 或 `_`。显式 `format` 只返回该 codec 的结果。

- [x] **Step 4: 改造自动多轮解析**

`decodeOnce` 作为兼容出口调用 Auto detector，仅在唯一不同文本结果时返回文本；`resolveText` 每轮直接调用 detector 并只在唯一结果时下钻。保持现有 `CFG.maxRounds`、短串停止与 `DEEP_SKIP_RE` 条件。

- [x] **Step 5: 改造手动解码为 Auto/强制格式两种模式**

给 `manualDecode` 与 `decodeManualInput` 增加可选 `format` 参数，默认 `auto`。Auto 为不同文本结果返回候选；强制格式只约束首轮，失败不回退，后续层仍重新自动识别。保留首轮 `allowLossy` 行为和 `lossy` 标签；分段路径以同一首轮格式策略处理每段。

- [x] **Step 6: 验证正文扫描和手动接口**

用合成 Base58 编码文本追加到 mock `.cooked` 节点，调用 `processCooked(node)`，断言出现解码 span；对碰撞向量断言正文仍是原文；手动强制 Base58 断言得到预期文本，手动 Auto 断言候选列表至少两个。Run: `node scripts/run-selfcheck.cjs`。
Expected: 新断言与原有断言全 PASS。

---

### Task 3: 加入面板格式选择与编码器持久化

**Files:**
- Modify: `linuxdo-toolbox.user.js`，`PARAM_DEFS.b64` 约第 294–304 行、`ENC`/`applyB64Params` 约第 583–609 行、`encodeManualInput` 约第 1159–1183 行、面板模式与视图约第 1546–1565、1740–1757 行。
- Test: `scripts/selfcheck.html`，手动面板测试约第 444–493 行。

**Interfaces:**
- 新参数 `encFormat`，合法值为 `base16 | base32 | base58 | base64 | base64url`，默认 `base64`。
- `ENC.format` 保存当前加码格式；`encodeManualInput(raw)` 保持现有返回形状，输出 segment 增加 `format` 标签。
- `MANUAL.decodeFormat` 默认为 `auto`；用户在面板选择具体格式后，传给 `decodeManualInput(raw, format)`。

- [x] **Step 1: 添加面板行为断言**

断言解码方向默认显示 Auto；编码方向默认 Base64；切换 Base16/Base32/Base58/Base64/Base64URL 后，对中文、emoji 与换行均执行编码→同格式解码往返；Base58 前导零向量通过；Base64URL `-_` 与无 `=` 断言保持；多轮格式重复编码并解码正确；输出标签包含实际格式。

- [x] **Step 2: 运行自检确认 UI/编码断言通过**

Run: `node scripts/run-selfcheck.cjs`。
Expected: `node scripts/run-selfcheck.cjs` 输出 `RESULT: PASS`；选择器、五格式往返、参数同步与旧设置迁移断言通过。

- [x] **Step 3: 增加选择器和参数持久化**

在 b64 参数定义加入 `encFormat` select；在手动子面板加入同一格式选择器。解码方向提供 Auto 与具体格式；编码方向提供五种输出格式并禁用 Auto。编码格式选择更新 `ENC.format`，调用现有参数保存/重算路径；`setMode` 依据模式切换有效选项。

- [x] **Step 4: 兼容既有 Base64URL 参数**

若已保存参数没有 `encFormat`，按旧 `encUrlSafe` 还原为 `base64url` 或 `base64`。选 `base64url` 时同步 `encUrlSafe=true`；选 `base64` 时同步为 `false`；其他格式忽略该旧布尔值。选择器回显与参数重置后的默认 Base64 保持一致。

- [x] **Step 5: 让 encoder 按所选 codec 编码每一轮**

`encodeManualInput` 每轮调用 `encodeBaseBytes(ENC.format, utf8Bytes(cur))`；仅 Base64/Base64URL 使用对应 padding/URL-safe 规则；保留已有 round、wrap 与 keepWhitespace 参数。失败时沿用现有错误显示，不清除输入。

- [x] **Step 6: 重跑完整面板自检**

Run: `node scripts/run-selfcheck.cjs`。
Expected: 所有格式的往返、选项同步、格式标签、复制与参数 reset 断言通过，既有功能无回归。

---

### Task 4: 同步 README、版本锚点并完成集成验收

**Files:**
- Modify: `README.md`，功能表与 Base 转换说明约第 12、21–40、87–93 行。
- Modify: `linuxdo-toolbox.user.js`，`@version`、顶部 changelog、面板页脚与调试出口版本。
- Test: `scripts/selfcheck.html`、`scripts/run-selfcheck.cjs`。

- [x] **Step 1: 在 README 描述五种编码与 Auto/强制选择规则**

明确帖子正文自动识别、手动 Auto/手动选格式、歧义不自动替换、多层逐轮识别、Base58Check/Base85 暂不支持；保留现有功能说明。

- [x] **Step 2: 同步版本锚点为 `2.9.0`**

更新 `// @version`、面板页脚 `LINUX DO 工具箱 v...`、`window.__LDB64__.version` 与文件顶部版本记录为 `2.9.0`；四处必须一致。

- [x] **Step 3: 运行 Chromium 全量自检**

Run: `node scripts/run-selfcheck.cjs`（工作目录 `linuxdo-toolbox`）。
Expected: 输出 `RESULT: PASS`，总断言数大于当前 54，且 Base codec、歧义、回归与 UI 全通过。

- [x] **Step 4: 运行语法和差异检查**

Run: `node --check linuxdo-toolbox.user.js`；`node --check scripts/run-selfcheck.cjs`；`git diff --check`。
Expected: 三条命令全部退出码 0。

- [x] **Step 5: 检查版本同步、依赖与样例隐私**

用 `Select-String` 搜索 `@version|ab-name.*v2\.9\.0|version: '2\.9\.0'` 并确认三锚点均为 `2.9.0`；确认 userscript 头和项目变更没有新增第三方依赖；审阅最终 diff，确认未包含示例帖的原始 key-like 字符串。

## Standards Notes

Base16/Base32/Base64 的 padding/alphabet 行为按 RFC 4648 §§3.2、4、6、8；Base58 前导零编码按 Bitcoin Core `src/base58.cpp` 的行为验证。Base58Check 是额外 checksum wrapper，不纳入原始 Base58 codec。

## Completion Gate

- 设计规格 `docs/superpowers/specs/2026-10-15-base-codec-auto-detection-design.md` 的每项验收要求均映射到以上任务。
- 完成前工作区不提交、不推送、不发布；需要发布时另行确认。
- 该计划以 `node scripts/run-selfcheck.cjs`、两条 `node --check` 与 `git diff --check` 全绿为结束条件。
