# LINUX DO 工具箱：内容过滤与快速本地屏蔽验收记录（v2.10.0 → v2.11.0）

日期：2026-10-15。基线：`a1d57732a57926fec9a844fb914f4530871e6d91`（v2.9.0）；v2.10.1 起点 `5c226c24db8237bd65e2d1b3a5c1168d22543d80`。

**发布（v2.10.1）**：commit `aa9e7485734d951677b2d2bfb7ce3bfdc56c5ede` 推送 GitHub main；GreasyFork 596713 版本历史含 v2.10.1；本地 / GitHub raw / GF CDN 三份源码同为 **272518 bytes**，SHA-256 `FE6682BFB0B0C547F9AB5B55D879DAEB000636F28446479710D2D343D449822D`。附加说明与更新日志均为 Markdown，页面内 SHA-256 与本地文件一致（10211 B / `3190DC49016E5AA04DFBF4F229A16A14FA53DC87CE49BB99D3D4BF09BB9DDB49`、690 B / `D87D25BE285DF3FAF727B77B96052EAB69215E66A4BD9EC0904831E68F11C558`）。

**真机验证的工具侧限制（如实记录）**：bsk 在自己控制的标签页里注入全视口覆盖层 `BROWSER-SKILL-OVERLAY`（`pointer-events:auto`，用 `!important` 强制；页面侧 inline `!important` 与 `remove()` 都让不开），它同时挡住站点自己的按钮 —— 所以受控标签里页面内坐标命中测试恒为覆盖层，拿不到有效读数。改用 bsk 自己的真实鼠标点击：在开关**轨道**中心放一枚 `pointer-events:none` 的探针，让点击穿透到下面的 checkbox，再用 `Storage.prototype.setItem` 钩子捕获真实写回并立即还原原值（避免刷新后残留）。

| 真实页面证据（linux.do 已登录，临时载入候选版） | 结果 |
|---|---|
| 8 枚开关全部非零尺寸、轨道 `pointer-events:none`、行壳为 `LABEL` | true |
| bsk 真实鼠标点击 (961,179) —— 「内容过滤」开关**轨道**像素 | `ldkit.flags.v1` 被真实改写为 `contentFilter:true`（其余六个键不变），模块实际开启 |
| bsk 真实鼠标点击 (961,508) —— 「只看此人」开关**轨道**像素 | 同样真实改写为 `onlyUser:true`，随后页面按既有逻辑刷新 |
| 点击后的设置还原 | storage 与测试前逐字节相同（七项原值），临时配置键已清除 |
| 新看板在真机 | 3 个分区 / 1 张卡片 / 可折叠 JSON / 模块自注入样式；编辑器字段齐、条件卡片无内联样式；面板保存规则 → 命中 1 项并显示原因、占位可见 → 展开 → 关闭恢复，全部 true |

## v2.10.1：开关点击 + 看板重做

用户报告两件事：面板里各项功能的开关点不动；「内容过滤」子看板像老式论坛表单。

**根因（开关）**：`.sw input` 与 `.sw i` 都是 `position:absolute; inset:0`，两者都没有 `z-index`，而 `<i>` 在 DOM 里靠后、按绘制顺序压在透明 checkbox 之上——点击全被那枚可见轨道吃掉，事件永远到不了 checkbox。这是面板既有缺陷，不是 v2.10.0 引入的。

**修法**：`.sw i` 加 `pointer-events:none` 把命中权让回 checkbox，整枚开关从 `<span>` 换成 `<label>` 兜底，`.sw` 补 `display:block`。

**根因（看板）**：`ContentFilter.mount()` 的 `innerHTML` 全是裸 `label` / `details` / `textarea` 与无样式按钮，没复用面板既有的 `.svc-sec` / `.pad` / `.mini` / `.go` / `.ta` / `.sw` 与设计变量。

**修法**：规则行改成卡片（启停开关 + 名称 + 对象胶囊 + 编辑 / 删除）；条件编辑器改成卡片式字段行并去掉内联 `style.cssText`；JSON 区改成带 `<summary>` 的可折叠卡片；状态行区分正常 / 错误两色。`CF_CSS` 由模块自己在挂载时注入 shadow root，模块仍然自包含。

**新增离线断言（7 条）**：开关轨道位置 `elementFromPoint` 命中的是 checkbox 本身；轨道 `pointer-events:none`；一次点击即切换并写回 `ldkit.flags.v1`；再点一次还原；面板复用既有设计语言；条件行无内联样式且为卡片式；取消编辑收起编辑器。

## 状态

实现、离线检查与发布全部完成。真实页面发现的虚拟滚动兼容问题已修复并复测。发布产物三方指纹一致。

| 项 | 值 |
|---|---|
| commit | `00dca03a3de6c2cdfb7cf4ab1bbd2068b6d041c7`（GitHub main，`a1d5773..00dca03` 快进推送） |
| 版本 | v2.10.0（脚本头、面板页脚、调试出口三处一致） |
| 本地 / GitHub raw / GreasyFork CDN | 265802 bytes，SHA-256 `1E0DE9AEE5C281792F1D4E9057DDA951A00C5B0547B784E3085973F9B53398EE`（三方相同） |
| GreasyFork 596713 | 版本历史出现 v2.10.0；提交后落在脚本页、无错误区内容 |
| 附加说明 / 更新日志 | 页面内 SHA-256 分别 `EE5824C57C0635A47693DA7AB131354769F0DAE83A728CE3229339F08AA1ED2B`(9596 B) 与 `97641AF50CA410EF72D9C059B09B5DAFA7E60C02653B8EEBD3DD505E9AAD41C6`(1308 B)，与本地文件一致；均为 Markdown，公开类型、非成人内容 |

## 一次独立 review 与主代理核验

使用 `custom/deepseek-v4.1-flash` 只读审阅实际变更，无递归委派。主代理核对源码与探针，并对具体缺陷修复、复测。

| 项目 | 处理与证据 |
|---|---|
| A 同路由 metadata 失败或中断后不再获取 | 修复：关闭清理 in-flight 状态，失败冷却 3 秒、每路由最多两次尝试；重开可重新获取。专项 `METADATA 关闭中断后重开同路由重取` 通过。 |
| B 空字符串命中通配正则 | 修复：空／纯空白字段不匹配。新增空标题、空白正文反例通过。 |
| C 超 20000 字符字段跳过 | 保留既定资源契约，不改成截断命中；20001 是识别溢出的哨兵长度。新增超长正文不匹配断言通过，文档明确限制。 |
| D target 原型链成员 | 修复：使用 own-property 检查，业务错误提示清晰，旧有效配置不变。 |
| E Worker 失败恢复整页可见且缓存失败快照 | 保留 fail-open 契约：不让超时／异常导致不可恢复隐藏；规则或内容变化后重试。灾难正则终止与 Worker 创建失败测试通过。 |
| F 快照深拷贝成本 | 普通正文直接取 textContent，仅含 Base 解码标记时克隆以还原原始载荷；相同快照缓存匹配结果，不反复启动 Worker。未声称完成大规模性能基准。 |
| G 跨页总开关与面板不一致 | 修复：storage 变化同步状态灯与 checkbox，新增断言通过。 |
| H body 重建后 observer 失效 | 修复：观察 documentElement，避免绑定旧 body。 |

主代理另修复：编辑器从 regex 切换非 regex 自动清 flags；选择标签／类别默认精确匹配；帖子数据库 ID 不再从 `post_N` 楼层号推导；DOM 标签优先于旧 JSON 标签。

## 真机发现与修复

在真实登录态 Linux.do 页面临时加载候选源码，关闭其余七模块，使用现有话题／帖子 ID 创建仅本地测试规则。未操作账号忽略／静音，未发送测试回应、举报或帖子，未操作挑战控件。此项是浏览器真机测试，不是离线 fixture；也不等于已在脚本管理器安装新版。

首次帖子测试发现：隐藏整个 `.topic-post` 会触发 Discourse 虚拟滚动卸载／复用节点，匹配和占位计数正确也不能证明正文持续隐藏。修复为保留帖子外壳，在壳内放占位，仅隐藏原子内容；使用独立 data 属性，不依赖宿主可重写的 class。测试改为按数据库 ID 重新定位节点，检查实际 computed style，而非保留旧节点引用。另加入占位被宿主删除后的自修复回归。

| 实际页面 | 观察结果 |
|---|---|
| Linux.do 列表（已登录） | 30 条记录；面板新增并保存规则，命中 1 项、原因正确、原节点保留，展开／重新折叠／关闭恢复均通过。 |
| Linux.do 话题（已登录） | 最终复测：帖子 ID、作者 ID、楼层可取得；等待 3 秒后正文隐藏=true、帖子外壳可见=true、占位可见=true；展开、关闭恢复均 true。直接话题折叠、展开、恢复均 true。 |
| qingju.me 列表（已登录） | 30 条记录；面板保存、命中、原因、保留原节点、展开／重新折叠／关闭恢复均通过。 |
| idcflare.com 列表（匿名） | 30 条记录；同上全部通过。没有宣称此站已登录。 |

不公开真实正文、用户名、测试话题 ID、私人规则或浏览器截图。

## 可复验的离线检查

- `node scripts/run-selfcheck.cjs`：**200/200 PASS**（原 103 项 + 内容过滤专项；v2.10.0 时为 193 项）。
- `git diff a1d5773 -- scripts/selfcheck.html`：空，原 103 项测试文件未修改。
- `node scripts/build-content-filter.cjs --check`：独立模块与嵌入发布稿 exact match。
- `node --check linuxdo-toolbox.user.js`、`scripts/content-filter.js`、`scripts/build-content-filter.cjs`、`scripts/run-selfcheck.cjs`：通过。
- 两个自检 HTML 的全部非空内联 script 使用 `vm.Script` 解析：通过。
- 精确暂存九个任务文件后 `git diff --cached --check`：通过。原 main 工作区未跟踪文件保留。
- 候选 userscript：265802 bytes，SHA-256 `1E0DE9AEE5C281792F1D4E9057DDA951A00C5B0547B784E3085973F9B53398EE`。这是本地候选指纹，不是三方发布证明。
- 水贴正反例、结构／首帖保护、对象／字段、AND/OR、精确／关键词／正则／标签／类别、缺失／空白、非法保存／导入、动态节点／内容／路由、刷新持久化、可视增删启停、正则 flags、Worker 限额／超时／创建失败、恢复和占位自修复均包含专项断言。

## 收尾阻塞

初始配置备份放在任务标签 sessionStorage；长任务超过浏览器会话生命周期后，旧 Agent 标签被关闭，备份不再可取。此备份方式不足，后续真机验收必须在改配置前将**仅本任务配置键**另存本地受限 scratch，并明确恢复校验，不能只依赖标签生命周期。

## 配置还原

- **Linux.do**：从仍打开的旧版（v2.9.0）工具箱内存读取原七项开关并写回，写后相等核验通过；原值 `{b64:false, mdCopy:true, linkUnlock:false, autoReact:false, readBoost:false, cfShield:false, onlyUser:false}`。
- **qingju.me / idcflare.com**：原值不可考——备份曾放在任务标签 sessionStorage，标签随会话关闭后丢失；青橘原标签无可用基线，随后借用请求被用户拒绝，未重试或绕过。两站已把开关还原为**脚本默认值**（`b64/mdCopy/linkUnlock/autoReact/readBoost/cfShield/onlyUser` 全开、`contentFilter` 关），并删除本次临时过滤规则键。这是默认值，**不宣称等于你的原设置**；若你在这两站手动关过某项，需重新关一次。
- **教训**：真机验收改配置前，必须把仅本任务的配置键另存到本地受限 scratch，并做写后相等核验，不能只依赖标签生命周期内的 sessionStorage。
- 原借入标签已归还，会话已停止；临时 daemon 使用受支持 stop 关闭，临时计划任务删除。最终 `Win32_Process` 核验 bsk 进程数为 0。

## AC1–AC10

| AC | 状态 | 证据／边界 |
|---|---|---|
| 1 | met | `docs/content-filter.md` 的基线位置、两个参考版本／许可证和采用／不采用说明。独立实现，未复制参考代码。 |
| 2 | met | 一个内容过滤入口、默认关闭、原七开关保留专项通过。 |
| 3 | met | 门槛且预设命中，首帖／未知楼层／结构保护；显式规则独立。 |
| 4 | met | 对象字段、数据库 ID、作者来源与所属话题条件测试和文档。 |
| 5 | met | 规则校验、AND/OR、缺失／空白不匹配、lastIndex、资源限额与超时测试。 |
| 6 | met | 可视规则操作、导入失败保持配置、刷新持久化、占位与关闭恢复测试及真机证据。 |
| 7 | met | 动态／SPA／节点复用专项，三站实际可取得字段；保留帖子壳兼容虚拟滚动；隐藏项扫描显式跳过；原 103 项回归保留。 |
| 8 | met | 一次指定模型 review、主代理修复与 193 项复测、语法／构建一致性检查、真实登录态交互；暂存差异检查结果见最终交付。v2.10.1 复测扩到 200 项，本表未变。 |
| 9 | met | commit `00dca03a3de6c2cdfb7cf4ab1bbd2068b6d041c7` 已推送 GitHub main；GreasyFork 596713 版本历史出现 v2.10.0；本地 / GitHub raw / GF CDN 三方同为 265802 bytes / `1E0DE9AE…`。 |
| 10 | met | 汇总见本文；会话归还、进程 0、临时任务删除、临时规则清除。配置还原的披露见「配置还原」一节：Linux.do 精确恢复原值，另两站为脚本默认值（原值不可考，如实标注）。 |

## v2.11.0：头像下快速本地屏蔽

日期：2026-10-16。版本从 v2.10.1 升至 v2.11.0，新增话题帖子、用户资料和用户卡片头像下的本地用户规则快捷入口；数字用户 ID 优先、无 ID 回退用户名；可撤销，不调用站点忽略/静音设置。

**离线验证**：`node scripts/build-content-filter.cjs --check` exact match；`node --check scripts/content-filter.js`、`node --check linuxdo-toolbox.user.js` 与 `node --check scripts/run-selfcheck.cjs` 通过；`node scripts/run-selfcheck.cjs` **219/219 PASS**；`git diff --check` 通过。

**GreasyFork 596713 发布**：已更新既有条目，版本历史匿名回抓 HTTP 200 并出现 `v2.11.0` 与对应 changelog；本地脚本与 GF CDN 回抓均为 **284651 bytes**，SHA-256 `C8DF0FF4BE30729FF02F3B0731480F2F5BBE5DAD3958AABFCCF9076CC2FB4D38`，版本、快速按钮标记和三处版本标记一致。提交前 GF 表单内代码 hash 与本地相同；附加说明 10465 bytes / `E849CD680E14135F43CA495D5469A2E18612B39E14169FE083170F41D2887AB7`，changelog 437 bytes / `22F20CBF78BCCBB90E099ED570795B7C770171A0ED8B1D22699E132F0113C74A`；`@description` 215 字符、公开类型、非成人内容。

**Linux.do 真机边界**：bsk 登录态页面核对了三个实际头像 DOM，并用临时探针通过内容过滤 API 做 add/undo；探针捕获的配置、开关与覆盖层样式均回滚。bsk 物理 selector 点击被全视口覆盖层超时，改用 bsk evaluate 的 DOM click；线上实际帖子视觉折叠未确认，相关精确命中/折叠/撤销由离线 DOM/Worker 自检覆盖。只测试 Linux.do，未操作其他 Discourse 论坛。

**GitHub 范围**：本次授权仅为 GreasyFork 发布，未推送 GitHub。`origin/main` 仍为 v2.10.1（`4cb42e6873d65126365936a9f2033353ac20aa8e`）；本地 `feature/content-filter` 保存 v2.11.0 候选。
