// ==UserScript==
// @name         LINUX DO 工具箱
// @namespace    https://linux.do/
// @version      2.7.0
// @description  LINUX DO 工具箱：七个功能在右下角面板各自独立开关，名字一律四个汉字 —— ① 密文自解（正文 Base64 就地解码，含手动解码面板）② 原生复制（取 /raw/ 原生 Markdown 并附转载来源）③ 外链解锁（外链免登录可见，强制新标签页）④ 随读回应（跟随阅读随机回应，跳过爱心与 +1）⑤ 已读提速（批量同步已读帖数与阅读时长）⑥ 过盾重试（盾验证失败时自动跳回盾页重试）⑦ 只看此人（每层楼用户名旁一键只看该用户的帖子，跳过点头像两步，只发过 1 帖的用户也能筛）。面板两级导航：主看板一行一个功能，点进去是它自己的子看板；所有看板宽高统一，切换不跳动；底部另有「一键全默认」。仓库 github.com/hawchou1995/linuxdo-toolbox · 论坛 qingju.me
// @author       牛来 · XAUTHUB · HawChow · Sunwuyuan · adodo · Pipecraft
// @match        https://linux.do/*
// @match        https://qingju.me/*
// @match        https://idcflare.com/*
// @grant        none
// @run-at       document-start
// @noframes
// @license      MIT
// @homepageURL  https://github.com/hawchou1995/linuxdo-toolbox
// @supportURL   https://qingju.me/
// @downloadURL https://update.greasyfork.org/scripts/596713/LINUX%20DO%20%E5%B7%A5%E5%85%B7%E7%AE%B1.user.js
// @updateURL https://update.greasyfork.org/scripts/596713/LINUX%20DO%20%E5%B7%A5%E5%85%B7%E7%AE%B1.meta.js
// ==/UserScript==

/*
 * v2.7.0 —— 新增第七个功能「只看此人」+ 项目落 GitHub：
 *          ① 「只看此人」：每层楼的用户名右侧长出一个「只看此人」按钮，点一下直接套用 Discourse 原生的
 *             「话题中的 N 个帖子」筛选 —— 跳过「点头像 → 点话题中的帖子」两步。
 *             实现走站内路由跳 /t/<slug>/<id>?username_filters=<用户名>，与官方是同一个服务端筛选：
 *             结果只列该用户的帖子、楼主帖恒定保留在首位，并带着原生的「显示全部」提示条（点它即取消）。
 *          ② 官方那个入口藏在用户卡片里，且只在 topicPostCount >= 2 时才出现 —— 只发过一条帖子的用户
 *             根本点不出筛选。本功能不受这个限制：单帖用户照样给按钮、照样能筛。
 *          ③ 参数三项：按钮位置（用户名右侧 / 头像下方）、是否显示「只看TA」字样、是否悬停才显示。
 *             改动即时生效，不用刷新。
 * 项目与社区：
 *          · GitHub 仓库：https://github.com/hawchou1995/linuxdo-toolbox （源码 / 问题反馈 / Star）
 *          · 社区论坛：https://qingju.me/ （青橘 —— LINUX DO 同好聚集地）
 *          · 本脚本由多位作者的模块合并而成，原作者：牛来 · XAUTHUB · HawChow · Sunwuyuan · adodo · Pipecraft
 * v2.6.4 —— 所有看板统一尺寸（修「切换看板时面板被误折叠」）：
 *          ① 现象：面板贴在右下角，顶边随内容高度上下移动。2.6.3 让子看板按内容自适应高度（实测 251~430px 不等），
 *             于是「点最上面那行切到矮的子看板」＝面板变矮、顶边下移，指针落到面板外，
 *             浏览器随即给面板一个 mouseleave → 悬浮逻辑判定「指针离开」→ 面板自动折叠。
 *          ② 改法：所有看板（主看板 + 六个子看板）用同一个固定高度 —— 挂载后先把六个子看板各自量一次
 *             （同步块内、visibility:hidden 量，量完立刻还原，不会闪一下），取最高那块写进 --panel-h；
 *             面板宽度本来就固定（--panel-w）。此后切换任何一级、任何功能，面板宽高都完全不变。
 *          ③ 兜底：窗口极矮时高度仍取 min(--panel-h, 100vh - 72px)，放不下的部分由看板自己滚（降级路径）；
 *             常规窗口下高度按实测最大值取，六个子看板都装得下，不会出现内部滚动。
 * v2.6.3 —— 面板改成两级导航（主看板 ⇄ 子看板）+ 修好悬浮开合：
 *          ① 主看板：六个功能一行一个（图标 + 四字功能名 + 状态点 + 开关 + 行尾 ›）；点一行 → 整块面板
 *             换成「子看板」——顶部标题条（‹ 返回 + 功能名 + 该功能的开关），下面全是这个功能自己的东西；
 *             子看板里看不到其他功能（行清单整块收起）。点标题条 / ‹ 返回 / Esc → 回主看板；
 *             标题条上点开关不会误触发返回。
 *          ② 子看板不再有内部滚动：高度 = 内容实际高度（推翻 2.6.2 的「六个子面板同高 244px + 内部滚动」）；
 *             只留 max-height: calc(100vh - 72px) 兜极矮窗口。例外：密文自解的解码结果区自己滚（内容天然无限长）。
 *          ③ 悬浮开合修好（两个根因）：
 *             a) drag 卡死：原来只有图标自己的 pointerup/pointercancel 会清 drag，而 setPointerCapture
 *                包在 try/catch 里，它一失败「在别处松开鼠标」就再没人清 drag，hoverEnterFab /
 *                hoverLeaveFab 开头即 return —— 悬浮开合失效到刷新页面为止。现在 document 级
 *                pointerup / pointercancel（捕获阶段）+ window blur 都会清，鼠标移入图标时还会自愈。
 *             b) 面板展开动画：2.6.2 补回 prefers-reduced-motion 之后，kit-in 的缩放动画第一次真正生效，
 *                动画那 0.2s 面板矩形比最终小约 3px，指针贴边挪进去可能「没落在面板上」而被收起；
 *                现在 kit-in 只淡入（不动 transform），面板矩形从第一帧就是最终大小。
 *          ④ 面板记住上次停在哪一级、哪个功能；主看板那一行带状态色记号。
 * v2.6.2 —— 面板改成竖排清单（todolist 手感）：
 *          ① 六个功能纵向排成一行一行，不再是横排标签：行头是「图标 + 四字功能名 + 状态点 + 折叠箭头」，
 *             右侧仍是这个功能的开关；点一行展开这一行，同一行再点一次折叠，一次只开一行。
 *          ② 每个功能配一枚内联 SVG 图标（描边、随主题色与状态色变化；不引图标字体或任何外部资源）：
 *             开着的锁 = 密文自解、两张纸 = 原生复制、出框箭头 = 外链解锁、心 = 随读回应、
 *             闪电 = 已读提速、盾 = 过盾重试。
 *          ③ 参数设置与进度同框：每个功能的「参数」和「进度 / 状态 + 动作按钮」合并进同一个子面板
 *             （面板内用「参数」「进度」两段分隔标题），不再分成参数折叠区与状态区两个块。
 *          ④ 宽高统一：面板宽度固定（--panel-w），子面板与之同宽；六个子面板高度完全相同
 *             （--body-h 固定高 + 内部滚动），所以展开哪一行，面板几何尺寸都一样。
 *          ⑤ 顺带修一处既有样式缺陷：CSS 里少了「@media (prefers-reduced-motion: reduce) {」开头，
 *             导致两条规则落到顶层、且有两行非法的 // 注释 —— 现在动效降级按系统设置正常生效。
 * v2.6.1 —— 修「已读提速进度不停重置」+ 本地进度记忆：
 *          ① 根因：2.6.0 为治「开了自动却不动」，把自动开跑改成每个心跳都重试；一轮跑完后 isRunning
 *             变 false，下个心跳又从头开跑 —— 每跑完一整轮就回一次 1 楼，看上去就是「进度一直在重置」。
 *             （对照脚本 550122 的做法是「每个页面加载只跑一轮、没有周期性重跑」，也没有进度记忆。）
 *             修法：加 autoHold —— 本页这一轮跑过（跑完/失败）就不再自动重开；换页、手动重新打开
 *             「自动」、清空进度时复位。
 *          ② 本地进度记忆：按话题 id 把「已同步到第几楼」写进 localStorage(`ldkit.readboost.progress.v1`)，
 *             最多记 200 个话题按时间淘汰。开始提速时起点 = max(从当前楼或 1 楼, 已刷到 + 1)，
 *             已刷过的楼不再重复发请求；每批成功后就地更新。同一话题重复点开始只会刷没刷过的部分。
 *          ③ UI：状态行显示「已刷到 N 楼 / 可续刷」或「此话题已刷完」，新增「清空进度」按钮
 *             （清空后可从 1 楼重刷）；已读提速的状态行也支持粘性提示，不再被周期状态立刻冲掉。
 * v2.6.0 —— 三件事：
 *          ① 修「已读提速进度会重置成从 1 楼」：原来按整串 URL 判断「换页」，而 Discourse 在同一个
 *             话题里滚动时会把地址栏改成当前楼号（/t/xxx/123/45），于是每滚一下就当成换了页 ——
 *             正在跑的任务被打断、再从头开跑。现在只认「话题 id 变了」才算换页；顺手修了话题路径解析
 *             （/t/12345/78 以前会被读成 topicID=78）。「从当前楼开始」的起点也改为优先取地址栏楼号。
 *          ② 一个功能一页：面板改成标签栏 + 六个独立页，每页只有该功能的开关 / 参数 / 状态 / 动作，
 *             手动解码并进「密文自解」页；标签上带状态点，并记住上次看的那一页 —— 不再六个功能挤一屏。
 *          ③ 图标上直接看进度：悬浮球外圈套一层进度环（提速蓝 / 回应绿）+ 数字徽标
 *             （提速显示百分比、回应显示今日已回应 / 上限），跑完自动让位。
 *          另外把「面板挂载失败」从静默吞掉改成写进调试出口 mountError，便于自检。
 * v2.5.1 —— 修「配置不持久」：已读提速的「自动运行 / 从当前楼」两个开关只存在于旧键
 *          `ldkit.readboost.cfg.v1`，而 2.4.0 起只要统一参数表存在就整段以面板为准 →
 *          这两个开关每次打开新页面都被重置成关，表现就是「开了自动只对当前这一个页面有效」。
 *          现在两头都补：① 两个开关纳入统一参数表（参数折叠区里可勾选，与分区里的快捷按钮双向同步）；
 *          ② loadConfig 改成逐键判优先级：面板显式存过的键 > 旧键 > 出厂默认，
 *             任何升级路径都不丢配置（旧键里的自动 / 从当前楼 会被继承并迁移进新表）。
 *          另外修「自动开了却不动」：原来只在页面加载后 1.5 秒判断一次，话题楼层信息还没就绪
 *          就永久放弃；改成每个心跳重试（上限 60 次），换页复位；手动「停止」后本页不再被自动接管。
 *          顺带删掉两个已无调用方的死代码（rbResetConfig / defaultReadBoostConfig）。
 * v2.5.0 —— 两点新增 + 一轮瘦身：
 *          ① 「过盾重试」的跳转目标改成可选：盾页重过（默认）/ 重载本页 / 回到首页，
 *             参数区里是一个三选一下拉框；决策函数 planJump 据此产出目标地址，
 *             跳转时按模式走 location.reload() 或 location.href。
 *          ② 面板底部加「一键全默认」：一次把六个功能的参数全部恢复出厂值并回写输入框。
 *          ③ 瘦身：删掉无人调用的 KitUI.syncFlags（开关切换本来就会重载页面）、
 *             未使用的 RB_LEGACY_KEY、调试出口里重复的 decodeManualInput 键，
 *             以及 bootB64Observer 里一处错位的缩进；新增 select 类型的参数渲染分支。
 * v2.4.1 —— 修掉一个自己引入的迁移缺陷：统一参数表里总有默认值，导致「面板优先」判断永远成立，
 *          2.3.0 及以前存在 localStorage(`ldkit.readboost.cfg.v1`) 里的自定义参数不会被采用。
 *          现在只在用户真的保存过面板参数（`ldkit.params.v1` 里存在 readBoost 记录）时才以面板为准，
 *          否则先采用旧键的值、再一次性迁移进统一参数表。已用 Node 用例覆盖（旧键 baseDelay=4200
 *          → getParams('readBoost').baseDelay === 4200）。
 * v2.4.0 —— 合并「LINUX.DO CloudFlare Challenge Bypass v0.3.2」（原作者 Pipecraft / utags，脚本 552218）：
 *          新增第六个功能「过盾重试」：Cloudflare 5 秒盾验证失败时（页面弹出
 *          「403 error」「我们无法加载该话题」「该回应是很久以前创建的」等提示），
 *          自动跳回 /challenge?redirect=<当前地址> 重过一次盾；盾页本身返回
 *          「页面不存在」时按 redirect 参数或站点首页兜底返回，并有跳转冷却防止来回弹跳。
 *          原脚本的菜单命令（GM_registerMenuCommand）改为面板按钮「立即跳转 / 重置记录」。
 *          命名统一：所有功能名改为四个汉字（密文自解 / 原生复制 / 外链解锁 /
 *          随读回应 / 已读提速 / 过盾重试），面板不再出现任何内部标识或函数名。
 *          参数折叠：六个功能的开关右侧各带一个「参数」折叠开关，点击展开参数设置、
 *          再次点击折叠；参数统一写 localStorage(`ldkit.params.v1`)，保存后即时生效
 *          （无需刷新），「恢复默认」一键回退。原 ReadBoost 的独立参数面板并入该折叠区，
 *          旧键 `ldkit.readboost.cfg.v1` 首次启动自动迁移，旧数据不丢。
 *          顺带补上已读提速状态灯缺失的警示色（warn）与错误色（err）样式。
 *          参考脚本（按合并顺序）：Discourse 原生 Markdown 复制 v3.8（You & LeonShaw）
 *          · Discourse外链安全解锁器 v1.3 · Linux.do 随机回应 v2.4.3（HawChow）
 *          · LINUXDO&IDCFlare ReadBoost（Sunwuyuan / adodo）
 *          · LINUX.DO CloudFlare Challenge Bypass v0.3.2（Pipecraft / utags）
 * v2.3.0 —— 合并「LINUXDO&IDCFlare ReadBoost」（原作者 Sunwuyuan / adodo）：
 *          为工具箱增加第五个模块「已读提速 (ReadBoost)」，在话题页向 /topics/timings 批量
 *          同步已读记录与模拟阅读耗时，快速刷取已读帖数与时长；支持从第 1 楼或当前楼起刷、
 *          支持自动运行与高级参数调节（基础延迟、随机范围、单批帖数、单帖耗时）；
 *          原脚本的独立设置弹窗与状态标签收纳进工具箱右下角面板，保持页面清爽；
 *          支持 linux.do / qingju.me / idcflare.com。
 * v2.2.0 —— 悬浮开合：右下角图标改成「鼠标悬停即展开、指针移开即折叠」，不用点击。
 *          进图标后有 90ms 判定延迟（防鼠标划过误弹）；离开图标留 280ms、离开面板留
 *          180ms 的宽限，够指针在两者之间穿行；指针一旦落在面板上，或焦点已进入面板
 *          （正在输入），一律不自动收起。
 *          点击行为顺带理顺：点击=展开并把焦点送进输入框，不再「点一下收起」
 *          （收起走 移开指针 / ✕ / Esc）；触屏等无悬浮能力的设备仍是点击开关；
 *          图标同时补上键盘 Enter / 空格展开。
 *          悬浮展开不抢输入焦点（只在你点击或按键盘时才聚焦文本框）。
 * v2.1.0 —— 改名：脚本已不止一种功能，@name 从「LINUX DO Base64 自动解码」改为
 *          「LINUX DO 工具箱」，与右下角面板标题一致；@description 重写为四模块总述。
 *          顺带去掉手写的 @downloadURL / @updateURL（发布时由 GreasyFork 按新 slug 注入），
 *          避免改名后旧地址滞留在脚本头；并修掉注释头重复的 /* 记号。
 *          功能与 2.0.1 完全一致，无代码改动。
 * v2.0.1 —— 面板重做 + 一轮对抗式审查后的修复
 *   界面：悬浮球改为四模块点阵；服务行只显示模块名与开关（不再暴露内部开关键名）；
 *         去掉圆角卡片堆叠与绿色渐变，改用分隔线加单一状态色（运行/暂停/封锁）；
 *         补齐键盘焦点环与 prefers-reduced-motion。
 *   修复：① document.head 未就绪时不再让整个脚本终止（原为无防护的顶层调用）
 *         ② replaceWith 拦截收窄到登录跳转（原先「以 / 开头」会吞掉站点自身的相对链接改写）
 *         ③ 事件拦截只保留 click / auxclick（原先屏蔽 8 种事件会连带打断站点交互）
 *         ④ 跨标签页冷却回读：别的标签页命中 429 后本页立即停手
 *         ⑤ localStorage 数值字段归一化（避免 "5" + 1 变成 "51"）
 *         ⑥ XHR load 监听只挂一次；观察器只在新增子树含候选串时才整容器重扫
 *         ⑦ 随机回应未启用时「暂停 / 继续」两个按钮一并置灰（原先「继续」永久禁用）
 *         ⑧ bootDom / 观察器 / 点击委托各加一次求值护栏
 *         ⑨ 冷却结束时清掉失败记录，让刚才失败的楼层还有重试机会
 *         ⑩ 状态用语统一，去掉 em dash 式拼接
 * v2.0.0 —— 四合一工具箱：合并原三个独立脚本，四个模块各自独立开关
 *   1. 外链解锁（原「Discourse外链安全解锁器」v1.3）：document-start 劫持
 *      Element.prototype.replaceWith，阻止 External Link Shield 把真链换成登录跳转；
 *      点击外链强制新标签页 + noopener 并拦掉站点自身的点击拦截。原脚本的 confirm
 *      协议弹窗已移除，改由工具箱面板的开关控制。
 *   2. 复制原生 Markdown（原「Discourse 原生 Markdown 复制」v3.8）：楼层操作栏注入
 *      按钮，同源 fetch /raw/<topic>/<post>（带 CF 凭证与登录态），加标题/楼层与
 *      转载来源；GM_setClipboard 改用本脚本内置的 copyText（clipboard API + 回退）。
 *   3. 随机回应（原「Linux.do 随机回应」v2.4.3，作者 HawChow）：核心调度、冷却识别、
 *      跨标签页计数、toggle 回读防撤全部保留；原脚本自带的悬浮球与面板已移除，
 *      状态显示与「暂停 / 继续 / 解除冷却」并入工具箱面板。顺带修掉原「解除冷却」里
 *      `storeHits = 0` 的未声明变量（严格模式下抛 ReferenceError，导致后续步骤不执行）。
 *   4. 统一开关：四个模块的开关写 localStorage(`ldkit.flags.v1`)，切换后自动刷新页面生效。
 *   5. @run-at 由 document-idle 改为 document-start（外链劫持必须早于站点脚本）；
 *      其余模块改在 DOMContentLoaded 之后按开关启动。
 *   6. @match 收敛为 linux.do / qingju.me（原 Markdown 复制脚本用的是全站匹配，
 *      收敛后不再往所有站点注入，减少无谓开销）。
 *      收敛后不再在所有站点注入，减少无谓开销）。
 *
 * v1.4.0（相对 1.3.0）—— 新增「手动解码面板」兜底手段
 *  1. 右下角常驻悬浮按钮（`B64`）：可拖动改变位置（位置写入 localStorage 记忆），
 *     单击展开/收起面板；面板用 Shadow DOM 承载，样式与 linux.do 主题互不污染。
 *  2. 面板内可粘贴任意 Base64 文本：支持被空格/换行/全角空白拆散、被零宽字符污染、
 *     带成对引号或 Markdown 代码围栏（```lang）、带 `data:...;base64,` 前缀、混在正文里的串。
 *  3. 智能分段：整串优先解一次；失败则按「非 Base64 字符」切分后逐段尝试，
 *     把能解出来的段分别列出（应对发帖人把 Base64 拆成几段、中间夹说明文字的情况）。
 *  4. 多层解码：最多连续解 3 轮（应对二次编码），结果仍是 Base64 载荷时继续下钻。
 *  5. 容错 UTF-8：严格 UTF-8 校验失败时退回宽松解码，并在结果上标注「非 UTF-8，可能有乱码」。
 *  6. 结果区每段带独立「复制」按钮；结果是 URL 时自动渲染为可点击链接；
 *     输入即自动解码（180ms 防抖），Ctrl+Enter 立即解码，Esc 关闭面板。
 *  7. 手动模式放宽入口阈值（最短 2 字符即可解），但仅首轮允许非 UTF-8 宽松解码；
 *     已解出的短明文（< 8 字符）不再下钻，避免把明文二次解成乱码。
 *  8. `window.__LDB64__.decodeManualInput` 暴露给控制台，便于排查。
 *
 * v1.3.0（相对 1.2.0）
 *  1. 隐藏内容整体解：`<details>`、`.spoiled`/`.spoiler`（linux.do 的「隐藏内容」模糊块）里的长串，
 *     即使被折行、或被 `<br>`/多个块级元素拆成多个文本节点，也按整块 compact 后整体解一次；
 *  2. 高亮代码块：Discourse 的 hljs 会往 `<code>` 里插 `<span>`，现在只要块内还没有解码 span，
 *     就按 textContent 整体尝试解码。
 *  3. 自动揭开「隐藏内容」：CFG.revealHidden（默认 true）把模糊遮罩就地展开，省去逐条点击。
 *  4. 动态文本：MutationObserver 现在也处理后插入的「纯文本节点」。
 *  5. 幂等标记升级为 `data-ldb64-done="1.4.0"`；同页旧版本留下的标记不会挡住本版。
 *
 * v1.2.0（相对线上 1.1.0）
 *  1. padding 归一化：先剥离全部尾部 `=` 再做 len%4 结构性判断，随后重新补齐。
 *  2. 字符清理：零宽字符（U+200B/200C/200D/2060/FEFF）、Unicode 空白（含 NBSP、全角空格 U+3000）、折行。
 *  3. 折行/内联码整体解：`<pre>`、`<code>`、`<details>` 内的折行长串按整块 compact 后解码。
 *  4. 二次解码收紧：仅当上一轮结果是「纯 base64 字母表且非 URL / 非 sk- 密钥明文」时才继续。
 *  5. 一键复制：clipboard API 优先，失败回退 textarea+execCommand，并加超时兜底。
 *  6. 偏好持久化：默认解码态；切到「原文」后写入 localStorage(`ldb64.pref`)。
 */

(function () {
  'use strict';

  // ================================================================
  // 统一开关：七个功能各自独立开关（写 localStorage，切换后自动刷新生效）
  //   面板上一律使用四个汉字的显示名，不出现任何内部标识或函数名：
  //   · b64        密文自解   正文 Base64 就地解码 + 手动解码面板
  //   · mdCopy     原生复制   取 /raw/ 楼层原生 Markdown
  //   · linkUnlock 外链解锁   破解登录可见 + 强制新标签页
  //   · autoReact  随读回应   跟随阅读随机回应（跳过爱心与 +1）
  //   · readBoost  已读提速   /topics/timings 批量同步已读
  //   · cfShield   过盾重试   Cloudflare 盾失败后自动跳回盾页
  //   · onlyUser   只看此人   每层楼用户名旁一键只看该用户的帖子
  // ================================================================
  const FLAGS_KEY = 'ldkit.flags.v1';
  const FLAG_DEFS = [
    { id: 'b64', label: '密文自解', hint: '自动识别帖子正文里的 Base64 并就地解码显示（含手动解码面板）' },
    { id: 'mdCopy', label: '原生复制', hint: '在每层楼的操作栏加一个按钮，取 /raw/ 原生 Markdown 并附转载来源' },
    { id: 'linkUnlock', label: '外链解锁', hint: '破解 External Link Shield：外链免登录可见，点击强制新标签页且不弹提示' },
    { id: 'autoReact', label: '随读回应', hint: '只对当前可见且未回应的楼层随机回应（跳过爱心与 +1）' },
    { id: 'readBoost', label: '已读提速', hint: '向 /topics/timings 批量同步已读记录，快速刷取已读帖数与阅读时间' },
    { id: 'cfShield', label: '过盾重试', hint: 'Cloudflare 盾验证失败时自动跳回盾页重试；盾页失效则按 redirect 或首页兜底' },
    { id: 'onlyUser', label: '只看此人', hint: '在每层楼用户名右侧加一键按钮，直接套用 Discourse 原生「话题中的帖子」筛选；只有 1 帖的用户也能筛' }
  ];
  const FLAG_DEFAULTS = { b64: true, mdCopy: true, linkUnlock: true, autoReact: true, readBoost: true, cfShield: true, onlyUser: true };

  function flagLabel(id) {
    for (const d of FLAG_DEFS) if (d.id === id) return d.label;
    return '该功能';
  }

  // ---- 各功能的可设置参数（面板上每个开关右侧的「参数」折叠区） ----
  //   type: number 数字输入 / bool 勾选 / text 文本（关键词用英文逗号分隔）
  const PARAM_DEFS = {
    b64: [
      { key: 'minLen', label: '候选最短', type: 'number', min: 4, max: 512, step: 1, def: 16 },
      { key: 'minDecoded', label: '结果最短', type: 'number', min: 1, max: 512, step: 1, def: 5 },
      { key: 'maxRounds', label: '解码轮数', type: 'number', min: 1, max: 6, step: 1, def: 2 },
      { key: 'debounceMs', label: '输入延迟ms', type: 'number', min: 0, max: 3000, step: 10, def: 180 }
    ],
    mdCopy: [
      { key: 'appendSource', label: '附转载来源', type: 'bool', def: true },
      { key: 'toastMs', label: '提示时长ms', type: 'number', min: 600, max: 8000, step: 100, def: 2000 }
    ],
    linkUnlock: [
      { key: 'newTab', label: '强制新标签', type: 'bool', def: true },
      { key: 'blockClick', label: '拦截站点点击', type: 'bool', def: true }
    ],
    autoReact: [
      { key: 'MIN_DELAY', label: '最短间隔ms', type: 'number', min: 1000, max: 600000, step: 500, def: 8000 },
      { key: 'MAX_DELAY', label: '最长间隔ms', type: 'number', min: 1000, max: 900000, step: 500, def: 20000 },
      { key: 'DAILY_CAP', label: '每日上限', type: 'number', min: 1, max: 500, step: 1, def: 40 },
      { key: 'TICK_MS', label: '调度心跳ms', type: 'number', min: 200, max: 5000, step: 50, def: 700 }
    ],
    readBoost: [
      { key: 'autoStart', label: '打开话题就自动提速', type: 'bool', wide: true, def: false },
      { key: 'startFromCurrent', label: '从当前楼开始（不从头）', type: 'bool', wide: true, def: false },
      { key: 'baseDelay', label: '基础延迟ms', type: 'number', min: 500, max: 60000, step: 100, def: 2500 },
      { key: 'randomDelayRange', label: '随机范围ms', type: 'number', min: 0, max: 30000, step: 100, def: 800 },
      { key: 'minReqSize', label: '单批最少帖', type: 'number', min: 1, max: 200, step: 1, def: 8 },
      { key: 'maxReqSize', label: '单批最多帖', type: 'number', min: 1, max: 500, step: 1, def: 20 },
      { key: 'minReadTime', label: '单帖最少ms', type: 'number', min: 100, max: 60000, step: 100, def: 800 },
      { key: 'maxReadTime', label: '单帖最多ms', type: 'number', min: 100, max: 120000, step: 100, def: 3000 }
    ],
    cfShield: [
      {
        key: 'jumpMode', label: '跳转目标', type: 'select', wide: true, def: 'challenge',
        options: [
          { value: 'challenge', label: '盾页重过（默认）' },
          { value: 'reload', label: '重载本页' },
          { value: 'home', label: '回到首页' }
        ]
      },
      { key: 'guardMs', label: '跳转冷却ms', type: 'number', min: 1000, max: 60000, step: 500, def: 5000 },
      { key: 'homeFallback', label: '失效回首页', type: 'bool', def: true },
      { key: 'challengePath', label: '盾页路径', type: 'text', wide: true, def: '/challenge' },
      {
        key: 'errorTexts', label: '拦截关键词（英文逗号分隔）', type: 'text', wide: true,
        def: '403 error,该回应是很久以前创建的,reaction was created too long ago,我们无法加载该话题,You are not allowed to react'
      }
    ],
    onlyUser: [
      {
        key: 'anchor', label: '按钮位置', type: 'select', wide: true, def: 'name',
        options: [
          { value: 'name', label: '用户名右侧（默认）' },
          { value: 'avatar', label: '头像下方' }
        ]
      },
      { key: 'showText', label: '显示「只看TA」字样', type: 'bool', def: false },
      { key: 'hoverOnly', label: '悬停才显示', type: 'bool', def: false }
    ]
  };

  const PARAMS_KEY = 'ldkit.params.v1';

  function defaultParams(id) {
    const o = {};
    const list = PARAM_DEFS[id] || [];
    for (const p of list) o[p.key] = p.def;
    return o;
  }

  function loadParams() {
    const out = {};
    for (const id in PARAM_DEFS) out[id] = defaultParams(id);
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(PARAMS_KEY) || 'null'); } catch (e) { saved = null; }
    if (!saved || typeof saved !== 'object') return out;
    for (const id in PARAM_DEFS) {
      const s = saved[id];
      if (!s || typeof s !== 'object') continue;
      for (const p of PARAM_DEFS[id]) {
        const v = s[p.key];
        if (v === undefined || v === null) continue;
        if (p.type === 'number') {
          const n = Number(v);
          if (isFinite(n)) out[id][p.key] = n;
        } else if (p.type === 'bool') {
          out[id][p.key] = !!v;
        } else {
          out[id][p.key] = String(v);
        }
      }
    }
    return out;
  }

  const PARAMS = loadParams();

  function getParams(id) { return PARAMS[id] || {}; }

  function persistParams() {
    try { localStorage.setItem(PARAMS_KEY, JSON.stringify(PARAMS)); } catch (e) { /* 隐私模式等：本次会话内仍生效 */ }
  }

  // 收参数 → 通知该功能即时应用 → 把值写回面板输入框
  function applyParams(id) {
    const hook = KitUI.paramHooks[id];
    if (hook) { try { hook(getParams(id)); } catch (e) { /* 单个功能失败不影响其它 */ } }
    try { if (KitUI.syncParams) KitUI.syncParams(id); } catch (e) { /* ignore */ }
  }

  function saveParams(id, patch) {
    PARAMS[id] = Object.assign({}, getParams(id), patch || {});
    persistParams();
    applyParams(id);
    return PARAMS[id];
  }

  function resetParams(id) {
    PARAMS[id] = defaultParams(id);
    persistParams();
    applyParams(id);
    return PARAMS[id];
  }

  function loadFlags() {
    const out = {};
    for (const d of FLAG_DEFS) out[d.id] = !!FLAG_DEFAULTS[d.id];
    try {
      const saved = JSON.parse(localStorage.getItem(FLAGS_KEY) || '{}');
      for (const d2 of FLAG_DEFS) {
        if (typeof saved[d2.id] === 'boolean') out[d2.id] = saved[d2.id];
      }
    } catch (e) { /* 隐私模式等：退回默认值 */ }
    return out;
  }

  const FLAGS = loadFlags();

  function isOn(id) { return FLAGS[id] !== false; }

  function setFlag(id, v) {
    FLAGS[id] = !!v;
    try { localStorage.setItem(FLAGS_KEY, JSON.stringify(FLAGS)); } catch (e) { /* ignore */ }
  }

  // ================================================================
  // KitUI：面板与各模块之间的桥（模块只报告状态，不直接操作面板 DOM）
  // ================================================================
  const KitUI = {
    statusEl: null,
    dotEl: null,
    _status: '打开任意话题页后开始跟随',
    _dot: 'on',
    arPause: null,      // 由随机回应模块注册
    arResume: null,
    arClearCd: null,
    arIsPaused: null,
    syncArButtons: function () {},    // 由面板实现
    paramHooks: {},                   // 各功能注册：收到参数后即时应用（无需刷新）
    syncParams: function () {},       // 由面板实现：把参数写回输入框
    onDot: null,                      // 由面板实现：把功能状态画到「标签栏 + 页内」两枚指示灯上
    cfStatusEl: null,
    cfDotEl: null,
    _cfStatus: '打开任意话题页后可过盾',
    _cfDot: 'off',
    _cfLockUntil: 0,
    cfJump: null,                     // 由过盾重试模块注册
    cfResetGuard: null,
    setCfStatus: function (t, stickyMs) {
      const now = Date.now();
      if (stickyMs) {
        this._cfLockUntil = now + stickyMs;
      } else if (this._cfLockUntil && now < this._cfLockUntil) {
        return;
      }
      this._cfStatus = String(t == null ? '' : t);
      if (this.cfStatusEl) this.cfStatusEl.textContent = this._cfStatus;
    },
    setCfDot: function (cls) {
      this._cfDot = cls || 'off';
      if (this.onDot) this.onDot('cfShield', this._cfDot);
      else if (this.cfDotEl) this.cfDotEl.className = 'kit-dot ' + this._cfDot;
    },
    // —— 「只看此人」的状态出口（面板实现，模块只报状态）——
    ouStatusEl: null,
    ouDotEl: null,
    _ouStatus: '打开任意话题页后可一键只看某人',
    _ouDot: 'off',
    _ouLockUntil: 0,
    ouClear: null,                    // 由「只看此人」模块注册：清掉筛选回全部
    ouReady: null,
    buildOnlyUserUrl: null,           // 由「只看此人」模块注册：只读出口，供自检断言 URL 构造
    setOuStatus: function (t, stickyMs) {
      const now = Date.now();
      if (stickyMs) {
        this._ouLockUntil = now + stickyMs;
      } else if (this._ouLockUntil && now < this._ouLockUntil) {
        return;
      }
      this._ouStatus = String(t == null ? '' : t);
      if (this.ouStatusEl) this.ouStatusEl.textContent = this._ouStatus;
    },
    setOuDot: function (cls) {
      this._ouDot = cls || 'off';
      if (this.onDot) this.onDot('onlyUser', this._ouDot);
      else if (this.ouDotEl) this.ouDotEl.className = 'kit-dot ' + this._ouDot;
    },
    rbStatusEl: null,
    rbDotEl: null,
    _rbStatus: '打开任意话题页后可提速',
    _rbDot: 'off',
    _rbLockUntil: 0,
    rbStart: null,
    rbStop: null,
    rbToggleFrom: null,
    rbToggleAuto: null,
    rbGetConfig: null,
    rbSaveConfig: null,
    rbResetConfig: null,
    rbIsRunning: null,
    setRbStatus: function (t, stickyMs) {
      const now = Date.now();
      if (stickyMs) {
        this._rbLockUntil = now + stickyMs;
      } else if (this._rbLockUntil && now < this._rbLockUntil) {
        return;
      }
      this._rbStatus = String(t == null ? '' : t);
      if (this.rbStatusEl) this.rbStatusEl.textContent = this._rbStatus;
    },
    setRbDot: function (cls) {
      this._rbDot = cls || 'off';
      if (this.onDot) this.onDot('readBoost', this._rbDot);
      else if (this.rbDotEl) this.rbDotEl.className = 'kit-dot ' + this._rbDot;
    },
    syncRbButtons: function () {},
    _lockUntil: 0,                    // 粘性提示锁：用户操作/重要事件在锁定期内不被常规状态覆盖
    setStatus: function (t, stickyMs) {
      const now = Date.now();
      if (stickyMs) {
        this._lockUntil = now + stickyMs;
      } else if (this._lockUntil && now < this._lockUntil) {
        return;
      }
      this._status = String(t == null ? '' : t);
      if (this.statusEl) this.statusEl.textContent = this._status;
    },
    setDot: function (cls) {
      this._dot = cls || 'on';
      if (this.onDot) this.onDot('autoReact', this._dot);
      else if (this.dotEl) this.dotEl.className = 'kit-dot ' + this._dot;
    },
    // 悬浮球上的进度：kind 决定颜色（rb 蓝 / ar 绿），text 是徽标文字；传 null 清除
    _progress: null,
    onProgress: null,                 // 由面板实现：把进度画到图标上
    setProgress: function (kind, pct, text) {
      // 提速是一次有始有终的动作，优先级高于「今日回应计数」：跑到一半别被计数顶掉
      if (kind && kind !== 'rb' && this._progress && this._progress.kind === 'rb') return;
      this._progress = kind ? { kind: kind, pct: pct, text: text == null ? '' : String(text) } : null;
      if (this.onProgress) { try { this.onProgress(this._progress); } catch (e) { /* ignore */ } }
    },
    flash: function (good) {
      const el = this.dotEl;
      if (!el) return;
      el.classList.remove('kit-flash-ok', 'kit-flash-bad');
      void el.offsetWidth;
      el.classList.add(good ? 'kit-flash-ok' : 'kit-flash-bad');
      setTimeout(function () { el.classList.remove('kit-flash-ok', 'kit-flash-bad'); }, 720);
    }
  };

  const CFG = {
    minLen: 16,          // 候选串最短长度（低于此不解码，防误伤）
    minDecoded: 5,       // 解码结果最短长度
    maxRounds: 2,        // 最多连续解码轮数（应对二次编码）
    codeBlocks: true,    // 处理代码块/内联码（长 base64 常放这里；含 hljs 高亮后带 span 的情况）
    hiddenBlocks: true,  // 处理隐藏内容（[details] / 「隐藏内容」模糊块）：整块合并后解码
    revealHidden: true,  // 自动揭开「隐藏内容」模糊遮罩（false = 保持模糊，但仍会尝试解码）
    makeLinks: true,     // 解码结果是 URL 时渲染为可点击链接
    copyButton: true,    // 解码结果旁渲染「一键复制」按钮
    debounceMs: 180,     // 手动解码面板：输入即解码的防抖延迟（面板参数可调）
    prefKey: 'ldb64.pref'
  };

  // 面板参数 → 本模块运行时配置（启动时调一次；「保存参数 / 恢复默认」时再调）
  function applyB64Params(p) {
    if (!p) return;
    if (typeof p.minLen === 'number' && p.minLen >= 1) CFG.minLen = Math.floor(p.minLen);
    if (typeof p.minDecoded === 'number' && p.minDecoded >= 1) CFG.minDecoded = Math.floor(p.minDecoded);
    if (typeof p.maxRounds === 'number' && p.maxRounds >= 1) CFG.maxRounds = Math.floor(p.maxRounds);
    if (typeof p.debounceMs === 'number' && p.debounceMs >= 0) CFG.debounceMs = Math.floor(p.debounceMs);
  }
  applyB64Params(getParams('b64'));
  KitUI.paramHooks.b64 = applyB64Params;

  // ---- 手动解码面板相关配置 ----
  const MANUAL = {
    minLen: 2,           // 手动模式：接受的最短载荷（`aGk=` -> `hi` 这类短串也解）
    minDecoded: 1,       // 手动模式：结果不设长度下限（用户明确知道自己在解什么）
    deepMinLen: 8,       // 继续下钻的最短长度：低于此值视为已到最终明文，不再二次解码
    segMinLen: 8,        // 分段尝试的最短长度（避免把正文里的短词误当成 base64 片段）
    maxRounds: 3         // 多轮下钻（二次/三次编码）
  };
  const UI_HOST_ID = 'ldb64-manual-host';
  const UI_POS_KEY = 'ldb64.panel.pos';

  const TOKEN_RE = /[A-Za-z0-9+/=_-]{16,}/g;
  const B64ISH_RE = /^[A-Za-z0-9+/=_-]+$/;                 // 含 padding / URL-safe 的宽松字母表
  const BODY_RE = /^[A-Za-z0-9+/]+$/;                      // 剥离 padding 后的纯载荷字母表
  const WS_RE = /[\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\u200b\u200c\u200d\u2060\ufeff]+/g;
  const URL_RE = /^https?:\/\/\S+$/;
  const DEEP_SKIP_RE = /^(?:https?:\/\/|sk-|Bearer\s)/i;   // 已是最终产物：URL / 密钥
  const DONE_ATTR = 'ldb64Done';                           // 扫描幂等标记（按版本区分，避免被别的版本挡住）
  const DONE_VER = '1.4.0';

  // ---------- 解码核心 ----------
  // 把候选串归一化成 atob 能吃的标准 base64；失败返回 null
  function normalizeB64(str) {
    let t = String(str == null ? '' : str).replace(WS_RE, '');
    t = t.replace(/-/g, '+').replace(/_/g, '/');           // Base64URL 归一化
    t = t.replace(/=+$/, '');                              // 1) 先剥离全部尾部 padding
    if (t.length < CFG.minLen) return null;
    if (!BODY_RE.test(t)) return null;                     // 中间夹 = 等非法结构直接出局
    if (t.length % 4 === 1) return null;                   // 2) 再判结构：不可能是合法 base64
    while (t.length % 4) t += '=';                         // 3) 按载荷长度重新补齐
    return t;
  }

  function isPrintable(out) {
    const chars = [...out];
    if (!chars.length) return false;
    let printable = 0;
    for (const ch of chars) {
      const c = ch.codePointAt(0);
      if (c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 127)) printable++;
    }
    return printable / chars.length >= 0.9;
  }

  function decodeOnce(str) {
    const t = normalizeB64(str);
    if (!t) return null;
    let bin;
    try { bin = atob(t); } catch (e) { return null; }
    let out;
    try {
      out = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
    } catch (e) { return null; }                            // 严格 UTF-8 校验，滤掉二进制噪声
    if (!out || out.length < CFG.minDecoded) return null;
    if (!isPrintable(out)) return null;                     // 可打印比例过滤
    return out;
  }

  // 二次解码是否值得继续：上一轮结果必须仍「像一段 base64 载荷」且不是最终产物
  function canDeepDecode(d) {
    if (!d || d.length < CFG.minLen) return false;
    if (!B64ISH_RE.test(d)) return false;                   // 含空白/中文/标点 -> 已是最终文本
    if (DEEP_SKIP_RE.test(d)) return false;                 // URL / sk- 密钥 / Bearer -> 不再解
    return true;
  }

  // 返回最终展示文本；完全没有解码成功则返回 null
  function resolveText(token) {
    let cur = String(token == null ? '' : token), changed = false;
    for (let i = 0; i < CFG.maxRounds; i++) {
      if (i > 0 && !canDeepDecode(cur)) break;
      const d = decodeOnce(cur);
      if (d == null || d === cur) break;
      cur = d; changed = true;
    }
    return changed ? cur : null;
  }

  // ---------- 偏好持久化 ----------
  function getPref() {
    try { return localStorage.getItem(CFG.prefKey) === 'raw' ? 'raw' : 'decoded'; }
    catch (e) { return 'decoded'; }
  }
  function setPref(v) {
    try { localStorage.setItem(CFG.prefKey, v === 'raw' ? 'raw' : 'decoded'); } catch (e) { /* 隐私模式等 */ }
  }

  // ---------- 剪贴板 ----------
  function legacyCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  // 写剪贴板：clipboard API 优先；但在「文档未获焦点 / 没有用户激活」的环境里
  // writeText 可能既不 resolve 也不 reject —— 加超时兜底，保证按钮反馈一定会出现。
  function copyText(text) {
    const fallback = function () { return { ok: legacyCopy(text), via: 'execCommand' }; };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        const written = navigator.clipboard.writeText(text).then(function () { return { ok: true, via: 'clipboard' }; }, fallback);
        return Promise.race([
          written,
          new Promise(function (resolve) { setTimeout(function () { resolve(fallback()); }, 700); })
        ]);
      }
    } catch (e) { /* fallthrough */ }
    return Promise.resolve(fallback());
  }

  // ---------- 渲染 ----------
  function appendCopyButton(span, text) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ld-b64-copy';
    btn.dataset.label = '📋';
    btn.textContent = '📋';
    btn.title = '复制解码结果';
    btn.setAttribute('data-ldb64-copy', text);
    // mousedown 就拦截：不让这次按下触发帖子自身的点击处理（折叠、引用展开等）
    btn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    span.appendChild(btn);
  }

  function renderDecoded(span) {
    const decoded = resolveText(span.dataset.raw || '');
    if (decoded == null) return false;
    span.dataset.decoded = decoded;
    span.classList.remove('ld-b64-raw');
    span.title = '点击查看原文（Base64）';
    span.style.whiteSpace = '';
    span.textContent = '';

    const textEl = document.createElement('span');
    textEl.className = 'ld-b64-text ld-b64-body';
    if (CFG.makeLinks && URL_RE.test(decoded.trim())) {
      const a = document.createElement('a');
      a.href = decoded.trim();
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = decoded.trim();
      textEl.appendChild(a);
    } else {
      textEl.textContent = decoded;
      if (decoded.includes('\n')) span.style.whiteSpace = 'pre-wrap';
    }
    span.appendChild(textEl);
    if (CFG.copyButton) appendCopyButton(span, decoded);
    return true;
  }

  function renderRaw(span) {
    span.classList.add('ld-b64-raw');
    span.title = '点击重新解码';
    span.style.whiteSpace = '';
    span.textContent = span.dataset.raw || '';
    // 保留线上 1.1.0 的行为：原文态也给复制按钮（复制的始终是解码结果）
    if (CFG.copyButton && span.dataset.decoded) appendCopyButton(span, span.dataset.decoded);
  }

  // 造一个解码 span；解不开返回 null（不改动页面）
  function makeSpan(token) {
    const decoded = resolveText(token);
    if (decoded == null) return null;
    const span = document.createElement('span');
    span.className = 'ld-b64';
    span.setAttribute('data-ldb64', '1');
    span.dataset.raw = token;
    span.dataset.decoded = decoded;                         // 先记下解码值：原文态也能一键复制
    span.style.whiteSpace = '';
    if (getPref() === 'raw') renderRaw(span);
    else if (!renderDecoded(span)) return null;
    return span;
  }

  // ---------- 交互（单一委托监听：复制按钮优先，其次解码⇄原文切换） ----------
  // 求值两次时只注册一次委托监听（否则一次点击会切换两次，净效果为零）
  if (!window.__ldkitDocClick) {
  window.__ldkitDocClick = true;
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (!t || !t.closest) return;
    if (e.button !== 0) return;                             // 只认左键：右键/选中复制不参与切换

    const copyBtn = t.closest('.ld-b64-copy');
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const span = copyBtn.closest('.ld-b64');
      const payload = copyBtn.getAttribute('data-ldb64-copy')
        || (span && (span.dataset.decoded || ''))
        || '';
      Promise.resolve(copyText(payload)).then(function (res) {
        const ok = !!(res && res.ok);
        copyBtn.dataset.copied = ok ? '1' : '0';
        copyBtn.dataset.copiedVia = (res && res.via) || 'none';
        copyBtn.textContent = ok ? '✅已复制' : '⚠️复制失败';
        copyBtn.classList.toggle('ld-b64-copy-copied', !!ok);
        copyBtn.classList.toggle('ld-b64-copied', !!ok);    // 兼容线上 1.1.0 的类名
        setTimeout(function () {
          copyBtn.textContent = '📋';
          copyBtn.classList.remove('ld-b64-copy-copied');
        }, 1200);
      });
      return;
    }

    if (t.closest('a')) return;
    const span = t.closest('.ld-b64');
    if (!span) return;
    e.preventDefault();
    e.stopPropagation();                                    // 防止同页其它版本的委托监听把这次点击再处理一遍
    if (span.classList.contains('ld-b64-raw')) {
      setPref('decoded');
      renderDecoded(span);
    } else {
      setPref('raw');
      renderRaw(span);
    }
  }, true);
  }

  // ---------- 扫描处理 ----------
  function processTextNode(node) {
    const text = node.nodeValue || '';
    if (!node.parentElement) return;
    if (node.parentElement.closest('.ld-b64, a, textarea, input, script, style')) return;
    TOKEN_RE.lastIndex = 0;
    if (!TOKEN_RE.test(text)) return;
    TOKEN_RE.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0, m, hit = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      const span = makeSpan(m[0]);
      if (!span) continue;                                  // 解不开就不动它
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      frag.appendChild(span);
      last = m.index + m[0].length;
      hit++;
    }
    if (hit) {
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
      return;
    }

    // 兜底：整串被空白/折行切碎（相邻 token 各自都解不出来）时合并后再试一次。
    // 仅在「节点内容除空白外全在 base64 字母表内」时启用，避免把普通正文拼成巧合的 base64。
    if (text === text.replace(WS_RE, '')) return;           // 本来就没有空白 -> 上面已试过
    const compact = text.replace(WS_RE, '');
    if (compact.length < CFG.minLen || !B64ISH_RE.test(compact)) return;
    const span = makeSpan(compact);
    if (!span) return;
    span.dataset.raw = text;                                // 切回原文时显示原始折行文本
    node.parentNode.replaceChild(span, node);
  }

  // 代码块/内联码整体是一个（可能折行的）base64 串 -> 整体解码
  function processCodeBlock(el) {
    const raw = el.textContent || '';
    const compact = raw.replace(WS_RE, '');
    if (compact.length < CFG.minLen || !B64ISH_RE.test(compact)) return false;
    const span = makeSpan(compact);
    if (!span) return false;
    span.classList.add('ld-b64-code');                      // 与线上 1.1.0 的类名保持一致
    span.dataset.raw = raw;                                 // 切换时显示原始折行文本
    el.textContent = '';
    el.appendChild(span);
    return true;
  }

  function isPlainCodeEl(el) {
    // 注意：Discourse 的 hljs 高亮会往 <code> 里塞 <span>，因此不能只看 children 数量
    return !!el && !el.querySelector('.ld-b64') && !el.closest('.ld-b64');
  }

  // ---------- 隐藏内容（linux.do 的「隐藏内容」模糊块、[details] 折叠块） ----------
  const HIDDEN_SEL = 'details, .spoiled, .spoiler-blurred, .spoiler';

  function isHiddenEl(el) {
    return !!el && el.nodeType === 1 && typeof el.matches === 'function' && el.matches(HIDDEN_SEL);
  }

  // 揭开模糊遮罩（spoiler-alert 插件：.spoiled.spoiler-blurred -> .spoiled）
  function revealHidden(el) {
    if (!el || el.nodeType !== 1) return false;
    const blurred = el.classList.contains('spoiler-blurred')
      || el.classList.contains('spoiler')
      || el.getAttribute('data-spoiler-state') === 'blurred';
    if (!blurred) return false;
    el.classList.remove('spoiler-blurred');
    el.classList.remove('spoiler');
    el.classList.add('spoiler-revealed');
    if (el.hasAttribute('data-spoiler-state')) el.setAttribute('data-spoiler-state', 'revealed');
    el.setAttribute('aria-expanded', 'true');
    el.querySelectorAll('[aria-hidden="true"]').forEach(function (k) { k.removeAttribute('aria-hidden'); });
    return true;
  }

  // 隐藏块正文的原始文本（去掉 <summary> 折叠标题与已解码 span）
  function hiddenTextOf(el) {
    const clone = el.cloneNode(true);
    const sum = clone.querySelector('summary');
    if (sum) sum.remove();
    clone.querySelectorAll('.ld-b64').forEach(function (sp) {
      sp.parentNode.replaceChild(document.createTextNode(sp.dataset.raw || sp.textContent || ''), sp);
    });
    return clone.textContent || '';
  }

  // 隐藏块整体解：被折行、或被 <br>/多个块级元素拆成多个文本节点的长串，也能整体 compact 后解一次
  function processHiddenBlock(el) {
    if (!isHiddenEl(el)) return false;
    if (el.querySelector('pre, code')) return false;        // 代码块交给 codeBlocks 分支逐块处理，避免把多段误拼成一段
    const spans = el.querySelectorAll('.ld-b64');
    const parts = Array.prototype.map.call(spans, function (s) {
      return (s.dataset.raw || '').replace(WS_RE, '');
    });
    const raw = hiddenTextOf(el);                           // 已解码的 span 会被还原成 data-raw
    const compact = raw.replace(WS_RE, '');
    if (compact.length < CFG.minLen || !B64ISH_RE.test(compact)) return false;
    if (parts.length === 1 && parts[0] === compact) return false;   // 已经整块解过：幂等跳过
    if (parts.length && parts.join('') !== compact) return false;   // 块内还夹着别的文字：保持原样，不合并
    const span = makeSpan(compact);
    if (!span) return false;                                // 不是 base64：原样保留（不误伤）
    span.classList.add('ld-b64-code');
    span.dataset.raw = raw;                                 // 切回原文时显示原始折行文本
    Array.from(el.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'SUMMARY') return;   // 折叠标题保留
      el.removeChild(n);
    });
    el.appendChild(span);
    return true;
  }

  function processCooked(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.dataset[DONE_ATTR] === DONE_VER) return;       // 只有同版本重复扫描才跳过
    root.dataset[DONE_ATTR] = DONE_VER;

    if (CFG.codeBlocks) {
      root.querySelectorAll('pre').forEach(function (pre) {
        const target = pre.querySelector('code') || pre;
        if (!isPlainCodeEl(target)) return;
        try { processCodeBlock(target); } catch (e) { /* 单个块失败不影响其它 */ }
      });
      root.querySelectorAll('code').forEach(function (code) {
        if (code.closest('.ld-b64')) return;                // 已由 pre 分支或文本节点处理过
        if (code.querySelector('.ld-b64')) return;          // pre 分支已就地解码过
        try { processCodeBlock(code); } catch (e) { /* 同上 */ }
      });
    }

    if (CFG.hiddenBlocks) {
      root.querySelectorAll(HIDDEN_SEL).forEach(function (el) {
        try {
          if (CFG.revealHidden) revealHidden(el);
          processHiddenBlock(el);
        } catch (e) { /* 单个块失败不影响其它 */ }
      });
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const texts = [];
    let n;
    while ((n = walker.nextNode())) texts.push(n);
    texts.forEach(function (node) {
      try { processTextNode(node); } catch (e) { /* 单个节点失败不影响其它 */ }
    });
  }

  function scanAll(scope) {
    const root = scope || document;
    if (CFG.revealHidden) {
      root.querySelectorAll(HIDDEN_SEL).forEach(function (el) {
        try { revealHidden(el); } catch (e) { /* ignore */ }
      });
    }
    root.querySelectorAll('.cooked').forEach(processCooked);
  }

  // ---------- 样式 ----------
  const style = document.createElement('style');
  style.textContent = [
    '.ld-b64 { border-bottom: 1px dashed rgba(46, 204, 148, .85); cursor: pointer; word-break: break-all; }',
    '.ld-b64::after { content: "🔓"; font-size: .72em; margin-left: 3px; opacity: .7; }',
    '.ld-b64 a { text-decoration: underline; }',
    '.ld-b64 .ld-b64-body { word-break: break-all; }',
    '.ld-b64.ld-b64-raw { background: rgba(127,127,127,.16); border-bottom-color: rgba(255,99,99,.8); }',
    '.ld-b64.ld-b64-raw::after { content: "🔒"; }',
    '.ld-b64-copy {',
    '  appearance: none; border: 0; background: transparent; cursor: pointer;',
    '  font: inherit; font-size: .78em; line-height: 1; margin-left: 4px; padding: 1px 3px;',
    '  border-radius: 4px; opacity: .35; vertical-align: baseline; color: inherit;',
    '  transition: opacity .12s ease, background .12s ease;',
    '}',
    '.ld-b64:hover .ld-b64-copy, .ld-b64-copy:focus-visible { opacity: 1; }',
    '.ld-b64-copy:hover { background: rgba(127,127,127,.18); }',
    '.ld-b64-copy.ld-b64-copy-copied, .ld-b64-copy.ld-b64-copied { opacity: 1; background: rgba(46,204,148,.5); }'
  ].join('\n');
  try { (document.head || document.documentElement).appendChild(style); } catch (e) { /* head 未就绪也不能让整个脚本挂掉 */ }

  // ---------- 手动解码：纯逻辑部分（与 UI 解耦，便于控制台调用） ----------
  // 清理输入：去掉围栏、data URI 前缀、首尾引号
  function cleanInput(raw) {
    let s = String(raw == null ? '' : raw);
    s = s.replace(/```[^\n]*\n?/g, '\n');                   // Markdown 代码围栏（```js 等）
    s = s.replace(/^\s*data:[^,]*;base64,/i, '');           // data URI 前缀
    s = s.replace(/^[\s"'`<(\[]+/, '').replace(/[\s"'`>)\]]+$/, '');
    return s;
  }

  // 手动模式单轮解码：阈值更宽松，UTF-8 严格失败时退回宽松解码并标记 lossy
  function manualDecodeOnce(str, allowLossy) {
    let t = String(str == null ? '' : str).replace(WS_RE, '');
    t = t.replace(/-/g, '+').replace(/_/g, '/');            // Base64URL 归一化
    t = t.replace(/=+$/, '');
    if (t.length < MANUAL.minLen) return null;
    if (!BODY_RE.test(t)) return null;
    if (t.length % 4 === 1) return null;
    while (t.length % 4) t += '=';

    let bin;
    try { bin = atob(t); } catch (e) { return null; }
    const bytes = Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });

    let strictOk = true;
    let out = null;
    try {
      out = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      if (!allowLossy) return null;                         // 下钻轮次只接受严格 UTF-8，避免把明文再解成乱码
      strictOk = false;
      try { out = new TextDecoder('utf-8').decode(bytes); } catch (e2) { return null; }
    }
    if (!out || out.length < MANUAL.minDecoded) return null;
    if (!isPrintable(out)) return null;
    return { text: out, lossy: !strictOk };
  }

  // 手动模式多轮解码（应对二次编码）
  function manualDecode(str) {
    let cur = String(str == null ? '' : str);
    let best = null, rounds = 0, lossy = false;
    for (let i = 0; i < MANUAL.maxRounds; i++) {
      const r = manualDecodeOnce(cur, i === 0);             // 仅第 1 轮允许有损解码
      if (!r || r.text === cur) break;
      best = r.text; rounds++;
      if (r.lossy) { lossy = true; break; }                 // 有损结果不再继续下钻
      const compact = r.text.replace(WS_RE, '');
      if (!(compact.length >= MANUAL.deepMinLen && B64ISH_RE.test(compact))) break;   // 已是最终明文（短串不再下钻）
      if (DEEP_SKIP_RE.test(r.text)) break;                 // URL / 密钥
      cur = r.text;
    }
    if (best == null) return null;
    return { text: best, rounds: rounds, lossy: lossy };
  }

  // 对外主入口：整串优先，失败后按「非 base64 字符」切分逐段尝试
  function decodeManualInput(raw) {
    const cleaned = cleanInput(raw);
    const flat = cleaned.replace(WS_RE, '');
    if (!flat) return { ok: false, reason: 'empty' };

    const whole = manualDecode(flat);
    if (whole) {
      return { ok: true, segments: [{ label: '整串', text: whole.text, rounds: whole.rounds, lossy: whole.lossy }] };
    }

    const segs = cleaned.split(/[^A-Za-z0-9+/=_\-\s]+/)
      .map(function (s) { return s.replace(WS_RE, ''); })
      .filter(function (s) { return s.length >= MANUAL.segMinLen; });

    const found = [];
    segs.forEach(function (seg, i) {
      const d = manualDecode(seg);
      if (d) found.push({ label: '第 ' + (i + 1) + ' 段', text: d.text, rounds: d.rounds, lossy: d.lossy });
    });
    if (found.length) return { ok: true, segments: found, partial: true };

    return { ok: false, reason: 'not-b64' };
  }

  // ---------- 手动解码：悬浮面板 UI（Shadow DOM 隔离，避免被站点主题污染） ----------
  function mountPanel() {
    if (!document.body) return;
    if (document.getElementById(UI_HOST_ID)) return;

    const host = document.createElement('div');
    host.id = UI_HOST_ID;
    host.setAttribute('data-ldb64-ui', '1');
    host.style.cssText = 'position:fixed;right:20px;bottom:20px;width:0;height:0;z-index:2147483000;';
    const shadow = host.attachShadow({ mode: 'open' });

    const uiStyle = document.createElement('style');
    uiStyle.textContent = [
      ':host { all: initial; }',
      '.root, .root * { box-sizing: border-box; }',
      '.root {',
      '  --bg: #FAFBFC; --fg: #22262C; --fg-2: #666F7A; --fg-3: #98A1AC;',
      '  --line: rgba(34,38,44,.12); --field: #F1F3F5; --field-line: rgba(34,38,44,.16);',
      '  --btn: #22262C; --btn-fg: #FFFFFF; --btn-2: rgba(34,38,44,.05); --btn-2-line: rgba(34,38,44,.14);',
      '  --ok: #4EA65B; --warn: #C99A2E; --err: #C8554C;',
      '  --fab-bg: #22262C; --fab-fg: #FFFFFF;',
      '  --shadow: 0 18px 48px -14px rgba(16,20,26,.34), 0 2px 6px rgba(16,20,26,.12);',
      '  --panel-w: 396px; --row-h: 46px; --panel-h: 460px;',   /* --panel-h：所有看板统一的固定高度（挂载后按实际内容量出真值写回） */
'  position: absolute; right: 0; bottom: 0; color: var(--fg);',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", "PingFang SC", "Microsoft YaHei UI", "Hiragino Sans GB", sans-serif;',
      '}',
      '@media (prefers-color-scheme: dark) {',
      '  .root {',
      '    --bg: #14171C; --fg: #E9ECEF; --fg-2: #99A2AD; --fg-3: #6E7883;',
      '    --line: rgba(233,236,239,.13); --field: #1B1F26; --field-line: rgba(233,236,239,.16);',
      '    --btn: #E9ECEF; --btn-fg: #14171C; --btn-2: rgba(233,236,239,.06); --btn-2-line: rgba(233,236,239,.14);',
      '    --ok: #5EC26A; --warn: #E0B341; --err: #E0685F;',
      '    --fab-bg: #E9ECEF; --fab-fg: #14171C;',
      '    --shadow: 0 18px 48px -14px rgba(0,0,0,.62), 0 2px 6px rgba(0,0,0,.4);',
      '  }',
      '}',
      ':host-context(html.dark) .root, :host-context(body.dark) .root {',
      '  --bg: #14171C; --fg: #E9ECEF; --fg-2: #99A2AD; --fg-3: #6E7883;',
      '  --line: rgba(233,236,239,.13); --field: #1B1F26; --field-line: rgba(233,236,239,.16);',
      '  --btn: #E9ECEF; --btn-fg: #14171C; --btn-2: rgba(233,236,239,.06); --btn-2-line: rgba(233,236,239,.14);',
      '  --ok: #5EC26A; --warn: #E0B341; --err: #E0685F;',
      '  --fab-bg: #E9ECEF; --fab-fg: #14171C;',
      '  --shadow: 0 18px 48px -14px rgba(0,0,0,.62), 0 2px 6px rgba(0,0,0,.4);',
      '}',
      '.fab {',
      '  position: absolute; right: 0; bottom: 0; width: 44px; height: 44px; padding: 0; border: 0;',
      '  border-radius: 50%; cursor: pointer; background: var(--fab-bg); color: var(--fab-fg);',
      '  display: grid; place-items: center; box-shadow: 0 6px 18px -6px rgba(16,20,26,.45);',
      '  transition: transform .16s cubic-bezier(.2,.8,.2,1);',
      '  touch-action: none; user-select: none; -webkit-user-select: none;',
      '}',
      '.fab:hover { transform: translateY(-1px) scale(1.03); }',
      '.root.dragging .fab { transform: scale(1.06); cursor: grabbing; }',
      '.fab .mk { display: grid; grid-template-columns: 5px 5px; gap: 3.5px; }',
      '.fab .mk i { display: block; width: 5px; height: 5px; border-radius: 1.5px; background: currentColor; transition: opacity .16s ease; }',
      '.fab.active .mk i { opacity: .45; }',
      '.panel {',
      '  position: absolute; bottom: 54px; right: 0; width: var(--panel-w); max-width: calc(100vw - 32px);',
      '  background: var(--bg); border: 1px solid var(--line); border-radius: 14px;',
      '  box-shadow: var(--shadow); display: flex; flex-direction: column;',
      '  height: min(var(--panel-h, 460px), calc(100vh - 72px)); max-height: calc(100vh - 72px); overflow: hidden;',
      '}',
      '.panel[hidden] { display: none; }',
      '.panel:not([hidden]) { animation: kit-in .2s cubic-bezier(.16,1,.3,1); }',
'@keyframes kit-in { from { opacity: 0; } to { opacity: 1; } }',
      '  .phead { flex: none; display: flex; align-items: center; gap: 6px; min-height: var(--row-h); padding: 0 8px 0 4px; border-radius: 13px 13px 0 0; }',
'  .phead[data-act="back"] { cursor: pointer; transition: background .14s ease; }',
'  .phead[data-act="back"]:hover { background: var(--btn-2); }',
'  .brand { flex: 1; display: flex; align-items: center; gap: 7px; padding-left: 8px; font-size: 13px; font-weight: 600; letter-spacing: .01em; }',
'  .brand::before { content: ""; width: 3px; height: 13px; border-radius: 2px; background: currentColor; opacity: .75; }',
'  .back { appearance: none; flex: none; width: 28px; height: 28px; border: 0; border-radius: 7px; background: transparent; color: var(--fg-2); font-size: 15px; line-height: 1; display: grid; place-items: center; cursor: pointer; transition: background .14s ease, color .14s ease; }',
'  .back:hover { background: var(--btn-2); color: var(--fg); }',
'  .back:focus-visible { outline: 2px solid var(--fg); outline-offset: -2px; }',
'  .ptitle { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; letter-spacing: .01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
'  .phead .sw { flex: none; margin-right: 2px; }',
'  .brand[hidden], .ptitle[hidden], .back[hidden], .psw[hidden] { display: none; }',
      '.xbtn {',
      '  appearance: none; border: 0; background: transparent; color: var(--fg-2);',
      '  width: 24px; height: 24px; border-radius: 6px; cursor: pointer; font-size: 12px; line-height: 1;',
      '  display: grid; place-items: center; transition: background .14s ease, color .14s ease;',
      '}',
      '.xbtn:hover { background: var(--btn-2); color: var(--fg); }',
      '  .mods { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; border-top: 1px solid var(--line); display: flex; flex-direction: column; }',
'  .mods[hidden] { display: none; }',
'  .view { position: relative; border-bottom: 1px solid var(--line); }',
'  .view:last-child { border-bottom: 0; }',
'  .view[hidden] { display: none; }',
'  .svc { position: relative; display: flex; align-items: center; height: var(--row-h); padding-right: 10px; transition: background .14s ease; }',
'  .svc:hover { background: var(--btn-2); }',
'  .svc:active { background: var(--btn-2-line); }',
'  .view.active .svc::before { content: ""; position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px; border-radius: 0 3px 3px 0; background: var(--accent, #3B82F6); }',
'  .tab { appearance: none; font: inherit; flex: 1; min-width: 0; height: 100%; padding: 0 6px 0 12px; border: 0; background: transparent; color: var(--fg); display: flex; align-items: center; gap: 9px; text-align: left; cursor: pointer; transition: color .14s ease; }',
'  .tab:focus-visible { outline: 2px solid var(--fg); outline-offset: -2px; border-radius: 8px; }',
'  .ico { flex: none; width: 18px; height: 18px; display: grid; place-items: center; color: var(--fg-3); transition: color .16s ease; }',
'  .ico svg { display: block; width: 18px; height: 18px; }',
'  .tab:hover .ico { color: var(--fg-2); }',
'  .view.active .ico { color: var(--accent, #3B82F6); }',
'  .svc-name { flex: 1; min-width: 0; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
'  .tab .kit-dot { flex: none; }',
'  .tab .cbtn-a { flex: none; width: 12px; text-align: center; font-size: 12px; color: var(--fg-3); transition: color .14s ease; }',
'  .view.active .cbtn-a { color: var(--fg-2); }',
      '  .subs { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }',
'  .subs[hidden] { display: none; }',
      '  .svc-cfg { overflow: visible; min-height: 0; padding: 0 12px 12px; border-top: 1px solid var(--line); background: var(--btn-2); }',
'  .svc-cfg[hidden] { display: none; }',
'  .svc-sec { display: flex; align-items: center; gap: 7px; margin: 0; padding: 9px 0 6px; font-size: 10.5px; font-weight: 600; letter-spacing: .06em; color: var(--fg-3); }',
'  .svc-sec::after { content: ""; flex: 1; height: 1px; background: var(--line); }',
'  .svc-cfg .rb-grid { margin-top: 0; }',
      '.sw { position: relative; flex: none; width: 34px; height: 19px; }',
      '.sw input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }',
      '.sw i { position: absolute; inset: 0; border-radius: 999px; background: var(--btn-2); box-shadow: inset 0 0 0 1px var(--btn-2-line); transition: background .16s ease, box-shadow .16s ease; }',
      '.sw i::after { content: ""; position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: var(--bg); box-shadow: 0 1px 2px rgba(0,0,0,.28); transition: transform .16s cubic-bezier(.2,.8,.2,1); }',
      '.sw input:checked + i { background: var(--ok); box-shadow: inset 0 0 0 1px transparent; }',
      '.sw input:checked + i::after { transform: translateX(15px); }',
      '.sw input:focus-visible + i { box-shadow: inset 0 0 0 1px var(--btn-2-line), 0 0 0 3px rgba(78,166,91,.3); }',
      '.sect { border-top: 1px solid var(--line); }',
      '.sect-h { display: flex; align-items: center; gap: 7px; margin: 0; padding: 10px 12px 2px; font-size: 12px; font-weight: 600; color: var(--fg-2); }',
      '.kit-dot { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--fg-3); }',
      '.kit-dot.on { background: var(--ok); }',
      '.kit-dot.pause { background: var(--warn); }',
      '.kit-dot.off { background: var(--err); }',
      '.kit-dot.run { background: #3B82F6; box-shadow: 0 0 0 2px rgba(59,130,246,.25); }',
      '.kit-dot.warn { background: var(--warn); }',
      '.kit-dot.err { background: var(--err); }',
      '@keyframes kit-ok { from { box-shadow: 0 0 0 0 rgba(94,194,106,.55); } to { box-shadow: 0 0 0 10px rgba(94,194,106,0); } }',
      '@keyframes kit-bad { from { box-shadow: 0 0 0 0 rgba(224,104,95,.55); } to { box-shadow: 0 0 0 10px rgba(224,104,95,0); } }',
      '.kit-flash-ok { animation: kit-ok .7s ease-out; }',
      '.kit-flash-bad { animation: kit-bad .7s ease-out; }',
      '.ar-status, .rb-status, .cf-status, .ou-status { white-space: pre-line; padding: 0 12px 10px; font-size: 12px; line-height: 1.55; color: var(--fg-2); max-height: 104px; overflow: auto; }',
      '.rb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }',
      '.rb-grid label { display: flex; flex-direction: column; font-size: 10.5px; color: var(--fg-2); gap: 2px; }',
      '.rb-grid label.wide { grid-column: 1 / -1; }',
      '.rb-grid label.rb-chk { flex-direction: row; align-items: center; gap: 5px; }',
      '.rb-grid label.rb-chk input { width: 13px; height: 13px; margin: 0; accent-color: var(--ok); }',
      '.rb-grid input, .rb-grid select { border-radius: 6px; border: 1px solid var(--field-line); background: var(--field); color: var(--fg); padding: 3px 6px; font-size: 11px; font-family: inherit; }',
      '.rb-grid input:focus, .rb-grid select:focus { border-color: var(--fg-2); outline: none; }',
      '.pfoot { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 9px 12px 10px; border-top: 1px solid var(--line); }',
      '.pfoot .hint { flex: 1; }',
      '.pfoot .about { flex: 1 1 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 5px 10px; margin-top: 3px; font-size: 10.5px; line-height: 1.5; color: var(--fg-3); }',
      '.pfoot .about .ab-name { font-weight: 600; color: var(--fg-2); }',
      '.pfoot .about a.ab-link { color: var(--accent, #3B82F6); text-decoration: none; border-bottom: 1px dotted currentColor; }',
      '.pfoot .about a.ab-link:hover { text-decoration: underline; }',
      '.pfoot .about .ab-note { flex: 1 1 100%; }',
      '.mini.active { border-color: var(--ok); color: var(--ok); }',
      '.pad { padding: 8px 12px 11px; display: flex; flex-direction: column; gap: 8px; }',
      '.row-btns { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }',
      '.mini, .go {',
      '  appearance: none; font: inherit; font-size: 12px; line-height: 1.3; cursor: pointer;',
      '  border-radius: 7px; padding: 4px 10px; border: 1px solid var(--btn-2-line);',
      '  background: var(--btn-2); color: var(--fg);',
      '  transition: background .14s ease, border-color .14s ease, opacity .14s ease;',
      '}',
      '.mini:hover { background: var(--btn-2-line); }',
      '.mini[disabled] { opacity: .4; cursor: default; }',
      '.go { font-weight: 600; border-color: transparent; background: var(--btn); color: var(--btn-fg); padding: 5px 13px; }',
      '.go:hover { opacity: .88; }',
      '.mini:focus-visible, .go:focus-visible, .xbtn:focus-visible, .ta:focus-visible { outline: 2px solid var(--fg); outline-offset: 1px; }',
      '.hint { font-size: 11px; color: var(--fg-3); }',
      '.ta {',
      '  width: 100%; min-height: 74px; max-height: 170px; resize: vertical; padding: 9px 10px;',
      '  border-radius: 8px; border: 1px solid var(--field-line); background: var(--field); color: var(--fg);',
      '  font-family: ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace;',
      '  font-size: 12px; line-height: 1.55; word-break: break-all; outline: none;',
      '}',
      '.ta::placeholder { color: var(--fg-3); }',
      '.ta:focus { border-color: var(--fg-2); }',
      '.out { display: flex; flex-direction: column; gap: 6px; max-height: 210px; overflow: auto; }',
      '.out[hidden] { display: none; }',
      '.seg { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--field); }',
      '.seg-hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 4px 3px 8px; border-bottom: 1px solid var(--line); }',
      '.seg-tag { font-family: ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace; font-size: 10.5px; color: var(--fg-3); }',
      '.seg-body { padding: 8px 9px; font-family: ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace; font-size: 12px; line-height: 1.55; white-space: pre-wrap; word-break: break-all; color: var(--fg); }',
      '.seg-body a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }',
      '.err { padding: 8px 9px; border-radius: 8px; font-size: 12px; line-height: 1.5; color: var(--err); border: 1px dashed; }',
'/* 悬浮球上的进度环 + 数字徽标（不用展开面板就能看到进度） */',
      '.fab .ring { position: absolute; inset: -3px; border-radius: 50%; pointer-events: none; opacity: 0;',
      '  background: conic-gradient(var(--ring, #3B82F6) var(--p, 0%), rgba(127,127,127,.26) 0);',
      '  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));',
      '  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));',
      '  transition: opacity .2s ease; }',
      '.fab.has-pct .ring { opacity: 1; }',
      '.fab .pct { position: absolute; left: 50%; bottom: -17px; transform: translateX(-50%);',
      '  font: 600 9.5px/1 ui-monospace, "Cascadia Code", Consolas, monospace; letter-spacing: .02em;',
      '  padding: 2px 5px; border-radius: 6px; background: var(--fab-bg); color: var(--fab-fg);',
      '  box-shadow: 0 1px 3px rgba(0,0,0,.22); white-space: nowrap; }',
      '.fab .pct[hidden] { display: none; }',
'/* 子面板内部：参数与进度同框，内容超高时在面板内滚动 */',
'.svc-cfg .pad { padding: 0 0 4px; gap: 6px; }',
'.svc-cfg .row-btns { gap: 5px; }',
'.svc-cfg .hint { line-height: 1.5; }',
'@media (prefers-reduced-motion: reduce) {',
'  .panel:not([hidden]) { animation: none; }',
'  .fab, .sw i, .sw i::after, .mini, .go, .xbtn, .svc, .tab, .cbtn-a, .fab .ring, .ico { transition: none; }',
'}',
    ].join('\n');
    shadow.appendChild(uiStyle);

    const root = document.createElement('div');
    root.className = 'root';
    root.innerHTML = [
      '<button type="button" class="fab" title="LINUX DO 工具箱：鼠标悬停展开面板，按住可拖动位置">',
      '<span class="ring" aria-hidden="true"></span>',
      '<span class="mk"><i></i><i></i><i></i><i></i></span>',
      '<span class="pct" hidden></span>',
      '</button>',
      '<div class="panel" hidden>',
      '<header class="phead">',
      '<button type="button" class="back" data-act="back" title="返回全部功能（Esc）" hidden>‹</button>',
      '<span class="brand">LINUX DO 工具箱</span>',
      '<span class="ptitle" hidden></span>',
      '<span class="psw" hidden></span>',
      '<button type="button" class="xbtn" data-act="close" title="关闭（Esc）">✕</button>',
      '</header>',
      '<div class="mods" id="kit-flags"></div>',
      '<div class="subs" id="kit-subs" hidden></div>',
      '<div class="pfoot">',
      '<button type="button" class="mini" data-cfg-reset-all="1" title="把七个功能的参数全部恢复为出厂默认值">一键全默认</button>',
      '<span class="hint">参数改动即时生效，不用刷新</span>',
      '<div class="about">',
      '<span class="ab-name">LINUX DO 工具箱 v2.7.0</span>',
      '<a class="ab-link" href="https://github.com/hawchou1995/linuxdo-toolbox" target="_blank" rel="noopener noreferrer">GitHub 仓库</a>',
      '<a class="ab-link" href="https://qingju.me/" target="_blank" rel="noopener noreferrer">qingju.me 论坛</a>',
      '<span class="ab-note">源码开源 · 欢迎来青橘（qingju.me）一起折腾</span>',
      '</div>',
      '</div>',
      '</div>'
    ].join('\n');
    shadow.appendChild(root);

    const fab = root.querySelector('.fab');
    const panel = root.querySelector('.panel');
    let ta = null, out = null;                  // 手动解码框在「密文自解」页里，视图建好后再取

    let timer = null;

    // ---- 位置记忆 ----
    function applyPos(pos) {
      if (!pos || typeof pos.left !== 'number' || typeof pos.top !== 'number') return false;
      const w = window.innerWidth, h = window.innerHeight;
      const left = Math.max(4, Math.min(w - 60, pos.left));
      const top = Math.max(4, Math.min(h - 60, pos.top));
      host.style.left = left + 'px';
      host.style.top = top + 'px';
      host.style.right = 'auto';
      host.style.bottom = 'auto';
      return true;
    }
    function savePos() {
      try {
        const r = host.getBoundingClientRect();
        localStorage.setItem(UI_POS_KEY, JSON.stringify({ left: r.left, top: r.top }));
      } catch (e) { /* ignore */ }
    }
    try { applyPos(JSON.parse(localStorage.getItem(UI_POS_KEY) || 'null')); } catch (e) { /* ignore */ }

    // ---- 面板开合（悬浮展开 / 折叠 + 指针宽限） ----
    const HOVER_OPEN_MS = 90;      // 悬停到图标后多久展开：防「鼠标划过去」误弹
    const HOVER_CLOSE_MS = 280;    // 离开图标后的宽限：够把指针挪进面板
    const PANEL_CLOSE_MS = 180;    // 离开面板后的宽限：够把指针挪回图标
    const canHover = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
    let drag = null;               // 拖动状态：悬浮逻辑全程避让它
    let hoverOpenTimer = null;
    let hoverCloseTimer = null;

    function alignPanel() {
      const r = host.getBoundingClientRect();
      panel.style.width = '';                    // 宽度交给 --panel-w：面板与子面板宽度统一
      const w = panel.offsetWidth || 356;        // 这里只决定往左伸还是往右伸
      if (r.left < w) { panel.style.left = '0'; panel.style.right = 'auto'; }
      else { panel.style.right = '0'; panel.style.left = 'auto'; }

    }
    // ---- 统一尺寸：所有看板（主看板 + 七个子看板）用同一个固定高度 ----
    // 面板贴在右下角，顶边会随内容高度上下移动：点最上面那一行切到矮的子看板时，面板变矮、顶边下移，
    // 指针就落到面板外了 —— 浏览器随即给面板一个 mouseleave，悬浮逻辑判定「指针离开」→ 面板自动折叠。
    // 所以先量一次「最高那块看板」的自然高度（同步块里量、量完立刻还原，不会闪一下），
    // 写进 --panel-h；此后无论切到哪一级、哪个功能，面板宽高都不变，指针不会因几何变化被判为离开。
    function syncBoardHeight() {
      if (!flagsBox || !subsBox) return 0;
      const prev = {
        hidden: panel.hidden, vis: panel.style.visibility, h: panel.style.height,
        maxH: panel.style.maxHeight, flags: flagsBox.hidden, subs: subsBox.hidden
      };
      const bodies = [];
      root.querySelectorAll('[data-cfg-panel]').forEach(function (b) { bodies.push(b.hidden); b.hidden = true; });
      panel.hidden = false;
      panel.style.visibility = 'hidden';                 // 有布局、但这一帧不可见
      panel.style.height = 'auto';                       // 先解掉固定高度，量自然高度
      panel.style.maxHeight = 'none';
      let max = 0;
      flagsBox.hidden = false; subsBox.hidden = true;    // 主看板
      max = Math.max(max, panel.getBoundingClientRect().height);
      flagsBox.hidden = true; subsBox.hidden = false;    // 七个子看板，逐个量
      root.querySelectorAll('[data-cfg-panel]').forEach(function (b) {
        b.hidden = false;
        max = Math.max(max, panel.getBoundingClientRect().height);
        b.hidden = true;
      });
      root.querySelectorAll('[data-cfg-panel]').forEach(function (b, i) { b.hidden = bodies[i]; });
      flagsBox.hidden = prev.flags; subsBox.hidden = prev.subs;
      panel.style.height = prev.h; panel.style.maxHeight = prev.maxH; panel.style.visibility = prev.vis;
      panel.hidden = prev.hidden;
      const h = Math.ceil(max);
      if (h > 0) panel.style.setProperty('--panel-h', h + 'px');
      return h;
    }
    function openPanel(focusInput) {
      alignPanel();
      syncBoardHeight();                         // 每次打开前重量一次：内容变了也保持「所有看板一样高」
      panel.hidden = false;
      fab.classList.add('active');
      if (focusInput) setTimeout(function () { try { ta.focus(); } catch (e) { /* ignore */ } }, 30);
    }
    function closePanel() {
      if (hoverOpenTimer) { clearTimeout(hoverOpenTimer); hoverOpenTimer = null; }
      if (hoverCloseTimer) { clearTimeout(hoverCloseTimer); hoverCloseTimer = null; }
      panel.hidden = true;
      fab.classList.remove('active');
      if (timer) { clearTimeout(timer); timer = null; }
    }

    // 指针是否还压在图标或面板上：显式状态为准，:hover 只做兜底（防状态卡住）
    let overFab = false, overPanel = false;
    function pointerOnUi() {
      return overFab || overPanel || fab.matches(':hover') || panel.matches(':hover');
    }
    function cancelHoverClose() {
      if (hoverCloseTimer) { clearTimeout(hoverCloseTimer); hoverCloseTimer = null; }
    }
    function scheduleHoverClose(delay) {
      cancelHoverClose();
      hoverCloseTimer = setTimeout(function () {
        hoverCloseTimer = null;
        if (drag) return;                        // 拖动中不插手
        if (pointerOnUi()) return;               // 指针还在图标或面板上
        if (panel.hidden) return;
        const ae = shadow.activeElement;         // 焦点还在面板里（正在输入）：不自动收起
        if (ae && panel.contains(ae)) return;
        closePanel();
      }, delay);
    }
    function hoverEnterFab() {
      if (!canHover || drag) return;
      if (hoverOpenTimer) clearTimeout(hoverOpenTimer);
      cancelHoverClose();
      hoverOpenTimer = setTimeout(function () {
        hoverOpenTimer = null;
        if (drag || !panel.hidden) return;
        openPanel(false);                        // 悬浮展开不抢输入焦点
      }, HOVER_OPEN_MS);
    }
    function hoverLeaveFab() {
      if (!canHover || drag) return;
      if (hoverOpenTimer) { clearTimeout(hoverOpenTimer); hoverOpenTimer = null; }
      scheduleHoverClose(HOVER_CLOSE_MS);
    }

    // ---- 结果渲染 ----
    function renderResult(res) {
      out.textContent = '';
      out.hidden = false;
      if (!res.ok) {
        const err = document.createElement('div');
        err.className = 'err';
        err.textContent = res.reason === 'empty'
          ? '请输入要解码的内容。'
          : '未能解码：这不是有效的 Base64，或解码结果不是可读文本。';
        out.appendChild(err);
        return;
      }
      res.segments.forEach(function (seg) {
        const box = document.createElement('div');
        box.className = 'seg';

        const hd = document.createElement('div');
        hd.className = 'seg-hd';
        const tag = document.createElement('span');
        tag.className = 'seg-tag';
        tag.textContent = seg.label
          + (seg.rounds > 1 ? '（连续解码 ' + seg.rounds + ' 层）' : '')
          + (seg.lossy ? '（非 UTF-8，可能有乱码）' : '');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mini';
        btn.textContent = '📋 复制';
        btn.addEventListener('click', function () {
          Promise.resolve(copyText(seg.text)).then(function (r) {
            const ok = !!(r && r.ok);
            btn.textContent = ok ? '✅ 已复制' : '⚠️ 复制失败';
            setTimeout(function () { btn.textContent = '📋 复制'; }, 1200);
          });
        });
        hd.appendChild(tag);
        hd.appendChild(btn);

        const body = document.createElement('div');
        body.className = 'seg-body';
        const trimmed = seg.text.trim();
        if (CFG.makeLinks && URL_RE.test(trimmed)) {
          const a = document.createElement('a');
          a.href = trimmed;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = seg.text;
          body.appendChild(a);
        } else {
          body.textContent = seg.text;
        }

        box.appendChild(hd);
        box.appendChild(body);
        out.appendChild(box);
      });
    }

    function runDecode() {
      if (timer) { clearTimeout(timer); timer = null; }
      const val = ta.value;
      if (!val.trim()) { out.hidden = true; out.textContent = ''; return; }
      renderResult(decodeManualInput(val));
    }
    function scheduleDecode() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(runDecode, CFG.debounceMs);
    }

    // ---- 事件 ----
    shadow.addEventListener('click', function (e) {
      const el = e.target;
      // 主看板：点一行 = 进它的子看板（子看板里看不到其他功能）
      const rowEl = el && el.closest ? el.closest('[data-tab],[data-cfg-toggle]') : null;
      if (rowEl) {
        const rid = rowEl.getAttribute('data-tab') || rowEl.getAttribute('data-cfg-toggle');
        if (rid) { enterSub(rid); return; }
      }
      // 保存 / 恢复默认 / 一键全默认
      const cfgEl = el && el.closest ? el.closest('[data-cfg-save],[data-cfg-reset],[data-cfg-reset-all]') : null;
      if (cfgEl) {
        if (cfgEl.hasAttribute('data-cfg-reset-all')) {
          for (const mid in PARAM_DEFS) resetParams(mid);
          syncParamInputs();
          flashText(cfgEl, '已全部默认');
          return;
        }
        const sId = cfgEl.getAttribute('data-cfg-save');
        if (sId) {
          const patch = {};
          root.querySelectorAll('[data-cfg-mod="' + sId + '"]').forEach(function (inp) {
            const k = inp.getAttribute('data-cfg-key');
            if (!k) return;
            if (inp.type === 'checkbox') patch[k] = !!inp.checked;
            else if (inp.type === 'number') {
              const v = parseInt(inp.value, 10);
              if (!isNaN(v)) patch[k] = v;
            } else patch[k] = String(inp.value == null ? '' : inp.value);
          });
          saveParams(sId, patch);
          flashText(cfgEl, '已保存');
          return;
        }
        const rId = cfgEl.getAttribute('data-cfg-reset');
        if (rId) {
          resetParams(rId);
          flashText(cfgEl, '已默认');            // 反馈就地写在按钮上（按钮文字临时变身）
          return;
        }
      }
      const btn = el && el.closest ? el.closest('[data-act]') : null;
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      if (act === 'back') {                                  // 子看板：点标题条 /「‹ 返回」= 回主看板
        if (el.closest && el.closest('.sw')) return;         // 标题条右端的开关不算「返回」
        backToMain();
        return;
      }
      if (act === 'ar-pause') { if (KitUI.arPause) KitUI.arPause(); return; }
      if (act === 'ar-resume') { if (KitUI.arResume) KitUI.arResume(); return; }
      if (act === 'ar-cd') { if (KitUI.arClearCd) KitUI.arClearCd(); return; }
      if (act === 'cf-jump') { if (KitUI.cfJump) KitUI.cfJump(); return; }
      if (act === 'cf-reset') { if (KitUI.cfResetGuard) KitUI.cfResetGuard(); return; }
      if (act === 'ou-clear') { if (KitUI.ouClear) KitUI.ouClear(); return; }
      if (act === 'rb-forget') {
        if (KitUI.rbForget && KitUI.rbForget()) {
          if (KitUI.rbReady) KitUI.rbReady();
          KitUI.setRbStatus('已清空本话题的进度记忆，可从 1 楼重刷', 2600);
        } else {
          KitUI.setRbStatus('不在话题页，没有可清空的进度', 2600);
        }
        return;
      }
      if (act === 'rb-start') { if (KitUI.rbStart) KitUI.rbStart(); return; }
      if (act === 'rb-stop') { if (KitUI.rbStop) KitUI.rbStop(); return; }
      if (act === 'rb-from') { if (KitUI.rbToggleFrom) KitUI.rbToggleFrom(); return; }
      if (act === 'rb-auto') { if (KitUI.rbToggleAuto) KitUI.rbToggleAuto(); return; }
      if (act === 'close') { closePanel(); }
      else if (act === 'clear') { ta.value = ''; out.hidden = true; out.textContent = ''; try { ta.focus(); } catch (err) { /* ignore */ } }
      else if (act === 'decode') { runDecode(); }
      else if (act === 'demo') { ta.value = 'aHR0cHM6Ly9saW51eC5kby90LzI5NDc1OTQ='; runDecode(); }
      else if (act === 'paste') {
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function (t) {
              if (t) { ta.value = t; runDecode(); } else { try { ta.focus(); } catch (err) { /* ignore */ } }
            }, function () { try { ta.focus(); } catch (err) { /* ignore */ } });
          } else { try { ta.focus(); } catch (err) { /* ignore */ } }
        } catch (err) { /* ignore */ }
      }
    });

    shadow.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); if (level === 'sub') { backToMain(); return; } closePanel(); return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        runDecode();
      }
    });

    // ---- 标签栏 + 每功能独立视图（见上：showTab 之后取手动解码元件） ----

    // ---- 一个功能一页：标签栏 + 每功能独立视图（开关 / 参数 / 状态 / 动作都在各自页里） ----
    const VIEW_HTML = {
      b64: [
        '<div class="pad">',
        '<textarea class="ta" rows="4" spellcheck="false" placeholder="粘贴 Base64：可被空格换行拆散、夹带说明文字、带引号或代码围栏"></textarea>',
        '<div class="row-btns">',
        '<button type="button" class="go" data-act="decode">解码</button>',
        '<button type="button" class="mini" data-act="paste">粘贴</button>',
        '<button type="button" class="mini" data-act="demo">示例</button>',
        '<button type="button" class="mini" data-act="clear">清空</button>',
        '<span class="hint">输入即解码，Ctrl+Enter 立即</span>',
        '</div>',
        '<div class="out" hidden></div>',
        '</div>'
      ].join('\n'),
      mdCopy: '<div class="pad"><p class="hint">每层的操作栏会长出一个「复制 Markdown」按钮：取 /raw/ 原文，带标题、楼层与转载来源。</p></div>',
      linkUnlock: '<div class="pad"><p class="hint">外链不再被换成登录跳转；点击强制新标签页打开，也不会弹站点提示。</p></div>',
      autoReact: [
        '<div class="ar-status">打开任意话题页后开始跟随</div>',
        '<div class="pad"><div class="row-btns">',
        '<button type="button" class="mini" data-act="ar-pause">暂停</button>',
        '<button type="button" class="mini" data-act="ar-resume">继续</button>',
        '<button type="button" class="mini" data-act="ar-cd">解除冷却</button>',
        '</div></div>'
      ].join('\n'),
      readBoost: [
        '<div class="rb-status">打开任意话题页后可提速</div>',
        '<div class="pad"><div class="row-btns">',
        '<button type="button" class="go" data-act="rb-start">开始提速</button>',
        '<button type="button" class="mini" data-act="rb-stop">停止</button>',
        '<button type="button" class="mini" data-act="rb-from">从第 1 楼</button>',
        '<button type="button" class="mini" data-act="rb-auto">自动: 关</button>',
        '<button type="button" class="mini" data-act="rb-forget">清空进度</button>',
        '</div></div>'
      ].join('\n'),
      cfShield: [
        '<div class="cf-status">打开任意话题页后可过盾</div>',
        '<div class="pad"><div class="row-btns">',
        '<button type="button" class="go" data-act="cf-jump">立即跳转</button>',
        '<button type="button" class="mini" data-act="cf-reset">重置记录</button>',
        '</div></div>'
      ].join('\n'),
      onlyUser: [
        '<div class="ou-status">打开任意话题页后可一键只看某人</div>',
        '<div class="pad"><div class="row-btns">',
        '<button type="button" class="mini" data-act="ou-clear">显示全部</button>',
        '</div><p class="hint">每层楼的用户名右侧会多出一个「只看此人」按钮：点它只列该用户的帖子（楼主帖恒在首位）；点上方原生的「显示全部」或这里的按钮即还原。官方入口藏在用户卡片里，且只发过 1 帖的用户根本点不出筛选 —— 本功能照给。</p></div>'
      ].join('\n')
    };

    // ---- 七个功能的内联图标（描边 SVG，随主题与状态色变化；不引图标字体 / CDN） ----
    const ICONS = {
      b64: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.4" width="15" height="9.6" rx="2.6"/><path d="M8.2 10.4V8.2a3.8 3.8 0 0 1 7.2-1.9"/><circle cx="12" cy="15.2" r="1.1" fill="currentColor" stroke="none"/></svg>',
      mdCopy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.4"/><path d="M15.4 5.5H6.6a2.4 2.4 0 0 0-2.4 2.4v8.8"/></svg>',
      linkUnlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.5H7a2 2 0 0 0-2 2V17a2 2 0 0 0 2 2h9.4a2 2 0 0 0 2-2v-3.6"/><path d="M14.6 4.6h4.9v4.9"/><path d="m19.5 4.6-7 7"/></svg>',
      autoReact: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19.4S4.6 14.8 4.6 10a4 4 0 0 1 7.4-2.4A4 4 0 0 1 19.4 10c0 4.8-7.4 9.4-7.4 9.4Z"/></svg>',
      readBoost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13.2 3.4 6.6 13h4.2l-.9 7.6L17.4 11h-4.3z"/></svg>',
      cfShield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6 5.6 6.4v5.1c0 4.1 2.7 7.3 6.4 8.9 3.7-1.6 6.4-4.8 6.4-8.9V6.4z"/><path d="m9.6 11.9 1.8 1.8 3.3-3.4"/></svg>',
      onlyUser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.7" cy="10" r="5.2"/><path d="m14.7 14 4.3 4.3"/><path d="M8.5 10.6a2.6 2.6 0 0 1 2.5-2.3"/></svg>'
    };
    // 子面板下半段的标题：有的功能叫「进度」，有的只是「状态」
    const SEC2 = { b64: '解码', mdCopy: '用法', linkUnlock: '说明', autoReact: '状态', readBoost: '进度', cfShield: '状态', onlyUser: '状态' };

    const flagsBox = root.querySelector('#kit-flags');      // 主看板：七行清单
    const subsBox = root.querySelector('#kit-subs');        // 子看板：七个功能各自的内容
    const dots = {};                      // 功能 id → 它那一枚指示灯
    const rows = {};                      // 功能 id → 它的行（把状态色写到 --accent）
    const switches = {};                  // 功能 id → 它那枚开关（进子看板时搬到标题条右端）
    const DOT_COLOR = { on: 'var(--ok)', off: 'var(--err)', pause: 'var(--warn)', run: '#3B82F6', warn: 'var(--warn)', err: 'var(--err)' };
    function paintDot(id, cls) {
      const k = 'kit-dot ' + (cls || 'on');
      (dots[id] || []).forEach(function (el) { el.className = k; });
      const r = rows[id];
      if (r) r.style.setProperty('--accent', DOT_COLOR[cls] || DOT_COLOR.on);
    }
    KitUI.onDot = paintDot;

    if (flagsBox) {
      FLAG_DEFS.forEach(function (def) {
        // 竖排清单的一行：图标 + 四字功能名 + 状态点 + 折叠箭头，右侧是功能开关
        const view = document.createElement('section');
        view.className = 'view';
        view.setAttribute('data-view', def.id);
        view.setAttribute('role', 'tabpanel');
        view.setAttribute('aria-label', def.label);

        const row = document.createElement('div');
        row.className = 'svc';
        row.title = def.hint;
        rows[def.id] = row;

        const head = document.createElement('button');
        head.type = 'button';
        head.className = 'tab';
        head.setAttribute('data-tab', def.id);
        head.setAttribute('data-cfg-toggle', def.id);   // 兼容旧钩子：它同时就是「展开这一行」的开关
        head.setAttribute('role', 'tab');
        head.setAttribute('aria-selected', 'false');
        head.setAttribute('aria-expanded', 'false');
        head.setAttribute('aria-controls', 'kit-cfg-' + def.id);
        head.title = '展开「' + def.label + '」的参数与进度';

        const ico = document.createElement('span');
        ico.className = 'ico';
        ico.setAttribute('aria-hidden', 'true');
        ico.innerHTML = ICONS[def.id] || '';

        const nameEl = document.createElement('span');
        nameEl.className = 'svc-name tab-name';
        nameEl.textContent = def.label;

        const dot = document.createElement('span');
        dot.className = 'kit-dot';
        dot.setAttribute('data-dot', def.id);
        dot.setAttribute('data-tab-dot', def.id);
        (dots[def.id] = dots[def.id] || []).push(dot);

        const chev = document.createElement('span');
        chev.className = 'cbtn-a';
        chev.setAttribute('aria-hidden', 'true');
        chev.textContent = '›';                                   // 行尾提示：这一行能点进去（子看板）

        head.appendChild(ico);
        head.appendChild(nameEl);
        head.appendChild(dot);
        head.appendChild(chev);

        const sw = document.createElement('span');
        sw.className = 'sw';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.setAttribute('data-flag', def.id);
        cb.title = '开启 / 关闭「' + def.label + '」';
        cb.checked = isOn(def.id);
        const track = document.createElement('i');
        sw.appendChild(cb);
        sw.appendChild(track);

        row.appendChild(head);
        row.appendChild(sw);
        switches[def.id] = sw;                            // 子看板标题条里要搬这一枚开关

        // 子面板：上半是参数设置，下半是这个功能的进度 / 状态与动作 —— 都在同一个面板里
        const box = document.createElement('div');
        box.className = 'svc-cfg';
        box.id = 'kit-cfg-' + def.id;
        box.setAttribute('data-cfg-panel', def.id);
        box.hidden = true;
        box.insertAdjacentHTML('beforeend', '<div class="svc-sec">参数</div>');

        const grid = document.createElement('div');
        grid.className = 'rb-grid';
        (PARAM_DEFS[def.id] || []).forEach(function (pd) {
          const lab = document.createElement('label');
          if (pd.wide) lab.className = 'wide';
          lab.appendChild(document.createTextNode(pd.label));

          let inp;
          if (pd.type === 'select') {
            inp = document.createElement('select');
            (pd.options || []).forEach(function (o) {
              const opt = document.createElement('option');
              opt.value = o.value;
              opt.textContent = o.label;
              inp.appendChild(opt);
            });
          } else {
            inp = document.createElement('input');
          }
          inp.setAttribute('data-cfg', def.id + ':' + pd.key);
          inp.setAttribute('data-cfg-mod', def.id);
          inp.setAttribute('data-cfg-key', pd.key);
          if (pd.type === 'bool') {
            lab.className = (lab.className ? lab.className + ' ' : '') + 'rb-chk';
            inp.type = 'checkbox';
          } else if (pd.type === 'text') {
            inp.type = 'text';
            inp.spellcheck = false;
            inp.setAttribute('autocomplete', 'off');
          } else if (pd.type === 'number') {
            inp.type = 'number';
            if (pd.min !== undefined) inp.min = String(pd.min);
            if (pd.max !== undefined) inp.max = String(pd.max);
            if (pd.step !== undefined) inp.step = String(pd.step);
          }
          lab.appendChild(inp);
          grid.appendChild(lab);
        });
        box.appendChild(grid);

        const btns = document.createElement('div');
        btns.className = 'row-btns';
        btns.style.marginTop = '6px';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'mini';
        saveBtn.setAttribute('data-cfg-save', def.id);
        saveBtn.textContent = '保存参数';
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'mini';
        resetBtn.setAttribute('data-cfg-reset', def.id);
        resetBtn.textContent = '恢复默认';
        btns.appendChild(saveBtn);
        btns.appendChild(resetBtn);
        box.appendChild(btns);

        box.insertAdjacentHTML('beforeend', '<div class="svc-sec">' + (SEC2[def.id] || '状态') + '</div>');
        if (VIEW_HTML[def.id]) box.insertAdjacentHTML('beforeend', VIEW_HTML[def.id]);

        view.appendChild(row);
        flagsBox.appendChild(view);                       // 主看板：这里只放「一行」
        subsBox.appendChild(box);                         // 子看板：这个功能自己的全部内容

        cb.addEventListener('change', function () {
          setFlag(def.id, cb.checked);
          KitUI.setStatus((cb.checked ? '已开启 ' : '已关闭 ') + def.label + '\n正在刷新页面…', 3000);
          setTimeout(function () { location.reload(); }, 480);
        });
      });

      // 没有独立状态区的三个功能：指示灯只反映「开关是否打开」
      ['b64', 'mdCopy', 'linkUnlock'].forEach(function (id) { paintDot(id, isOn(id) ? 'on' : 'off'); });
    }

    // ---- 两级导航：主看板（七行清单）⇄ 子看板（单个功能：标题条 + 它自己的全部内容） ----
    const TAB_KEY = 'ldkit.tab.v1';          // 上次进的那个功能（沿用 2.6.x 的键，旧数据兼容）
    const VIEW_KEY = 'ldkit.tab.view.v1';    // 上次停在哪一级：main / sub
    let activeTab = 'b64';
    let level = 'main';
    const pheadEl = root.querySelector('.phead');
    const brandEl = root.querySelector('.brand');
    const titleEl = root.querySelector('.ptitle');
    const backBtn = root.querySelector('.back');
    const pswEl = root.querySelector('.psw');

    function markRows() {
      root.querySelectorAll('[data-tab]').forEach(function (t) {
        t.setAttribute('aria-selected', t.getAttribute('data-tab') === activeTab ? 'true' : 'false');
      });
    }
    // 让「别的功能」的那枚开关回到它自己那一行（标题条里只留当前功能的开关）
    function returnOtherSwitches(keepId) {
      Object.keys(switches).forEach(function (fid) {
        if (fid === keepId) return;
        const sw = switches[fid];
        if (!sw || sw.parentNode !== pswEl) return;
        const view = root.querySelector('[data-view="' + fid + '"]');
        const row = view ? view.querySelector('.svc') : null;
        if (row) row.appendChild(sw);
      });
    }
    // 只让某一个功能的子看板可见（on=false 时七个全收起）
    function setSubVisible(id, on) {
      root.querySelectorAll('[data-cfg-panel]').forEach(function (b) {
        b.hidden = on ? (b.getAttribute('data-cfg-panel') !== id) : true;
      });
      root.querySelectorAll('[data-view]').forEach(function (v) {
        v.classList.toggle('active', !!on && v.getAttribute('data-view') === id);
      });
    }
    // 进子看板：整块面板换成这个功能自己的东西 —— 子看板里看不到其他功能
    function enterSub(id) {
      const want = (typeof VIEW_HTML[id] === 'string') ? id : 'b64';
      activeTab = want;
      level = 'sub';
      markRows();
      setSubVisible(want, true);
      flagsBox.hidden = true;                                          // 行清单整块收起
      subsBox.hidden = false;
      brandEl.hidden = true;
      backBtn.hidden = false;
      titleEl.hidden = false;
      titleEl.textContent = flagLabel(want);
      pswEl.hidden = false;
      returnOtherSwitches(want);                                       // 标题条里只留当前这个功能的开关
      const sw = switches[want];
      if (sw && sw.parentNode !== pswEl) pswEl.appendChild(sw);         // 这枚开关搬到标题条右端
      pheadEl.setAttribute('data-act', 'back');                         // 整条标题条都可点返回
      pheadEl.title = '点标题回「全部功能」（Esc）';
      try { localStorage.setItem(TAB_KEY, want); localStorage.setItem(VIEW_KEY, 'sub'); } catch (e) { /* ignore */ }
    }
    // 回主看板：七行清单回来，七个子看板全收起
    function backToMain() {
      level = 'main';
      setSubVisible(activeTab, false);
      flagsBox.hidden = false;
      subsBox.hidden = true;
      brandEl.hidden = false;
      backBtn.hidden = true;
      titleEl.hidden = true;
      pswEl.hidden = true;
      returnOtherSwitches(null);                                       // 七个开关各自回它那一行
      pheadEl.removeAttribute('data-act');
      pheadEl.removeAttribute('title');
      markRows();
      try { localStorage.setItem(VIEW_KEY, 'main'); } catch (e) { /* ignore */ }
    }
    KitUI.showTab = enterSub;                // 旧名字等同「进子看板」（兼容旧调用与自检）
    KitUI.backToMain = backToMain;
    KitUI.level = function () { return level; };
    KitUI.activeTab = function () { return activeTab; };

    // 视图建好后，再抓「密文自解」页里的手动解码元件
    ta = root.querySelector('.ta');
    out = root.querySelector('.out');
    if (ta) ta.addEventListener('input', scheduleDecode);


    // 参数折叠区：把当前参数写回输入框
    function syncParamInputs(id) {
      const ids = id ? [id] : Object.keys(PARAM_DEFS);
      ids.forEach(function (mid) {
        const p = getParams(mid);
        root.querySelectorAll('[data-cfg-mod="' + mid + '"]').forEach(function (inp) {
          const k = inp.getAttribute('data-cfg-key');
          if (!k || p[k] === undefined) return;
          if (inp.type === 'checkbox') inp.checked = !!p[k];
          else inp.value = String(p[k]);
        });
      });
    }
    KitUI.syncParams = function (id) { syncParamInputs(id); };

    // 保存 / 恢复的即时反馈：就地写在按钮上，不打扰其它状态区
    function flashText(el, text, childSel) {
      const t = (childSel && el && el.querySelector) ? el.querySelector(childSel) : el;
      if (!t) return;
      const old = t.textContent;
      t.textContent = text;
      setTimeout(function () { t.textContent = old; }, 1400);
    }

    // 悬浮球上的进度环 + 数字徽标（不用展开面板就能看到进度）
    const pctEl = root.querySelector('.pct');
    const PROG_COLOR = { rb: '#3B82F6', ar: '#4EA65B' };
    KitUI.onProgress = function (p) {
      if (!pctEl) return;
      if (!p) {
        fab.classList.remove('has-pct');
        fab.style.setProperty('--p', '0%');
        fab.style.removeProperty('--ring');       // 别把上一轮的环色留在样式里
        pctEl.hidden = true;
        pctEl.textContent = '';
        return;
      }
      const n = Math.max(0, Math.min(100, Math.round(Number(p.pct) || 0)));
      fab.classList.add('has-pct');
      fab.style.setProperty('--p', n + '%');
      fab.style.setProperty('--ring', PROG_COLOR[p.kind] || 'var(--fg-2)');
      pctEl.textContent = p.text || (n + '%');
      pctEl.hidden = false;
      pctEl.title = (p.kind === 'rb' ? '已读提速进度 ' : '今日已回应 ') + (p.text || (n + '%'));
    };
    if (KitUI._progress) KitUI.onProgress(KitUI._progress);   // 面板重建后补画一次

    KitUI.statusEl = root.querySelector('.ar-status');
    KitUI.dotEl = root.querySelector('[data-dot="autoReact"]');
    KitUI.setStatus(KitUI._status);
    KitUI.setDot(KitUI._dot);

    KitUI.rbStatusEl = root.querySelector('.rb-status');
    KitUI.rbDotEl = root.querySelector('[data-dot="readBoost"]');
    KitUI.setRbStatus(KitUI._rbStatus);
    KitUI.setRbDot(KitUI._rbDot);

    KitUI.cfStatusEl = root.querySelector('.cf-status');
    KitUI.cfDotEl = root.querySelector('[data-dot="cfShield"]');
    KitUI.setCfStatus(KitUI._cfStatus);
    KitUI.setCfDot(KitUI._cfDot);
    KitUI.ouStatusEl = root.querySelector('.ou-status');
    KitUI.ouDotEl = root.querySelector('[data-dot="onlyUser"]');
    KitUI.setOuStatus(KitUI._ouStatus);
    KitUI.setOuDot(KitUI._ouDot);

    KitUI.syncArButtons = function () {
      const ready = !!KitUI.arIsPaused;                              // 模块未启用时两个按钮都置灰
      const paused = ready && KitUI.arIsPaused();
      const pb = root.querySelector('[data-act="ar-pause"]');
      const rb = root.querySelector('[data-act="ar-resume"]');
      if (pb) pb.disabled = !ready || paused;
      if (rb) rb.disabled = !ready || !paused;
    };
    KitUI.syncRbButtons = function () {
      const ready = !!KitUI.rbStart;
      const running = ready && !!(KitUI.rbIsRunning && KitUI.rbIsRunning());
      const cfg = KitUI.rbGetConfig ? KitUI.rbGetConfig() : null;
      const btnStart = root.querySelector('[data-act="rb-start"]');
      const btnStop = root.querySelector('[data-act="rb-stop"]');
      const btnFrom = root.querySelector('[data-act="rb-from"]');
      const btnAuto = root.querySelector('[data-act="rb-auto"]');
      if (btnStart) btnStart.disabled = !ready || running;
      if (btnStop) btnStop.disabled = !ready || !running;
      if (btnFrom && cfg) {
        btnFrom.textContent = cfg.startFromCurrent ? '从当前楼' : '从第 1 楼';
        btnFrom.title = cfg.startFromCurrent ? '当前模式：从浏览位置开始（点击切换为从第 1 楼）' : '当前模式：从第 1 楼开始（点击切换为从当前楼）';
      }
      if (btnAuto && cfg) {
        btnAuto.textContent = cfg.autoStart ? '自动: 开' : '自动: 关';
        btnAuto.classList.toggle('active', !!cfg.autoStart);
      }
      if (cfg) {
        const cfgBox = root.querySelector('[data-cfg-panel="readBoost"]');
        if (cfgBox && !cfgBox.hidden) syncParamInputs('readBoost');   // 仅参数区展开时回写，避免打断正在输入
      }
    };
    // 把参数写回输入框，并同步各功能按钮的可用状态
    syncParamInputs();
    KitUI.syncRbButtons();

    // 竖排清单初始化：高亮上次看的那一行；子面板默认全部折叠，点哪一行才展开哪一行
    // 启动：回到上次停的那一级（主看板 / 某个功能的子看板）
    (function restoreLevel() {
      let feat = 'b64', lv = 'main';
      try {
        feat = localStorage.getItem(TAB_KEY) || 'b64';
        lv = localStorage.getItem(VIEW_KEY) || 'main';
      } catch (e) { /* 隐私模式等：按默认走 */ }
      if (typeof VIEW_HTML[feat] !== 'string') feat = 'b64';
      activeTab = feat;
      if (lv === 'sub') enterSub(feat);
      else { activeTab = feat; backToMain(); }
    })();

    // ---- 悬浮开合：指针进图标就展开，离开图标/面板才折叠（全程不用点击） ----
    fab.addEventListener('mouseenter', function (e) {
      // 自愈：指针已经松开了却还挂着拖动状态（例如在面板上松的手）→ 先清掉再判悬浮
      if (drag && e && e.buttons === 0) { drag = null; root.classList.remove('dragging'); }
      overFab = true;
      hoverEnterFab();
    });
    fab.addEventListener('mouseleave', function () { overFab = false; hoverLeaveFab(); });
    panel.addEventListener('mouseenter', function () {
      overPanel = true;
      if (canHover) cancelHoverClose();
    });
    panel.addEventListener('mouseleave', function () {
      overPanel = false;
      if (canHover && !drag) scheduleHoverClose(PANEL_CLOSE_MS);
    });
    // 键盘可达：焦点在图标上按 Enter / 空格也能展开（悬浮之外的第二条路）
    fab.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      cancelHoverClose();
      if (panel.hidden) openPanel(true);
      else { try { ta.focus(); } catch (err) { /* ignore */ } }
    });

    // ---- 拖动 / 单击 ----
    fab.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      const r = host.getBoundingClientRect();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: r.left, top: r.top, moved: false };
      try { fab.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    });
    fab.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      drag.moved = true;
      root.classList.add('dragging');
      applyPos({ left: drag.left + dx, top: drag.top + dy });
      if (!panel.hidden) alignPanel();
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      try { fab.releasePointerCapture(drag.id); } catch (err) { /* ignore */ }
      const moved = drag.moved;
      drag = null;
      root.classList.remove('dragging');
      if (moved) { savePos(); return; }
      cancelHoverClose();
      if (!canHover) {                                   // 无悬浮能力的设备（触屏）：点击仍可开关
        if (panel.hidden) openPanel(true);
        else closePanel();
        return;
      }
      if (panel.hidden) openPanel(true);                 // 桌面：点击 = 展开并聚焦输入框
      else { try { ta.focus(); } catch (err) { /* ignore */ } }   // 已展开时点击不再收起（收起见「移开指针 / ✕ / Esc」）
    }
    fab.addEventListener('pointerup', endDrag);
    fab.addEventListener('pointercancel', endDrag);
    // 兜底（悬浮失效根因①的修法）：指针一松开，无论在不在图标上都清掉拖动状态。
    // 否则 drag 会一直挂着，而 hoverEnterFab / hoverLeaveFab 开头就 return —— 悬浮开合会失效到刷新页面。
    function clearDragAnywhere(e) {
      if (!drag) return;
      if (e && e.pointerId !== undefined && e.pointerId !== drag.id) return;
      // 松手就落在图标上（含指针捕获把它重定向到图标的情形）→ 交给 endDrag 收尾：
      // 它还要完成「点击开合 / 聚焦输入框」的语义。真人事件的 pointerup 是 composed 的，
      // 会先冒到 document 的捕获阶段；这里若抢先清掉 drag，endDrag 会直接 return，点击就失效了。
      if (e && e.composedPath && e.composedPath().indexOf(fab) !== -1) return;
      try { fab.releasePointerCapture(drag.id); } catch (err) { /* ignore */ }
      const moved = drag.moved;
      drag = null;
      root.classList.remove('dragging');
      if (moved) savePos();
    }
    document.addEventListener('pointerup', clearDragAnywhere, true);
    document.addEventListener('pointercancel', clearDragAnywhere, true);
    window.addEventListener('blur', function () { clearDragAnywhere(null); });

    window.addEventListener('resize', function () {
      if (!host.style.left) return;
      try { applyPos(JSON.parse(localStorage.getItem(UI_POS_KEY) || 'null')); } catch (e) { /* ignore */ }
      if (!panel.hidden) alignPanel();
    });

    document.body.appendChild(host);
    syncBoardHeight();                         // 挂载完就量一次：之后所有看板都按这个统一高度
  }

  // ================================================================
  // 模块 A：外链解锁（源：Discourse外链安全解锁器 v1.3）
  //   1) 劫持 Element.prototype.replaceWith：阻止「External Link Shield」
  //      把真实外链替换成登录跳转 —— 未登录/等级不足也能直接看到真链
  //   2) 点击外链时强制新标签页 + noopener，并拦掉 Discourse 自身的拦截脚本
  //   必须 document-start 时机安装（否则站点脚本先跑，钩子就晚了）
  // ================================================================
  function initLinkUnlock() {
    if (window.__ldkitLinkUnlock) return;
    window.__ldkitLinkUnlock = true;

    // 可设置参数：强制新标签 / 拦截站点点击（面板保存后即时生效）
    const LU = { newTab: true, blockClick: true };
    function applyLuParams(p) {
      if (!p) return;
      LU.newTab = p.newTab !== false;
      LU.blockClick = p.blockClick !== false;
    }
    applyLuParams(getParams('linkUnlock'));
    KitUI.paramHooks.linkUnlock = applyLuParams;

    const originalReplaceWith = Element.prototype.replaceWith;
    Element.prototype.replaceWith = function () {
      const args = arguments;
      try {
        if (this.tagName === 'A' && this.href && (this.protocol === 'http:' || this.protocol === 'https:')) {
          const currentHost = window.location.hostname;
          if (this.hostname && this.hostname !== currentHost) {
            if (args.length > 0 && args[0] && args[0].tagName === 'A') {
              const newLink = args[0];
              const newHref = newLink.getAttribute('href');
              const isLoginRedirect = !!(newHref && /^\/(?:login|sign-?in|auth|session)(?:[/?#]|$)/i.test(newHref));
              const isSecureButton = !!(newLink.classList && newLink.classList.contains('secure-links'));
              if (isLoginRedirect || isSecureButton) {
                this.style.borderBottom = '2px dashed #ff0000';
                this.title = '已破解登录/等级限制，直接访问';
                return;
              }
            }
          }
        }
      } catch (e) { /* 任何异常都放行：绝不阻断站点自身的 DOM 操作 */ }
      return originalReplaceWith.apply(this, args);
    };

    function onLinkEvent(e) {
      const anchor = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!anchor || !anchor.href) return;
      const currentHost = window.location.hostname;
      const targetHost = anchor.hostname;
      if (!targetHost || targetHost === currentHost) return;
      if (anchor.protocol !== 'http:' && anchor.protocol !== 'https:') return;
      if (!LU.blockClick && !LU.newTab) return;
      if (LU.newTab) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
      if (LU.blockClick) e.stopImmediatePropagation();   // 拦掉站点自身的点击拦截
    }

    // 只拦 click / auxclick：Discourse 的 secure-links 只监听这两种，
    // 屏蔽 mousedown / pointerup / contextmenu 等会连带打断站点自身的交互
    ['click', 'auxclick']
      .forEach(function (type) { window.addEventListener(type, onLinkEvent, true); });
  }

  // ================================================================
  // 模块 B：复制原生 Markdown（源：Discourse 原生 Markdown 复制 v3.8）
  //   在每个楼层操作栏注入按钮：取 /raw/<topic>/<post>（页面同源 fetch，
  //   带 Cloudflare 凭证与登录态），加标题/楼层与转载来源后写入剪贴板
  // ================================================================
  function initMdCopy() {
    if (window.__ldkitMdCopy) return;
    const isDiscourse = document.querySelector('meta[name="generator"][content*="Discourse"]') || window.Discourse;
    if (!isDiscourse) return;                                // 非 Discourse 站点不注入
    window.__ldkitMdCopy = true;

    // 可设置参数：附转载来源 / 提示时长（面板保存后即时生效）
    const MD = { appendSource: true, toastMs: 2000 };
    function applyMdParams(p) {
      if (!p) return;
      MD.appendSource = p.appendSource !== false;
      const n = Number(p.toastMs);
      MD.toastMs = (isFinite(n) && n >= 600) ? Math.floor(n) : 2000;
    }
    applyMdParams(getParams('mdCopy'));
    KitUI.paramHooks.mdCopy = applyMdParams;

    const COPY_SVG = '<svg class="fa d-icon svg-icon" viewBox="0 0 1024 1024" width="16" height="16" style="pointer-events: none; fill: #888;">'
      + '<path d="M895.318 192 128.682 192C93.008 192 64 220.968 64 256.616l0 510.698C64 802.986 93.008 832 128.682 832l766.636 0C930.992 832 960 802.986 960 767.312L960 256.616C960 220.968 930.992 192 895.318 192zM568.046 704l-112.096 0 0-192-84.08 107.756L287.826 512l0 192L175.738 704 175.738 320l112.088 0 84.044 135.96 84.08-135.96 112.096 0L568.046 704 568.046 704zM735.36 704l-139.27-192 84 0 0-192 112.086 0 0 192 84.054 0-140.906 192L735.36 704z"></path>'
      + '</svg>';

    async function fetchRawContent(topicId, postNumber) {
      const url = window.location.origin + '/raw/' + topicId + '/' + postNumber;
      const resp = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'text/plain, text/markdown, */*' }
      });
      if (!resp.ok) {
        const hint = resp.status === 403
          ? '（被 Cloudflare 拦截，请先在浏览器打开该站点并通过验证）'
          : '';
        throw new Error('HTTP ' + resp.status + hint);
      }
      return resp.text();
    }

    function fixUploadLinks(rawText) {
      const baseUrl = window.location.origin;
      return rawText.replace(/upload:\/\/([a-zA-Z0-9\-_.～]+)/g, baseUrl + '/uploads/short-url/$1');
    }

    async function processAndCopy(postElement, postNumber) {
      let topicId = postElement.getAttribute('data-topic-id');
      if (!topicId) {
        const match = window.location.pathname.match(/\/t\/[^\/]+\/(\d+)/);
        if (match) topicId = match[1];
      }
      if (!topicId || !postNumber) { showToast('无法获取帖子信息', 'error'); return; }

      // 楼主链接去尾：首楼用 /t/<id>，其它楼层补上楼号
      let postLink = window.location.origin + '/t/' + topicId;
      if (postNumber !== '1') postLink += '/' + postNumber;
      const sourceAttribution = MD.appendSource ? ('\n\n转载自：' + postLink) : '';

      showToast('正在请求源码...', 'info', 10000);
      try {
        let raw = await fetchRawContent(topicId, postNumber);
        raw = fixUploadLinks(raw);
        const titleEl = document.querySelector('.fancy-title');
        const mainTitle = titleEl ? titleEl.innerText.trim() : 'Untitled';

        let finalContent = postNumber !== '1'
          ? '> Re: ' + mainTitle + ' (Floor ' + postNumber + ')\n\n' + raw
          : '# ' + mainTitle + '\n' + raw;
        finalContent += sourceAttribution;

        const res = await copyText(finalContent);
        if (res && res.ok) showToast('已复制 Floor ' + postNumber);
        else showToast('复制失败（剪贴板被拒绝）', 'error');
      } catch (e) {
        console.error('[LD工具箱·复制]', e);
        showToast('错误: ' + (e.message || e), 'error');
      }
    }

    function showToast(message, type, duration) {
      type = type || 'success';
      duration = duration || MD.toastMs;
      const existing = document.querySelector('.ldkit-copy-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'ldkit-copy-toast';
      toast.textContent = message;
      const bgColor = type === 'error' ? '#d73a49' : (type === 'info' ? '#00aeff' : '#28a745');

      Object.assign(toast.style, {
        position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: bgColor, color: 'white', padding: '10px 20px', borderRadius: '5px',
        zIndex: '2147483000', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        fontSize: '14px', fontWeight: 'bold', transition: 'opacity 0.3s'
      });

      document.body.appendChild(toast);
      setTimeout(function () {
        toast.style.opacity = '0';
        setTimeout(function () { toast.remove(); }, 300);
      }, duration);
    }

    function addCopyButtonToPost(node) {
      let actions = node.querySelector('.actions');
      if (!actions) {
        const nav = node.querySelector('nav.post-controls');
        if (nav) actions = nav.querySelector('.actions');
      }
      if (!actions || actions.querySelector('.discourse-universal-copy-btn')) return;

      const topicPost = actions.closest('.topic-post');
      if (!topicPost) return;
      const article = topicPost.querySelector('article');
      if (!article) return;

      let postNumber = article.getAttribute('data-post-number');
      if (!postNumber && article.id && article.id.startsWith('post_')) {
        postNumber = article.id.split('_')[1];
      }
      if (!postNumber) return;

      const btn = document.createElement('button');
      btn.className = 'widget-button btn no-text btn-icon icon btn-flat discourse-universal-copy-btn';
      btn.title = '复制原生 Markdown';
      btn.innerHTML = COPY_SVG;
      btn.style.cssText = [
        'display: inline-flex !important', 'align-items: center', 'justify-content: center',
        'background: transparent', 'border: none', 'cursor: pointer',
        'visibility: visible !important', 'opacity: 1 !important'
      ].join(';');

      btn.onmouseenter = function () { const s = btn.querySelector('svg'); if (s) s.style.fill = '#00aeff'; };
      btn.onmouseleave = function () { const s = btn.querySelector('svg'); if (s) s.style.fill = '#888'; };
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        processAndCopy(topicPost, postNumber);
      });

      // 定位：放在点赞按钮之前
      const likeButtonShim = actions.querySelector('.discourse-reactions-actions-button-shim');
      const likeButton = actions.querySelector('.reaction-button') || actions.querySelector('.like');
      if (likeButtonShim) actions.insertBefore(btn, likeButtonShim);
      else if (likeButton) actions.insertBefore(btn, likeButton);
      else actions.prepend(btn);
    }

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('topic-post')) addCopyButtonToPost(node);
          if (node.querySelectorAll) node.querySelectorAll('.topic-post').forEach(addCopyButtonToPost);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.querySelectorAll('.topic-post').forEach(addCopyButtonToPost);
    setInterval(function () {
      document.querySelectorAll('.topic-post').forEach(addCopyButtonToPost);
    }, 1500);
  }

  // ================================================================
  // 模块 C：随机回应 / 跟随阅读（源：Linux.do 随机回应 v2.4.3，作者 HawChow）
  //   只对「当前可见且未回应」的楼层随机挑一个非 heart / 非 +1 的回应；
  //   全程不滚动；含服务端冷却识别、本地兜底上限、跨标签页计数、
  //   toggle 回读防撤（避免把已经成功的回应又撤掉）。
  //   UI 已并入工具箱面板（原脚本自带的悬浮球与面板已移除）。
  // ================================================================
  function initAutoReact() {
    if (window.__ldkitAutoReact) return;
    window.__ldkitAutoReact = true;

    // 注意：这里的 CFG 是本模块私有的，它遮蔽了外层 Base64 的 CFG；
    // 在本函数里写 CFG.makeLinks 之类会静默拿到 undefined。
    var CFG = {
      MIN_DELAY: 8000,
      MAX_DELAY: 20000,
      INITIAL_DELAY: 4000,
      TICK_MS: 700,
      PICKER_WAIT: 2500,            // 等待回应面板弹出的超时
      DAILY_CAP: 40,                // 每日兜底上限（跨页面累计，按自然日重置）
      COOLDOWN_BASE: 1800,          // 拿不到服务端冷却时间时：本地冷却 30 分钟（固定，不翻倍）
      COOLDOWN_MAX_SERVER: 172800,  // 服务器值只做 48 小时兜底，防异常值锁死调度
      RECOVER_SUCCESSES: 3,         // 冷却结束后连续成功 N 次，视为已真正恢复
      RETRY_RECHECK: true,
      RETRY_DELAY: 10000,
      EXCLUDE_REACTIONS: { 'heart': 1, '+1': 1 },
      STORE_KEY: 'ld_autolike_store'
    };

    // 可设置参数（面板折叠区，保存后即时生效；心跳越短越灵敏、越费性能）
    function applyArParams(p) {
      if (!p) return;
      var keys = ['MIN_DELAY', 'MAX_DELAY', 'DAILY_CAP', 'TICK_MS'];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = Number(p[k]);
        if (isFinite(v) && v > 0) CFG[k] = Math.floor(v);
      }
    }
    applyArParams(getParams('autoReact'));
    KitUI.paramHooks.autoReact = applyArParams;

    var LIKE_API = /post_actions|discourse-reactions/;
    var LIMIT_TEXT = /点赞[^。]{0,20}(上限|次数|太多)|回应[^。]{0,20}(上限|次数|太多)|too many|exhausted|daily limit|已达.{0,6}上限/i;

    /* 服务器给了确切值就完全采信；否则给固定的 30 分钟本地估算 */
    function calcCooldown(serverSeconds) {
      if (serverSeconds && serverSeconds > 0) {
        var exact = Math.round(serverSeconds);
        var margin = Math.max(60, Math.round(exact * 0.05));
        var total = exact + margin;
        if (total <= CFG.COOLDOWN_MAX_SERVER) return { sec: total, src: '服务器' };
        return { sec: CFG.COOLDOWN_MAX_SERVER, src: '服务器(异常值已封顶)' };
      }
      return { sec: CFG.COOLDOWN_BASE, src: '本地估算(固定 30min，不翻倍)' };
    }

    function guessSecondsFromText(t) {
      if (!t) return 0;
      var m = /(\d+)\s*(秒|分钟|分|小时|时)/.exec(t);
      if (!m) return 0;
      var n = parseInt(m[1], 10);
      if (!isFinite(n) || n <= 0) return 0;
      if (m[2] === '秒') return n;
      if (m[2] === '小时' || m[2] === '时') return n * 3600;
      return n * 60;
    }

    function parseCooldown(res, bodyText) {
      var ra = null;
      try { ra = res && res.headers && res.headers.get ? res.headers.get('Retry-After') : null; } catch (e) { /* ignore */ }
      if (ra) {
        var n = parseInt(ra, 10);
        if (!isNaN(n) && n > 0) return n;
        var d = Date.parse(ra);
        if (!isNaN(d)) return Math.max(1, Math.round((d - Date.now()) / 1000));
      }
      if (bodyText) {
        try {
          var j = JSON.parse(bodyText);
          var ex = j && j.extras;
          if (ex) {
            var w = parseInt(ex.wait_seconds || ex.time_left || 0, 10);
            if (w > 0) return w;
          }
        } catch (e) { /* 非 JSON，继续走文本猜测 */ }
        var g = guessSecondsFromText(bodyText);
        if (g > 0) return g;
      }
      return 0;
    }

    function fmtDur(sec) {
      sec = Math.max(0, Math.round(sec));
      if (sec < 60) return sec + ' 秒';
      if (sec < 3600) return Math.round(sec / 60) + ' 分钟';
      var h = Math.floor(sec / 3600);
      var m = Math.round((sec % 3600) / 60);
      return m ? h + ' 小时 ' + m + ' 分' : h + ' 小时';
    }

    function fmtClock(ts) {
      var d = new Date(ts);
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }

    /* ---- 持久化（跨页面 / 跨标签页 / 跨话题） ---- */
    function todayKey() {
      var d = new Date();
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function loadStore() {
      var d = { v: 2, day: todayKey(), liked: 0, total: 0, limitUntil: 0, limitHits: 0, lastLimitAt: 0, sinceOk: 0 };
      try {
        var raw = localStorage.getItem(CFG.STORE_KEY);
        if (raw) {
          var o = JSON.parse(raw);
          for (var k in d) {
            if (o[k] === undefined || o[k] === null) continue;
            d[k] = (typeof d[k] === 'number') ? (Number(o[k]) || 0) : o[k];   // 数值归一，避免 "5" + 1 变成 "51"
          }
        }
      } catch (e) { /* 存储不可用则退化为会话内状态 */ }
      if (d.day !== todayKey()) { d.day = todayKey(); d.liked = 0; }
      return d;
    }

    function saveStore(o) {
      try { localStorage.setItem(CFG.STORE_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
    }

    var store = loadStore();
    var S = {
      paused: false,
      limitHit: false,
      limitUntil: store.limitUntil || 0,
      limitHits: store.limitHits || 0,
      busy: false,
      processed: {},          // 'topicId/postN' -> done/already/nobtn/fail
      nextAllowedAt: 0,
      lastBtn: null,
      topicId: null
    };

    /* 启动时恢复冷却状态：换页面 / 换话题都受同一份冷却约束 */
    if (S.limitUntil > Date.now()) {
      S.limitHit = true;
    } else if (S.limitUntil) {
      S.limitUntil = 0;
      store.limitUntil = 0;
      saveStore(store);
    }

    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var rand = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
    var log = function (t) { try { console.log('[LD工具箱·回应]', t); } catch (e) { /* ignore */ } };

    /* ---- 统一面板适配层（替代原脚本自带的悬浮球与面板） ---- */
    function panel(t, sticky) { KitUI.setStatus(t, sticky); }
    function say(t, sticky) { log(t); panel(t, sticky); }
    function flash(good) { KitUI.flash(good); }
    function refreshDot() { KitUI.setDot(S.limitHit ? 'off' : (S.paused ? 'pause' : 'on')); }

    /* ---- 上限与冷却 ---- */
    function hitLimit(serverSeconds, src) {
      if (S.limitHit && Date.now() < S.limitUntil) return;   // 已在冷却中，不重复计时
      store = loadStore();
      store.limitHits = (store.limitHits || 0) + 1;
      store.sinceOk = 0;
      var cd = calcCooldown(serverSeconds);
      S.limitHit = true;
      S.limitUntil = Date.now() + cd.sec * 1000;
      store.limitUntil = S.limitUntil;
      store.lastLimitAt = Date.now();
      saveStore(store);
      S.limitHits = store.limitHits;
      log('命中上限，冷却 ' + cd.sec + 's（累计第 ' + store.limitHits + ' 次）来源=' + cd.src
        + (src ? ' / 触发点=' + src : ''));
      panel('🛑 已达论坛上限（累计第 ' + store.limitHits + ' 次）\n冷却 ' + fmtDur(cd.sec)
        + '　来源：' + cd.src + (src ? '（' + src + '）' : '') + '\n'
        + fmtClock(S.limitUntil) + ' 自动恢复', 4000);
      flash(false);
      refreshDot();
    }

    function checkCooldownExpiry() {
      if (!S.limitHit) return;
      if (Date.now() < S.limitUntil) return;
      store = loadStore();
      store.limitUntil = 0;
      saveStore(store);
      S.limitHit = false;
      S.limitUntil = 0;
      S.nextAllowedAt = Date.now() + rand(3000, CFG.INITIAL_DELAY + 3000);
      refreshDot();
      // 冷却结束：清掉失败记录，让刚才失败的楼层还有重试机会
      for (var fk in S.processed) { if (S.processed[fk] === 'fail') delete S.processed[fk]; }
      say('冷却结束 — 已自动恢复', 3000);
    }

    /* ---- 网络监听：三通道识别上限，并读取服务端冷却时间 ---- */
    function inspect(status, res, bodyText) {
      if (status === 429) {
        var cd = parseCooldown(res, bodyText);
        hitLimit(cd, cd ? '服务器 Retry-After' : 'HTTP 429');
        return;
      }
      if (status >= 400 && bodyText && LIMIT_TEXT.test(bodyText)) {
        var cd2 = parseCooldown(res, bodyText);
        hitLimit(cd2, cd2 ? '服务器返回的等待时间' : '错误信息');
      }
    }

    var _fetch = window.fetch;
    window.fetch = function () {
      var args = arguments;
      var p = _fetch.apply(this, args);
      p.then(function (res) {
        try {
          var url = (typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url)) || res.url || '';
          if (LIKE_API.test(url) && !res.ok) {
            res.clone().text()
              .then(function (t) { inspect(res.status, res, t); })
              .catch(function () { inspect(res.status, res, ''); });
          }
        } catch (e) { /* ignore */ }
      }).catch(function () { /* ignore */ });
      return p;
    };

    var _xhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._ldUrl = url;
      return _xhrOpen.apply(this, arguments);
    };
    var _xhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      var self = this;
      if (!this._ldLoadHooked) {                  // 同一个 XHR 实例被复用时不再重复挂监听
        this._ldLoadHooked = true;
        this.addEventListener('load', function () {
          try {
            var u = String(self._ldUrl || '');
            if (LIKE_API.test(u) && self.status >= 400) {
              var shim = { headers: { get: function (h) { try { return self.getResponseHeader(h); } catch (e) { return null; } } } };
              inspect(self.status, shim, self.responseText || '');
            }
          } catch (e) { /* ignore */ }
        });
      }
      return _xhrSend.apply(this, arguments);
    };

    function domLimitCheck() {
      var nodes = document.querySelectorAll('.alert-danger, #modal-alert, .dialog-body, .bootbox-body, .alert-error');
      for (var i = 0; i < nodes.length; i++) {
        var t = (nodes[i].textContent || '').trim();
        if (t && LIMIT_TEXT.test(t)) { hitLimit(guessSecondsFromText(t), '页面提示'); return; }
      }
    }

    /* ---- DOM 工具 ---- */
    function findReactionBtn(post) {
      var b = post.querySelector('.btn-toggle-reaction-like');
      if (b && b.offsetParent !== null) return b;
      b = post.querySelector('.reaction-button');
      if (b && b.offsetParent !== null) return b;
      b = post.querySelector('.post-action-menu__like');
      if (b && b.offsetParent !== null) return b;
      return null;
    }

    /* 已回应判定：linux.do 的 discourse-reactions 已并入 core，
       回应后的标记类是 .custom-reaction-used / .has-reacted
       （旧版的 .has-like 实测恒为 0，会让计数永不 +1 并触发 toggle 撤回） */
    function isReacted(post, btn) {
      var ract = post.querySelector('.discourse-reactions-actions');
      if (!ract) return false;
      var cls = ract.className || '';
      if (cls.indexOf('custom-reaction-used') !== -1) return true;
      if (cls.indexOf('has-reacted') !== -1) return true;
      return false;
    }

    /* 合成悬停唤出回应面板（必须带 pointerType:'mouse'）。
       不做任何滚动；若已有面板残留：先关闭并等它收起，关不掉就放弃本次，绝不点错楼层 */
    async function openPicker(btn) {
      var SEL = '.discourse-reactions-picker.is-expanded';
      if (document.querySelector(SEL)) {
        var closed = await closePicker(S.lastBtn);
        if (!closed) { log('旧面板关不掉，放弃本次以防点错楼层'); return null; }
      }
      var o = { view: window, pointerType: 'mouse', pointerId: 1, isPrimary: true };
      btn.dispatchEvent(new PointerEvent('pointerenter', o));
      btn.dispatchEvent(new PointerEvent('pointerover', Object.assign({ bubbles: true }, o)));
      btn.dispatchEvent(new MouseEvent('mouseenter', o));
      btn.dispatchEvent(new MouseEvent('mouseover', Object.assign({ bubbles: true }, o)));
      btn.dispatchEvent(new MouseEvent('mousemove', Object.assign({ bubbles: true }, o)));
      S.lastBtn = btn;
      var t0 = Date.now();
      while (Date.now() - t0 < CFG.PICKER_WAIT) {
        await sleep(200);
        var p = document.querySelector(SEL);
        if (p) return p;
      }
      return null;
    }

    async function closePicker(btn) {
      if (btn) {
        var o = { view: window, pointerType: 'mouse', pointerId: 1, isPrimary: true };
        btn.dispatchEvent(new PointerEvent('pointerleave', o));
        btn.dispatchEvent(new PointerEvent('pointerout', Object.assign({ bubbles: true }, o)));
        btn.dispatchEvent(new MouseEvent('mouseleave', o));
        btn.dispatchEvent(new MouseEvent('mouseout', Object.assign({ bubbles: true }, o)));
      }
      try {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true }));
      } catch (e) { /* ignore */ }
      var t0 = Date.now();
      while (Date.now() - t0 < 2000) {
        await sleep(150);
        if (!document.querySelector('.discourse-reactions-picker.is-expanded')) break;
      }
      if (S.lastBtn === btn) S.lastBtn = null;
      return !document.querySelector('.discourse-reactions-picker.is-expanded');
    }

    /* 从面板里随机挑一个非排除回应；返回 {el, name} 或 null */
    function pickRandom(picker) {
      var cands = [];
      var list = picker.querySelectorAll('.pickable-reaction');
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        var name = b.dataset.reaction || b.getAttribute('data-reaction') || '';
        if (!name) {
          var m = /：([^：]+)$/.exec(b.title || '');
          name = m ? m[1].trim() : '';
        }
        if (!name || CFG.EXCLUDE_REACTIONS[name]) continue;
        cands.push({ el: b, name: name });
      }
      if (!cands.length) return null;
      return cands[Math.floor(Math.random() * cands.length)];
    }

    /* 记录一次成功回应；若曾进入冷却，连续成功足够多次则重置退避。
       每次都从 localStorage 重读后再加，多标签页才不会互相覆盖 */
    function noteSuccess() {
      store = loadStore();
      store.liked = (store.liked || 0) + 1;
      store.total = (store.total || 0) + 1;
      if (store.limitHits > 0) {
        store.sinceOk = (store.sinceOk || 0) + 1;
        if (store.sinceOk >= CFG.RECOVER_SUCCESSES) {
          store.limitHits = 0;
          store.sinceOk = 0;
          S.limitHits = 0;
          log('连续成功 ' + CFG.RECOVER_SUCCESSES + ' 次，退避已重置');
        }
      }
      saveStore(store);
      return store;
    }

    /* 对单层楼执行一次随机回应。绝不滚动：按钮不在视口就不会被选为目标 */
    async function reactToPost(article, postNum) {
      var btn = findReactionBtn(article);
      if (!btn) return { ok: false, why: 'nobtn' };
      if (isReacted(article, btn)) return { ok: false, why: 'reacted' };

      var picker = await openPicker(btn);
      if (!picker) { await closePicker(btn); return { ok: false, why: 'nopicker' }; }

      var pick = pickRandom(picker);
      if (!pick) { await closePicker(btn); return { ok: false, why: 'nocandidate' }; }

      pick.el.click();
      await sleep(1800);
      domLimitCheck();
      if (S.limitHit) return { ok: false, why: 'limit' };

      var cur = findReactionBtn(article) || btn;
      if (isReacted(article, cur)) return { ok: true, name: pick.name };

      /* 回读未生效 → 先等 RETRY_DELAY 再复查，复查通过即算成功。
         绝不未经复查就重开面板再点一次 —— 回应接口是 toggle 语义，
         那会把第一次已经成功的回应撤回 */
      if (CFG.RETRY_RECHECK) {
        say('第 ' + postNum + ' 楼未生效，' + Math.round(CFG.RETRY_DELAY / 1000) + ' 秒后复查');
        await sleep(CFG.RETRY_DELAY);
        var cur1 = findReactionBtn(article) || btn;
        if (isReacted(article, cur1)) return { ok: true, name: pick.name, retried: true };
        await closePicker(cur1);
        return { ok: false, why: 'noverify' };
      }

      await closePicker(cur);
      return { ok: false, why: 'noverify' };
    }

    /* ---- 视口扫描：只认「你正在看」的楼层（全程只读，无滚动） ---- */
    function scanVisible() {
      var vh = window.innerHeight;
      var out = [];
      var arts = document.querySelectorAll('article[id^="post_"]');
      for (var i = 0; i < arts.length; i++) {
        var a = arts[i];
        var r = a.getBoundingClientRect();
        if (r.bottom < 90 || r.top > vh - 90) continue;
        var btn = findReactionBtn(a);
        if (!btn) continue;
        var br = btn.getBoundingClientRect();
        if (br.bottom < 0 || br.top > vh) continue;
        var m = /^post_(\d+)$/.exec(a.id);
        if (!m) continue;
        var key = S.topicId + '/' + m[1];
        if (S.processed[key]) continue;
        if (isReacted(a, btn)) { S.processed[key] = 'already'; continue; }
        var visTop = Math.max(r.top, 0);
        var visBottom = Math.min(r.bottom, vh);
        var focus = (visTop + visBottom) / 2;
        out.push({ article: a, key: key, n: +m[1], dist: Math.abs(focus - vh / 2) });
      }
      out.sort(function (x, y) { return x.dist - y.dist; });
      return out;
    }

    function composerOpen() {
      var ta = document.querySelector('.d-editor textarea, .reply-area textarea');
      return !!(ta && ta.offsetParent !== null);
    }

    /* ---- 调度器 ---- */
    async function act() {
      if (S.busy) return;
      store = loadStore();                                   // 每次调度前重读，多标签页才同步
      // 图标进度：把「今日已回应 / 上限」画到悬浮球上；暂停 / 冷却 / 非话题页时清掉
      try {
        if (S.paused || S.limitHit || !S.topicId) {
          if (KitUI._progress && KitUI._progress.kind === 'ar') KitUI.setProgress(null);
        } else {
          var cap = Math.max(1, CFG.DAILY_CAP);
          var liked = store.liked || 0;
          KitUI.setProgress('ar', Math.round(Math.min(liked, cap) / cap * 100), liked + '/' + cap);
        }
      } catch (e) { /* ignore */ }
      // 别的标签页可能刚命中冷却：同步过来，免得这边继续发请求（原先只在启动时读一次）
      if (!S.limitHit && store.limitUntil > Date.now()) {
        S.limitHit = true;
        S.limitUntil = store.limitUntil;
        refreshDot();
      }

      if (S.limitHit) {
        var left = Math.ceil((S.limitUntil - Date.now()) / 1000);
        panel('🛑 已达论坛上限（累计第 ' + store.limitHits + ' 次），冷却中\n剩余 ' + fmtDur(left)
          + '（' + fmtClock(S.limitUntil) + ' 自动恢复）\n今日已回应 ' + store.liked + '/' + CFG.DAILY_CAP);
        return;
      }
      if (S.paused) { panel('已暂停，点「继续」恢复'); return; }
      if (!S.topicId) { panel('打开任意话题页后开始跟随'); return; }
      if (composerOpen()) { panel('检测到你正在写回复，暂停回应'); return; }

      var now = Date.now();
      if (now < S.nextAllowedAt) {
        panel('跟随阅读中（今日已回应 ' + store.liked + '/' + CFG.DAILY_CAP + '）\n'
          + Math.ceil((S.nextAllowedAt - now) / 1000) + 's 后处理当前楼层');
        return;
      }

      /* 本地 40 次只是读不到服务端真实上限时的兜底参考，不再当硬闸门 */
      if (store.liked >= CFG.DAILY_CAP) {
        panel('已超本地预估上限 ' + CFG.DAILY_CAP + ' 次（今日已回应 ' + store.liked + '）\n仍在跟随，由服务端决定是否停止');
      }

      var cands = scanVisible();
      if (!cands.length) { panel('滚动到哪，回应到哪'); return; }

      var c = cands[0];                                      // 离屏幕中心最近 = 你正在看的楼
      S.processed[c.key] = 'pending';
      S.busy = true;
      var r;
      try {
        r = await reactToPost(c.article, c.n);
      } catch (e) {
        /* 异常出口也要给出终态：否则 key 卡在 'pending'，该楼整个会话再也不被尝试 */
        log('处理第 ' + c.n + ' 楼异常: ' + (e && e.message));
        r = { ok: false, why: 'error' };
      } finally {
        S.busy = false;
      }
      if (S.limitHit) { S.processed[c.key] = 'fail'; return; }

      if (r && r.ok) {
        noteSuccess();
        S.processed[c.key] = 'done';
        S.nextAllowedAt = Date.now() + rand(CFG.MIN_DELAY, CFG.MAX_DELAY);
        say('第 ' + c.n + ' 楼 → ' + r.name + (r.retried ? '（复查后确认）' : ''), 2000);
        flash(true);
        refreshDot();
      } else if (r && r.why === 'reacted') {
        S.processed[c.key] = 'already';
      } else if (r && r.why === 'nobtn') {
        S.processed[c.key] = 'nobtn';
      } else {
        S.processed[c.key] = 'fail';
        S.nextAllowedAt = Date.now() + 4000;
        say('第 ' + (c ? c.n : '?') + ' 楼失败（' + (r ? r.why : '?') + '）');
      }
    }

    /* ---- 注册面板按钮回调 ---- */
    KitUI.arPause = function () {
      S.paused = true;
      refreshDot();
      panel('已暂停，点「继续」恢复', 2200);
      KitUI.syncArButtons();
    };
    KitUI.arResume = function () {
      S.paused = false;
      refreshDot();
      panel('继续跟随阅读', 2200);
      KitUI.syncArButtons();
    };
    KitUI.arClearCd = function () {
      S.limitUntil = 0;
      S.limitHit = false;
      store = loadStore();
      store.limitUntil = 0;
      store.sinceOk = 0;
      /* 只解除「闸门」（允许继续尝试），不把已发生的回应次数归零 ——
         次数是既成事实，抹成 0 会让面板失去参考意义 */
      saveStore(store);
      refreshDot();
      panel('已解除冷却与退避（今日已回应 ' + (store.liked || 0) + '/' + CFG.DAILY_CAP + '）', 2600);
    };
    KitUI.arIsPaused = function () { return S.paused; };

    /* ---- 主循环 ---- */
    var lastUrl = '';
    setInterval(function () {
      checkCooldownExpiry();

      var url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        var m = url.match(/\/t\/(?:[^/]+\/)?(\d+)/);
        var tid = m && m[1];
        if (tid && tid !== S.topicId) {
          S.topicId = tid;                                   // 换话题：保留 processed（按 topic 隔离）
          S.nextAllowedAt = Date.now() + rand(3000, CFG.INITIAL_DELAY + 3000);
          if (S.lastBtn) closePicker(S.lastBtn);
        } else if (!tid) {
          S.topicId = null;
        }
      }
      act().catch(function (e) { S.busy = false; log('调度异常: ' + (e && e.message)); });
    }, CFG.TICK_MS);

    /* 起步延迟 */
    S.nextAllowedAt = Date.now() + rand(3000, CFG.INITIAL_DELAY + 3000);

    refreshDot();
    KitUI.syncArButtons();
    if (S.limitHit) {
      var left0 = Math.ceil((S.limitUntil - Date.now()) / 1000);
      panel('🛑 冷却中，剩余 ' + fmtDur(left0) + '（' + fmtClock(S.limitUntil) + ' 自动恢复）');
    } else {
      panel('滚动到哪，回应到哪');
    }
  }

  // ================================================================
  // 模块 D：已读提速 / 刷已读帖量（源：LINUXDO&IDCFlare ReadBoost v2.2，作者 Sunwuyuan / adodo）
  //   在话题页后台向 /topics/timings 批量同步已读记录与模拟阅读耗时；
  //   支持断点提速（从当前楼层或从第 1 楼）、自动运行、自定义延迟与批量大小；
  //   UI 并入工具箱面板（原脚本的 header 按钮与独立弹窗已收纳）。
  // ================================================================
  function initReadBoost() {
    if (window.__ldkitReadBoost) return;
    window.__ldkitReadBoost = true;

    const RB_STORE_KEY = 'ldkit.readboost.cfg.v1';
    const DEFAULT_CONFIG = {
      baseDelay: 2500,
      randomDelayRange: 800,
      minReqSize: 8,
      maxReqSize: 20,
      minReadTime: 800,
      maxReadTime: 3000,
      autoStart: false,
      startFromCurrent: false
    };

    function loadConfig() {
      const cfg = Object.assign({}, DEFAULT_CONFIG);
      const pdList = PARAM_DEFS.readBoost || [];

      // 逐键判定优先级：面板里「显式存过」的键 > 旧键（2.3.0 及以前）> 出厂默认。
      // 这样任何升级路径都不会丢配置：旧版只把「自动运行 / 从当前楼」存在旧键里，
      // 升上来时面板还没存过这两个键，就仍然读旧键，并顺手迁移进统一参数表。
      let stored = {};
      try {
        const rawP = JSON.parse(localStorage.getItem(PARAMS_KEY) || 'null');
        if (rawP && rawP.readBoost && typeof rawP.readBoost === 'object') stored = rawP.readBoost;
      } catch (e) { stored = {}; }

      const fromPanel = getParams('readBoost');
      const fromPanelUsed = {};
      for (const k in DEFAULT_CONFIG) {
        if (stored[k] === undefined || stored[k] === null) continue;   // 面板没显式存过 → 交给旧键
        const v = fromPanel[k];
        if (v === undefined || v === null) continue;
        cfg[k] = (typeof DEFAULT_CONFIG[k] === 'number') ? (Number(v) || DEFAULT_CONFIG[k]) : !!v;
        fromPanelUsed[k] = true;
      }

      let migrated = false;
      try {
        const raw = localStorage.getItem(RB_STORE_KEY);
        if (raw) {
          const o = JSON.parse(raw);
          for (const k in DEFAULT_CONFIG) {
            if (fromPanelUsed[k]) continue;
            if (o[k] === undefined || o[k] === null) continue;
            cfg[k] = (typeof DEFAULT_CONFIG[k] === 'number') ? (Number(o[k]) || DEFAULT_CONFIG[k]) : !!o[k];
            migrated = true;
          }
        }
      } catch (e) { /* ignore */ }
      if (migrated) {
        const patch = {};
        for (const pd of pdList) {
          if (cfg[pd.key] !== undefined) patch[pd.key] = cfg[pd.key];
        }
        PARAMS.readBoost = Object.assign({}, getParams('readBoost'), patch);
        persistParams();
      }
      return cfg;
    }

    let cfg = loadConfig();
    let isRunning = false;
    let shouldStop = false;
    let currentTopicId = null;
    let stoppedByUser = false;      // 本页手动停止过 → 自动运行不再接管（换页后复位）
    let autoAttempts = 0;           // 自动提速的就绪重试计数（等楼层信息）
    let autoHold = false;           // 本页这一轮已跑过（跑完/失败）→ 不再自动重跑；换页 / 手动开自动 / 清空进度 时复位

    // ---- 本地进度记忆：按话题记住「已同步到第几楼」----
    //   ① 下次进同一话题直接续刷，已经刷过的楼不再重复发请求；
    //   ② 也是「进度不停重置」的解药：一轮跑完后 isRunning 变 false，
    //      没有这层记忆时自动提速会在下个心跳又从头开跑，看上去就是进度一直在重置。
    const RB_PROG_KEY = 'ldkit.readboost.progress.v1';
    const RB_PROG_MAX = 200;        // 最多记 200 个话题，超出按时间淘汰

    function loadAllProgress() {
      try {
        const o = JSON.parse(localStorage.getItem(RB_PROG_KEY) || '{}');
        return (o && typeof o === 'object') ? o : {};
      } catch (e) { return {}; }
    }
    function writeAllProgress() {
      try { localStorage.setItem(RB_PROG_KEY, JSON.stringify(prog)); } catch (e) { /* 隐私模式等：本次会话内仍生效 */ }
    }
    let prog = loadAllProgress();

    // 多标签页：读的时候现读一次，别用过期的内存副本
    function progressOf(topicID) {
      const r = loadAllProgress()[String(topicID)];
      return (r && typeof r === 'object') ? r : null;
    }
    function markSynced(topicID, endId, total) {
      const key = String(topicID);
      prog = loadAllProgress();
      const cur = prog[key] || { until: 0, at: 0, total: 0 };
      if (endId > (cur.until || 0)) cur.until = endId;      // 高水位线：记住刷到第几楼
      cur.at = Date.now();
      if (total) cur.total = Math.max(cur.total || 0, total);
      prog[key] = cur;
      const keys = Object.keys(prog);
      if (keys.length > RB_PROG_MAX) {
        keys.sort(function (a, b) { return (prog[a].at || 0) - (prog[b].at || 0); });
        for (let i = 0; i < keys.length - RB_PROG_MAX; i++) delete prog[keys[i]];
      }
      writeAllProgress();
    }
    function forgetProgress(topicID) {
      prog = loadAllProgress();
      delete prog[String(topicID)];
      writeAllProgress();
    }
    // 这一轮该从第几楼开始（已刷过的跳过）
    function startFloorFor(pageInfo) {
      const mem = progressOf(pageInfo.topicID);
      const until = (mem && mem.until) || 0;
      const base = cfg.startFromCurrent ? Math.max(1, pageInfo.currentPosition || 1) : 1;
      return { start: Math.max(base, until + 1), until: until };
    }

    // 自动提速：开关为开 + 是话题页 + 楼层信息就绪 + 没被手动停过 + 本页还没跑过 + 还有没刷的楼 → 才开跑。
    // 信息没就绪就交给下个心跳重试（原来是 1.5 秒一次性判断，楼层还没加载完就永久放弃）。
    function maybeAutoStart(info) {
      if (!cfg.autoStart || isRunning || stoppedByUser || autoHold) return false;
      if (!isTopicPage()) return false;
      const pageInfo = info || getPageInfo();
      if (!pageInfo || !pageInfo.totalReplies) return false;
      if (startFloorFor(pageInfo).start > pageInfo.totalReplies) {
        // 已刷完：不自动重跑（否则一轮跑完后每个心跳都会从头再来一次）
        if (KitUI._rbStatus.indexOf('已刷完') < 0) {
          KitUI.setRbStatus('此话题已刷完：1-' + pageInfo.totalReplies + ' 楼都同步过了\n点「清空进度」可从 1 楼重刷');
          KitUI.setRbDot('on');
        }
        return false;
      }
      if (autoAttempts++ > 60) return false;              // 兜底：最多等 60 个心跳
      startReading();
      return true;
    }

    function saveConfig(newCfg) {
      cfg = Object.assign({}, cfg, newCfg);
      try { localStorage.setItem(RB_STORE_KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
      // 与面板参数表保持同步（直写存储，不触发 hook，避免回环）
      const patch = {};
      for (const pd of (PARAM_DEFS.readBoost || [])) {
        if (cfg[pd.key] !== undefined) patch[pd.key] = cfg[pd.key];
      }
      PARAMS.readBoost = Object.assign({}, getParams('readBoost'), patch);
      persistParams();
      KitUI.syncRbButtons();
    }

    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // 解析话题路径：主题 id = 路径里第一个纯数字段，楼号 = 它后面的纯数字段。
    // 不能写成「可选一个 slug 段」的正则 —— /t/12345/78 会被误读成「slug=12345, id=78」。
    function parseTopicPath(pathname) {
      const segs = String(pathname == null ? '' : pathname).split('/').filter(Boolean);
      if (!segs.length || segs[0] !== 't') return null;
      let topicID = null, postNumber = 0;
      for (let i = 1; i < segs.length; i++) {
        if (!/^\d+$/.test(segs[i])) continue;
        if (topicID === null) topicID = segs[i];
        else { postNumber = parseInt(segs[i], 10) || 0; break; }
      }
      return topicID ? { topicID: topicID, postNumber: postNumber } : null;
    }

    function topicIdOf(pathname) {
      const p = parseTopicPath(pathname);
      return p ? p.topicID : null;
    }

    function isTopicPage() {
      return parseTopicPath(window.location.pathname) !== null;
    }

    function getEndpoint() {
      return window.location.origin + '/topics/timings';
    }

    function getPageInfo() {
      const parsed = parseTopicPath(window.location.pathname);
      if (!parsed) return null;
      const topicID = parsed.topicID;

      let currentPosition = 1;
      let totalReplies = 0;
      const posFromUrl = parsed.postNumber;

      // 1. Discourse 内部控制器取总帖数与当前位置
      try {
        const topicModel = window.Discourse?.__container__?.lookup('controller:topic')?.model;
        if (topicModel) {
          totalReplies = topicModel.highest_post_number || topicModel.posts_count || 0;
          currentPosition = topicModel.currentPost || 1;
        }
      } catch (e) { /* ignore */ }

      // 2. 兜底：timeline-replies (e.g. "12 / 85")
      if (!totalReplies) {
        const repliesEl = document.querySelector('div.timeline-replies, .timeline-replies');
        if (repliesEl) {
          const parts = repliesEl.textContent.trim().split('/');
          if (parts.length === 2) {
            currentPosition = parseInt(parts[0].trim(), 10) || 1;
            totalReplies = parseInt(parts[1].trim(), 10) || 0;
          }
        }
      }

      // 3. 兜底 2：DOM 中 post-number 最大 / 最小的文章（已加载窗口的首末层）
      const articles = document.querySelectorAll('article[data-post-number]');
      let maxNum = 0, minNum = 0;
      articles.forEach(a => {
        const n = parseInt(a.getAttribute('data-post-number'), 10);
        if (isFinite(n) && n > 0) {
          if (n > maxNum) maxNum = n;
          if (!minNum || n < minNum) minNum = n;
        }
      });
      if (!totalReplies && maxNum > 0) totalReplies = maxNum;

      // 4. 当前位置优先级：地址栏楼号 > 已加载窗口首层 > Discourse 控制器
      if (posFromUrl > 0) currentPosition = posFromUrl;
      else if (minNum > 0) currentPosition = minNum;

      const csrfEl = document.querySelector('meta[name="csrf-token"]');
      const csrfToken = csrfEl ? csrfEl.getAttribute('content') : (window.Discourse?.Session?.current()?.csrfToken || '');

      return { topicID, currentPosition, totalReplies, csrfToken };
    }

    async function sendBatch(pageInfo, startId, endId, retryCount) {
      if (retryCount === undefined) retryCount = 3;
      if (shouldStop) throw new Error('stopped');
      const topicID = pageInfo.topicID;
      const csrfToken = pageInfo.csrfToken;
      const totalReplies = pageInfo.totalReplies;

      const params = new URLSearchParams();
      for (let i = startId; i <= endId; i++) {
        params.append(`timings[${i}]`, String(getRandomInt(cfg.minReadTime, cfg.maxReadTime)));
      }
      const count = endId - startId + 1;
      const topicTime = String(getRandomInt(cfg.minReadTime * count, cfg.maxReadTime * count));
      params.append('topic_time', topicTime);
      params.append('topic_id', topicID);

      try {
        const response = await fetch(getEndpoint(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-CSRF-Token': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: params,
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        if (shouldStop) throw new Error('stopped');

        const pct = totalReplies > 0 ? Math.round((endId / totalReplies) * 100) : 100;
        markSynced(topicID, endId, totalReplies);    // 就地记住「已刷到第几楼」，下次续刷跳过
        KitUI.setRbStatus(`正在提速：处理中 ${startId}-${endId} 楼 (${pct}%)`);
        KitUI.setRbDot('run');
        KitUI.setProgress('rb', pct, pct + '%');     // 图标上的进度环
      } catch (err) {
        if (shouldStop) throw err;
        if (retryCount > 0) {
          KitUI.setRbStatus(`提速重试：${startId}-${endId} 楼（余 ${retryCount} 次）`);
          KitUI.setRbDot('warn');
          await new Promise(r => setTimeout(r, 2000));
          return await sendBatch(pageInfo, startId, endId, retryCount - 1);
        }
        throw err;
      }

      // 批次间隔延迟（可被立即打断）
      const delay = cfg.baseDelay + getRandomInt(0, cfg.randomDelayRange);
      for (let i = 0; i < delay; i += 100) {
        if (shouldStop) throw new Error('stopped');
        await new Promise(r => setTimeout(r, Math.min(100, delay - i)));
      }
    }

    async function startReading() {
      if (isRunning) return;
      const pageInfo = getPageInfo();
      if (!pageInfo || !pageInfo.totalReplies) {
        KitUI.setRbStatus('无法读取话题楼层信息，请先打开话题页');
        KitUI.setRbDot('err');
        return;
      }

      const totalReplies = pageInfo.totalReplies;
      const from = startFloorFor(pageInfo);            // 已刷过的楼跳过
      const startPosition = from.start;

      if (startPosition > totalReplies) {
        autoHold = true;                               // 已刷完：本页不再自动重跑
        KitUI.setRbStatus('此话题已刷完：1-' + totalReplies + ' 楼都同步过了\n想重刷先点「清空进度」');
        KitUI.setRbDot('on');
        KitUI.syncRbButtons();
        return;
      }

      isRunning = true;
      shouldStop = false;
      KitUI.setRbDot('run');
      KitUI.syncRbButtons();
      KitUI.setRbStatus(from.until
        ? ('正在提速：续刷第 ' + startPosition + ' 楼起（已刷到 ' + from.until + '，共 ' + totalReplies + ' 楼）')
        : ('正在提速：准备处理第 ' + startPosition + ' 至 ' + totalReplies + ' 楼…'));

      try {
        for (let i = startPosition; i <= totalReplies; ) {
          if (shouldStop) break;
          const batchSize = getRandomInt(cfg.minReqSize, cfg.maxReqSize);
          const startId = i;
          const endId = Math.min(i + batchSize - 1, totalReplies);
          await sendBatch(pageInfo, startId, endId);
          i = endId + 1;
        }

        if (shouldStop) {
          KitUI.setRbStatus('已停止提速');
          KitUI.setRbDot('pause');
        } else {
          const totalCount = totalReplies - startPosition + 1;
          KitUI.setRbStatus(`提速完成：已刷取 ${startPosition}-${totalReplies} 楼（共 ${totalCount} 帖）`);
          KitUI.setRbDot('on');
        }
      } catch (err) {
        if (err && err.message === 'stopped') {
          KitUI.setRbStatus('已停止提速');
          KitUI.setRbDot('pause');
        } else {
          KitUI.setRbStatus('提速失败：' + (err && err.message ? err.message : err));
          KitUI.setRbDot('err');
        }
      } finally {
        isRunning = false;
        shouldStop = false;
        autoHold = true;                  // 本页这一轮跑过了：不再自动重开（这是「进度不停重置」的根治点）
        KitUI.setProgress(null);          // 跑完/停掉/失败都清掉图标上的进度
        KitUI.syncRbButtons();
      }
    }

    function stopReading(byUser) {
      if (!isRunning) return;
      if (byUser) stoppedByUser = true;          // 手动停止后，本页不再被「自动运行」接管
      shouldStop = true;
      KitUI.setRbStatus('正在停止提速…');
      KitUI.setRbDot('warn');
    }

    // 检查并更新就绪文案
    function checkPageReady() {
      if (isRunning) return;
      if (!isTopicPage()) {
        if (KitUI._progress && KitUI._progress.kind === 'rb') KitUI.setProgress(null);
        currentTopicId = null;
        KitUI.setRbStatus('打开任意话题页后可提速');
        KitUI.setRbDot('off');
        KitUI.syncRbButtons();
        return;
      }
      const pageInfo = getPageInfo();
      if (pageInfo && pageInfo.topicID) {
        currentTopicId = pageInfo.topicID;
        const total = pageInfo.totalReplies;
        const from = startFloorFor(pageInfo);
        if (total && from.start > total) {
          KitUI.setRbStatus('此话题已刷完：1-' + total + ' 楼都同步过了\n点「清空进度」可从 1 楼重刷');
          KitUI.setRbDot('on');
        } else if (total) {
          KitUI.setRbStatus('就绪：第 ' + from.start + ' 楼至 ' + total + ' 楼（可刷 ' + Math.max(0, total - from.start + 1) + ' 帖'
            + (from.until ? '；已刷到 ' + from.until + ' 楼' : '') + '）');
          KitUI.setRbDot('pause');
        } else {
          KitUI.setRbStatus('话题已加载，等待楼层信息…');
          KitUI.setRbDot('off');
        }
      }
      KitUI.syncRbButtons();
    }

    // 注册到 KitUI
    KitUI.rbStart = startReading;
    KitUI.rbReady = checkPageReady;      // 面板「清空进度」按钮要刷新就绪文案：跨作用域只能走 KitUI 钩子
    KitUI.rbStop = function () { stopReading(true); };      // 面板按钮算「手动停止」
    KitUI.rbIsRunning = function () { return isRunning; };
    KitUI.rbGetConfig = function () { return cfg; };
    // 进度记忆的读写口（面板「清空进度」按钮与自检都用它）
    KitUI.rbProgress = function (topicID) {
      const t = topicID || topicIdOf(window.location.pathname);
      return t ? progressOf(t) : null;
    };
    KitUI.rbForget = function (topicID) {
      const t = topicID || topicIdOf(window.location.pathname);
      if (!t) return false;
      forgetProgress(t);
      autoHold = false;                 // 清空后允许重新跑（自动也会按需要接手）
      stoppedByUser = false;
      autoAttempts = 0;
      return true;
    };
    // 自检/手工修进度：直接写高水位线
    KitUI.rbMarkSynced = function (topicID, until) {
      if (!topicID) return false;
      markSynced(topicID, Number(until) || 0, 0);
      return true;
    };
    KitUI.rbSaveConfig = saveConfig;
    // 面板「保存参数 / 恢复默认」→ 即时生效（含自动运行 / 从当前楼两个开关）
    KitUI.paramHooks.readBoost = function (p) {
      if (!p) return;
      const patch = {};
      for (const pd of (PARAM_DEFS.readBoost || [])) {
        if (p[pd.key] !== undefined) patch[pd.key] = p[pd.key];
      }
      if (patch.autoStart === true) { stoppedByUser = false; autoAttempts = 0; autoHold = false; }   // 面板上重新打开「自动」= 新的意图
      saveConfig(patch);
      try { checkPageReady(); } catch (e) { /* ignore */ }
      try { maybeAutoStart(); } catch (e) { /* ignore */ }                        // 打开开关就地开跑
    };
    KitUI.rbToggleFrom = function () {
      saveConfig({ startFromCurrent: !cfg.startFromCurrent });
      checkPageReady();
    };
    KitUI.rbToggleAuto = function () {
      saveConfig({ autoStart: !cfg.autoStart });
      if (cfg.autoStart) { stoppedByUser = false; autoAttempts = 0; autoHold = false; maybeAutoStart(); }
    };

    // 路由检测：只有「换话题」才复位。同一个话题里滚动时，Discourse 会把地址栏改成当前楼号
    // （/t/xxx/123/45），那不算换页 —— 原来按整串 URL 判断，一滚动就被当成换了页，
    // 正在跑的进度被 stopReading 打断、再从头开跑（这就是「进度重置成从 1 楼」的根因）。
    let lastTopicId = topicIdOf(location.pathname);
    setInterval(function () {
      const tid = topicIdOf(location.pathname);
      if (tid !== lastTopicId) {
        lastTopicId = tid;
        if (isRunning) stopReading();
        stoppedByUser = false;
        autoAttempts = 0;
        autoHold = false;                 // 换话题：本页「跑过了」的标记复位
        checkPageReady();
        maybeAutoStart();
        return;
      }
      if (!isRunning) {
        const info = getPageInfo();
        if (!maybeAutoStart(info)) {
          // 没开自动（或信息还没就绪）：只在楼层信息刚就绪时刷新一次状态文案
          if (info && info.totalReplies && (!currentTopicId || KitUI._rbStatus.includes('等待楼层信息'))) {
            checkPageReady();
          }
        }
      }
    }, 1000);

    checkPageReady();
    maybeAutoStart();                                   // 直接打开话题页：立刻试一次
    setTimeout(maybeAutoStart, 1500);                   // 慢加载兜底：之后每个心跳继续重试
  }

  // ================================================================
  // 模块 F：过盾重试（源：LINUX.DO CloudFlare Challenge Bypass v0.3.2，作者 Pipecraft / utags）
  //   Cloudflare 5 秒盾验证失败时，linux.do 会在页面上弹出错误对话框
  //   （「403 error」「我们无法加载该话题」「该回应是很久以前创建的」…），
  //   本模块检测到就把页面跳回 /challenge?redirect=<当前地址> 重过一次盾；
  //   盾页自身返回「页面不存在」时，按 redirect 参数或站点首页兜底返回，
  //   并有跳转冷却（默认 5 秒）防止两边来回弹跳。
  //   原脚本的 GM_registerMenuCommand 菜单命令改为面板按钮（立即跳转 / 重置记录）。
  // ================================================================
  function initCloudShield() {
    if (window.__ldkitCloudShield) return;
    window.__ldkitCloudShield = true;
    if (!document.body) return;

    const GUARD_KEY = 'ldkit.cf.guard.v1';        // 跳转冷却时间戳（sessionStorage，随标签页）
    let lastHref = location.href;

    function P() { return getParams('cfShield'); }

    function keywords() {
      return String(P().errorTexts || '')
        .split(/[,，\n]+/)
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
    }

    function challengePath() {
      let p = String(P().challengePath || '/challenge').trim();
      if (!p) p = '/challenge';
      if (p.charAt(0) !== '/') p = '/' + p;
      p = p.replace(/\/+$/, '');
      return p || '/challenge';
    }

    function isChallengePage() {
      const cp = challengePath();
      return location.pathname === cp || location.pathname.indexOf(cp + '/') === 0;
    }

    function isNotFoundPage() {
      return !!document.querySelector('.page-not-found');
    }

    function guardMs() {
      const n = Number(P().guardMs);
      return (isFinite(n) && n >= 0) ? Math.floor(n) : 5000;
    }

    // 跳转目标：challenge 盾页重过（默认）/ reload 重载本页 / home 回到首页
    function jumpMode() {
      const m = String(P().jumpMode || 'challenge');
      return (m === 'reload' || m === 'home') ? m : 'challenge';
    }

    function lastJumpAt() {
      try {
        const raw = sessionStorage.getItem(GUARD_KEY);
        const n = raw ? Number(raw) : 0;
        return isFinite(n) ? n : 0;
      } catch (e) { return 0; }
    }

    function markJump(ts) {
      try { sessionStorage.setItem(GUARD_KEY, String(ts)); } catch (e) { /* ignore */ }
    }

    function redirectParamUrl() {
      try {
        const raw = new URLSearchParams(location.search).get('redirect');
        if (!raw) return null;
        const url = new URL(raw, location.origin);
        if (url.origin !== location.origin) return null;
        return url.href;
      } catch (e) { return null; }
    }

    function say(text, dotClass, stickyMs) {
      try { KitUI.setCfStatus(text, stickyMs); } catch (e) { /* ignore */ }
      if (dotClass) { try { KitUI.setCfDot(dotClass); } catch (e) { /* ignore */ } }
    }

    // 盾页失效（页面不存在）→ 退回 redirect 指定的页面，否则回首页（可在参数里关掉）
    function backFromNotFound() {
      const now = Date.now();
      if (lastJumpAt() && now - lastJumpAt() < guardMs()) return false;
      const fromParam = redirectParamUrl();
      if (!fromParam && P().homeFallback === false) {
        say('盾页已失效，但没有可回退的地址（回首页已在参数里关闭）', 'err');
        return false;
      }
      const target = fromParam || (location.origin + '/');
      const fallback = location.origin + '/';
      markJump(now);
      say('盾页已失效，正在返回上一页…', 'warn');
      location.replace(target === location.href ? fallback : target);
      return true;
    }

    // 盾拦截失败：错误对话框里出现任一关键词
    function shieldFailed() {
      if (isChallengePage()) return false;
      const dialog = document.querySelector('.dialog-body');
      if (!dialog) return false;
      const text = dialog.textContent || '';
      if (!text) return false;
      const list = keywords();
      for (let i = 0; i < list.length; i++) if (text.indexOf(list[i]) !== -1) return true;
      return false;
    }

    // 纯决策：算出该不该跳、跳到哪（无副作用，便于自检与测试）
    function planJump(manual) {
      const mode = jumpMode();
      if (isChallengePage()) return { jump: false, reason: 'on-challenge', mode: mode, url: null };
      const now = Date.now();
      const since = now - lastJumpAt();
      if (!manual && lastJumpAt() && since < guardMs()) {
        return {
          jump: false, reason: 'cooldown', mode: mode, url: null,
          left: Math.max(1, Math.ceil((guardMs() - since) / 1000))
        };
      }
      if (mode === 'home') return { jump: true, reason: 'shield', mode: mode, url: location.origin + '/' };
      if (mode === 'reload') return { jump: true, reason: 'shield', mode: mode, url: location.href };
      return {
        jump: true, reason: 'shield', mode: mode,
        url: challengePath() + '?redirect=' + encodeURIComponent(location.href)
      };
    }

    function toChallenge(manual) {
      const plan = planJump(manual);
      if (!plan.jump) {
        if (plan.reason === 'on-challenge') say('已在盾页，无需跳转', 'on', 2500);
        else say('检测到盾拦截，冷却中（约 ' + plan.left + ' 秒后自动重试）', 'off');
        return false;
      }
      markJump(Date.now());
      say('检测到盾拦截失败，正在' + (plan.mode === 'home' ? '返回首页' : (plan.mode === 'reload' ? '重载本页' : '跳回盾页')) + '…', 'run');
      if (plan.mode === 'reload') location.reload();
      else location.href = plan.url;
      return true;
    }

    function checkAndJump() {
      if (!shieldFailed()) return false;
      return toChallenge(false);
    }

    function refreshReady() {
      if (isChallengePage()) {
        say(isNotFoundPage() ? '盾页失效：等 redirect 或首页兜底' : '正在盾页，等待验证通过', 'pause');
        return;
      }
      say('就绪：监听盾拦截提示（' + keywords().length + ' 条关键词）', 'on');
    }

    // ---- 面板按钮 ----
    KitUI.cfJump = function () { toChallenge(true); };
    KitUI.cfPlanJump = planJump;                 // 只读决策出口：不跳转，供自检/测试读取
    KitUI.cfResetGuard = function () {
      markJump(0);
      say('已重置跳转冷却，可立即重试', 'pause', 2500);
    };

    // ---- 启动 ----
    if (isChallengePage()) {
      refreshReady();
      if (isNotFoundPage()) { backFromNotFound(); return; }
    } else {
      refreshReady();
      if (checkAndJump()) return;
    }

    try {
      const MO = new MutationObserver(function () {
        if (isChallengePage()) {
          if (isNotFoundPage()) backFromNotFound();
          return;
        }
        checkAndJump();
      });
      MO.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) { /* ignore */ }

    // 盾拦截也可能由 XHR 失败后弹出：换页时重估，并周期兜住「盾页失效」这一路
    setInterval(function () {
      if (location.href !== lastHref) {
        lastHref = location.href;
        if (isChallengePage()) {
          if (isNotFoundPage()) { backFromNotFound(); return; }
          say('正在盾页，等待验证通过', 'pause');
          return;
        }
        refreshReady();
        if (checkAndJump()) return;
      }
      if (isChallengePage() && isNotFoundPage()) backFromNotFound();
    }, 1500);
  }
  // ================================================================
  // 模块 G：只看此人（本工具箱第七个功能）
  //   在每层楼的用户名右侧长出一个「只看此人」按钮，点一下直接套用 Discourse 原生的
  //   「话题中的 N 个帖子」筛选 —— 跳过「点头像 → 点话题中的帖子」两步。
  //
  //   实现：跳 /t/<slug>/<id>?username_filters=<用户名>。这条 query 正是官方的服务端筛选参数
  //   （路由侧 routes/topic.js 的 queryParams.username_filters，模型侧 post-stream.js 的
  //   streamFilters.username_filters），因此结果与官方入口完全一致：只列该用户的帖子、
  //   楼主帖恒定保留在首位，并带原生的「显示全部」提示条。
  //
  //   与官方的差别（正是本功能存在的理由）：官方那个入口藏在用户卡片里，且只在
  //   topicPostCount >= 2 时才出现（user-card-contents.gjs 的 enoughPostsForFiltering）——
  //   只发过一条帖子的用户根本点不出筛选。本功能不设这个门槛：单帖用户照样给按钮、照样能筛。
  // ================================================================
  function initOnlyUser() {
    if (window.__ldkitOnlyUser) return;
    window.__ldkitOnlyUser = true;

    var OU_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.7" cy="10" r="5.2"/><path d="m14.7 14 4.3 4.3"/></svg>';
    var OU_CSS = [
      '.ldkit-onlyuser{display:inline-flex;align-items:center;gap:3px;margin:0 6px 0 4px;padding:1px 7px;',
      'border:1px solid currentColor;border-radius:10px;font-size:10.5px;line-height:1.5;color:inherit;',
      'opacity:.55;text-decoration:none;cursor:pointer;vertical-align:middle;transition:opacity .15s ease}',
      '.ldkit-onlyuser:hover{opacity:1}',
      '.ldkit-onlyuser.on{opacity:.95}',
      '.ldkit-onlyuser.hover-only{visibility:hidden}',
      '.topic-post:hover .ldkit-onlyuser.hover-only{visibility:visible}'
    ].join('');
    var BTN_ATTR = 'data-ldkit-ou';

    // 面板可改的三项：按钮位置 / 是否带文字 / 是否悬停才显示（改动即时生效）
    var P = { anchor: 'name', showText: false, hoverOnly: false };
    function applyOuParams(p) {
      if (!p) return;
      if (p.anchor === 'name' || p.anchor === 'avatar') P.anchor = p.anchor;
      P.showText = !!p.showText;
      P.hoverOnly = !!p.hoverOnly;
      document.querySelectorAll('.ldkit-onlyuser').forEach(function (b) {
        if (b.parentNode) b.parentNode.removeChild(b);
      });
      document.querySelectorAll('.topic-post').forEach(function (n) { n.removeAttribute(BTN_ATTR); });
      document.querySelectorAll('.topic-post').forEach(addToPost);
      paintCurrent();
    }
    applyOuParams(getParams('onlyUser'));
    KitUI.paramHooks.onlyUser = applyOuParams;

    function injectCss() {
      if (document.getElementById('ldkit-onlyuser-css')) return;
      try {
        var st = document.createElement('style');
        st.id = 'ldkit-onlyuser-css';
        st.textContent = OU_CSS;
        (document.head || document.documentElement).appendChild(st);
      } catch (e) { /* ignore */ }
    }

    // 话题页基路径：/t/<slug>/<id>（丢掉 /<postNumber>、/last 之类的尾巴）
    function topicPath() {
      var m = location.pathname.match(/^\/t\/([^\/]+)\/(\d+)/);
      if (m) return '/t/' + m[1] + '/' + m[2];
      return null;
    }

    // 当前 URL 上的筛选用户（官方口径：逗号分隔的 username_filters）
    function currentFilter() {
      try {
        var raw = new URLSearchParams(location.search).get('username_filters');
        if (!raw) return [];
        return String(raw).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      } catch (e) { return []; }
    }

    // 生成 URL：保留既有 query，只改 username_filters；换筛选时回到第一屏
    function buildUrl(user, on) {
      var base = topicPath();
      if (!base) return null;
      var qs;
      try { qs = new URLSearchParams(location.search); } catch (e) { qs = new URLSearchParams(''); }
      if (on && user) qs.set('username_filters', user);
      else qs.delete('username_filters');
      var s = qs.toString();
      return base + (s ? ('?' + s) : '');
    }
    KitUI.buildOnlyUserUrl = buildUrl;          // 只读出口，供自检断言 URL 构造

    // 优先走 Discourse 站内路由（SPA 平滑切换）；拿不到路由就用整页跳转兜底
    function navigate(url) {
      try {
        var mod = window.require && window.require('discourse/lib/url');
        var DU = mod && (mod.default || mod);
        if (DU && typeof DU.routeTo === 'function') { DU.routeTo(url); return true; }
      } catch (e) { /* 退化到整页跳转 */ }
      location.href = url;
      return true;
    }

    // 三级回退取用户名：头像 data-user-card → 用户名行文本 → /u/ 链接
    function usernameOf(post) {
      var av = post.querySelector('.topic-avatar a[data-user-card], .post-avatar a[data-user-card], a[data-user-card]');
      if (av) {
        var u0 = (av.getAttribute('data-user-card') || '').trim();
        if (u0) return u0;
      }
      var nameEl = post.querySelector('.topic-meta-data .names .username');
      if (nameEl && nameEl.textContent && nameEl.textContent.trim()) return nameEl.textContent.trim();
      var link = post.querySelector('.topic-avatar a[href^="/u/"], .post-avatar a[href^="/u/"], .topic-meta-data .names a[href^="/u/"]');
      if (link) {
        var mo = (link.getAttribute('href') || '').match(/^\/u\/([^\/?#]+)/);
        if (mo) { try { return decodeURIComponent(mo[1]); } catch (e) { return mo[1]; } }
      }
      return null;
    }

    function paintCurrent() {
      if (!topicPath()) { KitUI.setOuDot('off'); return; }
      var on = currentFilter();
      if (on.length) {
        KitUI.setOuStatus('正在只看：' + on.join(' + ') + '（楼主帖恒在；点「显示全部」或站内原生提示条还原）');
        KitUI.setOuDot('run');
      } else {
        KitUI.setOuStatus('已就绪：每层楼用户名右侧的「只看此人」一点即筛（含单帖用户）');
        KitUI.setOuDot('on');
      }
    }

    function makeBtn(user) {
      var on = currentFilter();
      var isThis = on.some(function (u) { return u.toLowerCase() === String(user).toLowerCase(); });
      var a = document.createElement('a');
      a.className = 'ldkit-onlyuser' + (isThis ? ' on' : '') + (P.hoverOnly ? ' hover-only' : '');
      a.setAttribute(BTN_ATTR, '1');
      a.setAttribute('data-ldkit-ou-user', user);
      a.setAttribute('role', 'button');
      a.setAttribute('tabindex', '0');
      a.href = (isThis ? buildUrl(null, false) : buildUrl(user, true)) || '#';
      a.title = isThis ? '取消筛选，显示全部楼层' : ('只看 ' + user + ' 在本话题的帖子');
      a.innerHTML = OU_ICON + '<span class="ou-txt"' + ((P.showText || isThis) ? '' : ' style="display:none"') + '>' + (isThis ? '显示全部' : '只看此人') + '</span>';
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var cur = currentFilter();
        var stillThis = cur.some(function (u) { return u.toLowerCase() === String(user).toLowerCase(); });
        var url = stillThis ? buildUrl(null, false) : buildUrl(user, true);
        if (!url) { KitUI.setOuStatus('不在话题页，无法筛选', 2500); KitUI.setOuDot('err'); return; }
        KitUI.setOuStatus(stillThis ? '已还原：显示全部楼层' : ('只看 ' + user + '，正在切换…'), 2600);
        navigate(url);
      }, true);
      return a;
    }

    function addToPost(post) {
      if (!post || post.nodeType !== 1 || !post.classList || !post.classList.contains('topic-post')) return;
      if (post.getAttribute(BTN_ATTR)) return;
      var user = usernameOf(post);
      if (!user) return;
      injectCss();
      var btn = makeBtn(user);
      var placed = false;
      if (P.anchor === 'avatar') {
        var avHost = post.querySelector('.topic-avatar .post-avatar') || post.querySelector('.topic-avatar');
        if (avHost) { avHost.appendChild(btn); placed = true; }
      } else {
        // 用户名行之后、时间行之前 —— 与官方用户卡片入口同一视觉位置
        var names = post.querySelector('.topic-meta-data .names');
        if (names && names.parentNode) {
          names.parentNode.insertBefore(btn, names.nextSibling);
          placed = true;
        } else {
          var md = post.querySelector('.topic-meta-data');
          if (md) { md.appendChild(btn); placed = true; }
        }
      }
      if (!placed) return;
      post.setAttribute(BTN_ATTR, '1');
    }

    function scan() {
      if (!topicPath()) return;
      document.querySelectorAll('.topic-post').forEach(addToPost);
    }

    // 与「原生复制」同款：DOM 变化即时补 + 1.5s 周期兜底
    try {
      var MO = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (node.nodeType !== 1) continue;
            if (node.classList && node.classList.contains('topic-post')) addToPost(node);
            if (node.querySelectorAll) {
              var inner = node.querySelectorAll('.topic-post');
              for (var k = 0; k < inner.length; k++) addToPost(inner[k]);
            }
          }
        }
      });
      MO.observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* ignore */ }

    scan();
    paintCurrent();
    var lastHref = location.href;
    setInterval(function () {
      if (location.href !== lastHref) {          // 站内换页（含改筛选）：按钮重排 + 状态重画
        lastHref = location.href;
        document.querySelectorAll('.ldkit-onlyuser').forEach(function (b) {
          if (b.parentNode) b.parentNode.removeChild(b);
        });
        document.querySelectorAll('.topic-post').forEach(function (n) { n.removeAttribute(BTN_ATTR); });
        paintCurrent();
      }
      scan();
    }, 1500);

    // 子看板上的「显示全部」按钮：清掉筛选回全部
    KitUI.ouClear = function () {
      if (!currentFilter().length) {
        KitUI.setOuStatus('当前没有筛选，已在看全部楼层', 2500);
        KitUI.setOuDot('pause');
        return false;
      }
      var url = buildUrl(null, false);
      if (!url) { KitUI.setOuStatus('不在话题页，无法还原', 2500); KitUI.setOuDot('err'); return false; }
      KitUI.setOuStatus('正在还原：显示全部楼层…', 2600);
      navigate(url);
      return true;
    };
  }
  // ---------- 测试/调试出口（无副作用） ----------
  try {
    window.__LDB64__ = {
      version: '2.7.0',                        // 与脚本头 @version 保持同步（供调试与自检读取）
      flags: FLAGS,
      CFG: CFG,
      MANUAL: MANUAL,
      WS_RE: WS_RE,
      B64ISH_RE: B64ISH_RE,
      HIDDEN_SEL: HIDDEN_SEL,
      normalizeB64: normalizeB64,
      decodeOnce: decodeOnce,
      canDeepDecode: canDeepDecode,
      resolveText: resolveText,
      getPref: getPref,
      setPref: setPref,
      renderDecoded: renderDecoded,
      renderRaw: renderRaw,
      revealHidden: revealHidden,
      hiddenTextOf: hiddenTextOf,
      processTextNode: processTextNode,
      processCodeBlock: processCodeBlock,
      processHiddenBlock: processHiddenBlock,
      processCooked: processCooked,
      scanAll: scanAll,
      cleanInput: cleanInput,
      manualDecodeOnce: manualDecodeOnce,
      manualDecode: manualDecode,
      decodeManualInput: decodeManualInput,
      initReadBoost: initReadBoost,
      initCloudShield: initCloudShield,
      initOnlyUser: initOnlyUser,
      readBoost: KitUI,
      cloudShield: KitUI,
      FLAG_DEFS: FLAG_DEFS,
      PARAM_DEFS: PARAM_DEFS,
      getParams: getParams,
      saveParams: saveParams,
      resetParams: resetParams
    };
  } catch (e) { /* ignore */ }

  // ---------- 启动：外链解锁立即生效；其余模块等 DOM 就绪后按开关启动 ----------
  try { if (isOn('linkUnlock')) initLinkUnlock(); } catch (e) { /* 单个模块失败不影响其它 */ }

  function bootB64Observer() {
    if (window.__ldkitB64Observer) return;      // 脚本被求值两次时不重复挂观察器
    window.__ldkitB64Observer = true;
    const MO = new MutationObserver(function (muts) {
      const touched = new Set();
      for (const mu of muts) {
        for (const node of mu.addedNodes) {
          // 后插入的纯文本节点（解锁/展开/翻译后才写入正文的内容）
          if (node.nodeType === 3) {
            const pe = node.parentElement;
            if (!pe || (pe.closest && pe.closest('.ld-b64'))) continue;
            try { processTextNode(node); } catch (e) { /* ignore */ }
            if (CFG.hiddenBlocks) {
              const hb = pe.closest ? pe.closest(HIDDEN_SEL) : null;
              if (hb) {
                try { if (CFG.revealHidden) revealHidden(hb); } catch (e) { /* ignore */ }
                try { processHiddenBlock(hb); } catch (e) { /* ignore */ }
              }
            }
            continue;
          }
          if (node.nodeType !== 1) continue;
          if (node.classList && node.classList.contains('ld-b64')) continue;   // 我们自己插入的 span
          if (node.closest && node.closest('.ld-b64')) continue;
          if (node.id === UI_HOST_ID) continue;                                // 工具箱面板
          if (node.parentElement && node.parentElement.id === UI_HOST_ID) continue;
          if (node.classList && node.classList.contains('cooked')) { touched.add(node); continue; }
          if (node.querySelectorAll) node.querySelectorAll('.cooked').forEach(function (c) { touched.add(c); });
          // 帖子正文被替换进「已扫描过」的 .cooked 容器内部时（Discourse 常见），重扫该容器。
          // 只有新增子树里确实含候选串时才升级为整容器重扫：否则（hovercard、details 展开、
          // 站点插件改写）一次 TreeWalker 加每个隐藏块 cloneNode 都是白做。
          const hostEl = node.closest ? node.closest('.cooked') : null;
          if (hostEl) {
            TOKEN_RE.lastIndex = 0;
            if (TOKEN_RE.test(node.textContent || '')) touched.add(hostEl);
          }
        }
      }
      touched.forEach(function (h) {
        h.removeAttribute('data-ldb64-done');
        processCooked(h);
      });
    });
    MO.observe(document.body, { childList: true, subtree: true });
  }

  function bootDom() {
    if (window.__ldkitBooted) return;           // 不重复挂保活定时器与各模块
    window.__ldkitBooted = true;
    try { mountPanel(); } catch (e) {
      // 面板失败不影响各模块，但别把错误闷掉：留一份可自检的出口
      try { if (window.__LDB64__) window.__LDB64__.mountError = String((e && e.message) || e); } catch (e2) { /* ignore */ }
    }

    if (isOn('b64')) {
      try { scanAll(document); bootB64Observer(); } catch (e) { /* ignore */ }
    }
    try { if (isOn('mdCopy')) initMdCopy(); } catch (e) { /* ignore */ }
    try { if (isOn('autoReact')) initAutoReact(); } catch (e) { /* ignore */ }
    try { if (isOn('readBoost')) initReadBoost(); } catch (e) { /* ignore */ }
    try { if (isOn('cfShield')) initCloudShield(); } catch (e) { /* ignore */ }
    try { if (isOn('onlyUser')) initOnlyUser(); } catch (e) { /* ignore */ }

    // 宿主保活：Discourse 重建 body 时把面板补挂回来（开销极小）
    setInterval(function () {
      if (!document.getElementById(UI_HOST_ID)) {
        try { mountPanel(); } catch (e) { /* ignore */ }
      }
    }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootDom);
  } else {
    bootDom();
  }
})();
