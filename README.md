# LINUX DO 工具箱

一个给 [linux.do](https://linux.do/) / qingju.me / idcflare.com 的油猴脚本：**八个功能挤在右下角一枚悬浮球里，各自独立开关。**
功能名一律四个汉字，面板是两级导航（主看板一行一个功能 → 点进去是它自己的子看板）。

> 装好就在右下角；鼠标悬停展开，按住可拖动位置，位置会记住。

## 八个功能

| # | 功能 | 干什么 |
|---|------|--------|
| ① | **密文自解** | 帖子正文自动识别 Base16、RFC 4648 Base32、原始 Base58、Base64 与 Base64URL；唯一可读结果才就地解码。手动面板可 Auto/指定格式解码，并按五种格式双向互转。 |
| ② | **原生复制** | 每层楼操作栏多一个按钮，一键取 `/raw/` 原文的**原生 Markdown**，并附上标题、楼层与转载来源。 |
| ③ | **外链解锁** | 破解 External Link Shield：外链免登录可见，点击强制新标签页打开，也不弹站点提示。 |
| ④ | **随读回应** | 跟随阅读，只对「当前可见且未回应」的楼层随机回一个反应（跳过爱心与 +1）；带服务端冷却识别、每日兜底上限、跨标签页计数。 |
| ⑤ | **已读提速** | 向 `/topics/timings` 批量同步已读帖数与阅读时长，快速刷已读；带本地进度记忆、可清空重刷。 |
| ⑥ | **过盾重试** | 识别 Cloudflare 挑战页（含 `/new`、`/latest`、`/t/...` 等原 URL 内嵌的 Turnstile interstitial）；挑战由页面正常完成后自动恢复并确认完整同源原地址。带 5 秒冷却、最多 2 次自动重试；不操作验证控件。 |
| ⑦ | **只看此人** | 每层楼用户名右侧长出一个按钮，**一点即只列该用户的帖子**，跳过官方那两步（点头像 → 点「话题中的 N 个帖子」）。 |
| ⑧ | **内容过滤** | 默认关闭；水贴预设与话题／帖子／用户规则统一管理；三个头像入口可快速添加/撤销本地屏蔽（ID 优先、用户名回退），不改站点忽略/静音设置。 |

### 关于 ⑧「内容过滤」

规则编辑、对象字段、完整 JSON 示例、参考源码和资源限额见 [内容过滤说明](docs/content-filter.md)。头像下可快速添加/撤销作者或话题发起者的用户规则，优先按 ID 精确匹配，无 ID 时回退用户名；仅本地折叠，不改站点忽略/静音。首帖和带代码／引用／链接／图片／附件的回复受水贴保护；关闭、停用或删除规则即恢复原节点。折叠隐藏项不触发随读回应。


### 关于 ①「密文自解」的 Base 编码

子看板顶部有方向开关和「Base 格式」选择器，两种方向共用一个输入框：

- **密文 → 明文**：支持 Base16（Hex）、RFC 4648 Base32、Bitcoin 字母表原始 Base58、标准 Base64、Base64URL。Auto 模式尝试所有格式；也可指定单一格式。整串优先，失败后再分段尝试。
- **帖子正文自动解码**：候选必须通过格式校验、严格 UTF-8、最小长度与可打印性判据。若多个格式得到相同文本，合并为一个结果；若得到不同文本，正文保持原样，不猜测。Base64/Base64URL 共享字母表且结果相同时按 Base64 处理，出现 `-` 或 `_` 时识别为 Base64URL。
- **多层解码**：每一层重新识别格式，可解析混合格式嵌套；遇到失败或歧义时停在最后一个已确认的文本结果。手动指定格式只约束首轮，后续层重新自动识别。
- **明文 → 编码（主动加码）**：可选 Base16、Base32、Base58、Base64、Base64URL；所选格式应用于每一层。中文 / emoji / 换行均按 UTF-8 字节编码。

Base 是可逆表示，不提供加密或保密性。首版不支持 Base58Check、Ascii85/Z85、basE91。

加码侧参数（改动即时生效）：

| 参数 | 说明 |
|---|---|
| 加码层数 | 1~4 层。多轮 = 把上一轮结果再按所选格式编码。 |
| 加码格式 | Base16 / Base32 / Base58 / Base64 / Base64URL；默认 Base64。旧版 Base64URL 设置会自动迁移。 |
| 每行字符数 | 0 = 不折行；填 76 / 64 之类就按行折。 |
| 保留换行与空格 | 勾上按原样编码；取消则编码前先移除所有空白。 |

编码器先将文本转为 UTF-8 字节，再调用对应 codec；复制按钮仍复制最终显示文本。
### 关于 ⑦「只看此人」

官方那个入口藏在用户卡片里，而且**只在 `topicPostCount >= 2` 时才出现**（源码里 `enoughPostsForFiltering` 写死的）——
也就是说，**在本话题里只发过一条帖子的用户，官方根本点不出筛选**。

本功能**直接调官方那条动作**：从 `container` 取 `controller:topic` 的 `model.postStream`，
执行 `postStream.filterParticipant(username)` —— 这正是「点用户卡片 → 点话题中的 N 个帖子」
在调的同一个函数（`models/post-stream.js`），所以：

- 结果与官方入口**完全一致** —— 只列该用户的帖子、**楼主帖恒定保留在首位**，还带原生的「显示全部」提示条；
- **不受「≥ 2 帖」限制** —— 单帖用户照样给按钮、照样能筛；
- 与官方**同一个动作**：SPA 内即时生效（不整页刷新），点「显示全部」走官方 `cancelFilter` 还原；
- 万一拿不到容器 / 模型（别的 Discourse 版本），退化成整页跳 `/t/<slug>/<id>?username_filters=<用户名>` ——
  这条 query 同样是官方的服务端筛选参数（`routes/topic.js` 的 `queryParams`），结果等价；

三个参数可调：按钮位置（用户名右侧 / 头像下方）、是否显示「只看TA」字样、是否悬停才显示。改动即时生效，不用刷新。

## 安装

1. 装一个用户脚本管理器：[Tampermonkey](https://www.tampermonkey.net/) / [Violentmonkey](https://violentmonkey.github.io/)。**iOS** 上可用 [Userscripts](https://apps.apple.com/app/userscripts/id1463298887)（Safari）或 Stay（见 wiki）。
2. 打开 Greasyfork 脚本页 → 点「安装此脚本」：
   **https://greasyfork.org/zh-CN/scripts/596713**
3. 或者：把本仓库的 `linuxdo-toolbox.user.js` 拖进浏览器的管理面板，手动新建脚本后粘贴整份代码。
4. 打开 linux.do 任意页面，右下角出现悬浮球即成功。

## 使用与更新

- 面板底部有「一键全默认」，恢复原七项参数；私人内容过滤规则保持不变。
- 更新走脚本头里的 `@updateURL`（Greasyfork 自动同步）；本仓库同步留档一份 **逐字节相同** 的源码。
- 反馈 / 提问：来 **青橘 [qingju.me](https://qingju.me/)** 的同好圈，或在本仓库 [Issues](https://github.com/hawchou1995/linuxdo-toolbox/issues) 里提。

## 源码结构

```
linuxdo-toolbox.user.js      # 单文件用户脚本（就是它本体，直接可装）
scripts/selfcheck.html       # 离线自检页：mock 话题 DOM、Discourse 容器、面板 shadow DOM、独立盾页与 /new、/latest、/t/... 原 URL 内嵌挑战
scripts/run-selfcheck.cjs    # 自检执行器：起本地静态服务 + 真实 Chromium 跑原功能与过盾场景
scripts/content-filter.js    # 内容过滤源模块，构建后内嵌发布单文件
scripts/build-content-filter.cjs # 构建；--check 核对内嵌一致
scripts/content-filter-selfcheck.html # 过滤专项与刷新持久化
```

跑一遍自检（需要本机有 Playwright 的 Chromium；`PLAYWRIGHT_CORE` / `CHROME_PATH` 可指定路径）：

```bash
node scripts/run-selfcheck.cjs
# → 合计 219 项通过（原 103 项回归 + 内容过滤专项）；RESULT: PASS
```
v2.11.0 新增头像下「本地屏蔽」入口（帖子、资料、用户卡片），复用内容过滤规则并可撤销；v2.10.1 修开关点击与重做内容过滤看板，v2.10.0 新增统一内容过滤。验收记录见 [内容过滤验收记录](docs/content-filter-verification.md)。

自检覆盖原功能与新增过滤；原 103 项断言保持不变。
**①「密文自解」**：Base16/Base32/Base58/Base64/Base64URL 字节向量、前导零、非法载荷、同结果合并与不同结果歧义；
帖子唯一 Base58 解码和碰撞原文保留、混合格式多层解码、手动 Auto 候选、五种格式的中文 / emoji / 换行往返、格式标签与旧 Base64URL 参数迁移。
**⑦「只看此人」**：按钮位置、**点击调官方 `postStream.filterParticipant`（不整页跳）**、拿不到容器时退化为 `?username_filters=` 整页跳、
**单帖用户也有按钮**、重复扫描去重、已筛选态变「显示全部」并调官方 `cancelFilter`、面板出口、离开话题页清除、三个参数生效、开关关闭时不插。
**⑥「过盾重试」**：独立挑战页与 `/new`、`/latest`、`/t/...` 原 URL 内嵌 Cloudflare challenge 识别、等待提示、完整同源地址自动恢复确认、冷却、redirect 校验与重试上限；断言验证控件零交互。
**⑧「内容过滤」**：水贴正反例与结构保护、对象字段、关键词／正则／标签／类别、AND/OR、缺失与空字段、非法配置、Worker 超时／创建失败、动态内容与路由、持久化、可视编辑与折叠恢复。

## 开源与社区

- **GitHub 仓库**：<https://github.com/hawchou1995/linuxdo-toolbox> —— 源码、问题反馈、Star 都在这儿。
- **社区论坛**：**青橘 · [qingju.me](https://qingju.me/)** —— LINUX DO 同好聚集地，欢迎来一起折腾。

## 致谢

本脚本由多位作者的模块合并而成，原作者（按脚本头署名）：
**牛来 · XAUTHUB · HawChow · Sunwuyuan · adodo · Pipecraft**。

## 许可

[MIT](LICENSE)
