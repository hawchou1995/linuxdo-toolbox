# LINUX DO 工具箱

一个给 [linux.do](https://linux.do/) / qingju.me / idcflare.com 的油猴脚本：**七个功能挤在右下角一枚悬浮球里，各自独立开关。**
功能名一律四个汉字，面板是两级导航（主看板一行一个功能 → 点进去是它自己的子看板）。

> 装好就在右下角；鼠标悬停展开，按住可拖动位置，位置会记住。

## 七个功能

| # | 功能 | 干什么 |
|---|------|--------|
| ① | **密文自解** | 自动识别帖子正文里的 Base64 并**就地解码**显示；手动面板是**双向互转**的 —— 密文 → 明文（自解），或**明文 → 密文（主动加码）**。 |
| ② | **原生复制** | 每层楼操作栏多一个按钮，一键取 `/raw/` 原文的**原生 Markdown**，并附上标题、楼层与转载来源。 |
| ③ | **外链解锁** | 破解 External Link Shield：外链免登录可见，点击强制新标签页打开，也不弹站点提示。 |
| ④ | **随读回应** | 跟随阅读，只对「当前可见且未回应」的楼层随机回一个反应（跳过爱心与 +1）；带服务端冷却识别、每日兜底上限、跨标签页计数。 |
| ⑤ | **已读提速** | 向 `/topics/timings` 批量同步已读帖数与阅读时长，快速刷已读；带本地进度记忆、可清空重刷。 |
| ⑥ | **过盾重试** | 识别 Cloudflare 挑战页（含 `/new`、`/latest`、`/t/...` 等原 URL 内嵌的 Turnstile interstitial）；挑战由页面正常完成后自动恢复并确认完整同源原地址。带 5 秒冷却、最多 2 次自动重试；不操作验证控件。 |
| ⑦ | **只看此人** | 每层楼用户名右侧长出一个按钮，**一点即只列该用户的帖子**，跳过官方那两步（点头像 → 点「话题中的 N 个帖子」）。 |


### 关于 ①「密文自解」的双向互转（含「主动加码」）

子看板顶部有个方向开关，两种方向共用同一个输入框：

- **密文 → 明文**：粘贴 Base64（可被空格换行拆散、夹带说明文字、带引号或代码围栏），就地解出来，多层自动连续解。
- **明文 → 密文（主动加码）**：把输入当明文，产出 Base64 密文；**中文 / emoji / 换行都不丢**。

加码侧有四个参数（改动即时生效）：

| 参数 | 说明 |
|---|---|
| 加码层数 | 1~4 层。多轮 = 把上一轮的结果再编一次，跟解码侧的多层连续解正好互为逆运算。 |
| URL 安全字符 | 用 `-_` 替代 `+/` 且不带 `=`（Base64URL），适合塞进 URL / 文件名。 |
| 每行字符数 | 0 = 不折行；填 76 / 64 之类就按行折，方便直接贴进帖子。 |
| 保留换行与空格 | 勾上按原样编码；取消则编码前先把所有空白合并掉。 |

编码器**自己查表，不用 `btoa`** —— `btoa` 只吃 Latin-1，中文 / emoji 会直接抛 `InvalidCharacterError`。
这里先做 UTF-8 编码再查表，输出走解码侧同一套渲染（右上角一键「复制」）。

两个方向互为逆运算：自检里有一条专门的往返断言（原文 → 加码 → 自解 === 原文，含中文 / emoji / 换行）。
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

- 面板底部有「一键全默认」，一次把七个功能的参数恢复出厂值。
- 更新走脚本头里的 `@updateURL`（Greasyfork 自动同步）；本仓库同步留档一份 **逐字节相同** 的源码。
- 反馈 / 提问：来 **青橘 [qingju.me](https://qingju.me/)** 的同好圈，或在本仓库 [Issues](https://github.com/hawchou1995/linuxdo-toolbox/issues) 里提。

## 源码结构

```
linuxdo-toolbox.user.js      # 单文件用户脚本（就是它本体，直接可装）
scripts/selfcheck.html       # 离线自检页：mock 话题 DOM、Discourse 容器、面板 shadow DOM、独立盾页与 /new、/latest、/t/... 原 URL 内嵌挑战
scripts/run-selfcheck.cjs    # 自检执行器：起本地静态服务 + 真实 Chromium 跑原功能与过盾场景
```

跑一遍自检（需要本机有 Playwright 的 Chromium；`PLAYWRIGHT_CORE` / `CHROME_PATH` 可指定路径）：

```bash
node scripts/run-selfcheck.cjs
# → 合计：全部断言通过 ；RESULT: PASS
```

自检覆盖三块。**⑦「只看此人」**：按钮位置、**点击调官方 `postStream.filterParticipant`（不整页跳）**、
拿不到容器时退化为 `?username_filters=` 整页跳、**单帖用户也有按钮**、重复扫描去重、已筛选态变
「显示全部」并调官方 `cancelFilter`、面板「显示全部」出口、离开话题页清除、三个参数生效、开关关闭时不插。
**①「密文自解」双向互转**（驱动真面板的 shadow DOM）：方向切换、明文 → 密文、复制、中文 / emoji / 换行往返、
URL 安全字母表、折行和多层组合往返。**⑥「过盾重试」**：独立挑战页与 `/new`、`/latest`、`/t/...` 原 URL 内嵌 Cloudflare challenge 识别、等待提示、
完整同源地址（含查询参数）自动恢复确认、挑战失效冷却、同源 redirect 接受 / 跨源拒绝、重试次数封顶；断言验证控件零交互。

## 开源与社区

- **GitHub 仓库**：<https://github.com/hawchou1995/linuxdo-toolbox> —— 源码、问题反馈、Star 都在这儿。
- **社区论坛**：**青橘 · [qingju.me](https://qingju.me/)** —— LINUX DO 同好聚集地，欢迎来一起折腾。

## 致谢

本脚本由多位作者的模块合并而成，原作者（按脚本头署名）：
**牛来 · XAUTHUB · HawChow · Sunwuyuan · adodo · Pipecraft**。

## 许可

[MIT](LICENSE)
