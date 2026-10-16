# 内容过滤：对象、规则与使用

## 与现有功能的差距

v2.9.0 的 `FLAG_DEFS`（基线源码 282–291 行）有七项功能，没有水贴或黑名单规则引擎。`initOnlyUser`（基线 4192 行）调用官方 `postStream.filterParticipant`，是只看某人的正向筛选，不是屏蔽。`initAutoReact`（2764 行）、`initReadBoost`（3339 行）分别处理回应与已读同步，不能作为内容过滤实现。

新增 `contentFilter` 一个入口，独立源码 `scripts/content-filter.js`，嵌入发布的单文件 userscript。主面板共八项；旧七项配置不改，新模块默认关闭。设置开关即时生效，不要求刷新。

## 参考源码核对（2026-10-15）

- **Linux Do 量子速读 0.3**，作者量子咸鱼K，MIT。GreasyFork 529274：<https://greasyfork.org/zh-CN/scripts/529274-linux-do-量子速读/code>。源码 `CONFIG.MAX_CHARS=30`，`isMeaninglessReply` 去空白后先检查长度，再用正则或不分大小写的关键词识别；回复有折叠占位和点击恢复；连续回复数量超过 8 时另有分组收起。采用“长度+规则”和恢复概念；不采用宽泛的 `^.*(.)\1{1,}$` 重复字符规则、HTML 字符串拼入帖子正文、调试日志中输出真实正文或连续回复分组隐藏。我们的占位使用 textContent、不移除原节点。
- **anghunk/linuxdo-scripts 1.5.35**，Apache-2.0，核对 commit `987b25f1a87d20b4a2ea6fdbd0aa1c21463861e8`。源码：<https://github.com/anghunk/linuxdo-scripts/tree/987b25f1a87d20b4a2ea6fdbd0aa1c21463861e8/entrypoints/SettingComponents/CustomText>，`MenuBlockKeyword.vue` 标题/回复关键词不分大小写子串，`MenuBlockTags.vue` 标签子串，`MenuBlockuserlist.vue` 发起者/回复作者名单。它们使用 `.remove()` 和计数轮询；我们不采用不可恢复删除，也不采用标签默认子串；改成显式对象字段、标签默认精确成员和属性/内容变化重判。

未复制以上项目代码，独立实现，不引入其 jQuery、Vue、扩展框架或其他功能。参考项目及原工具箱作者署名保留。

## 面板操作

打开右下角「内容过滤」，启用总开关。子看板分三块：「水贴过滤」（可单独启停、调整 1–500 字门槛，默认 30 字）、「规则」（每条规则是一张卡片：启停开关 + 名称 + 对象标签 + 编辑 / 删除）、「配置」（可折叠的 JSON 区）。规则编辑器里按对象选择可用字段，点「保存这条规则」校验后保存。

JSON 折叠区显示完整配置，可手动复制、点击“复制导出”，或粘贴后点“校验并导入”。载入示例只填草稿，不自动保存。错误会显示“未保存”，既有有效配置保持不变。每个站点独立存储于 `ldkit.contentFilter.v1`，不跨站同步、不自动订阅外部规则。

## 对象与字段

| 规则对象 target | 作用 | 可用 field |
|---|---|---|
| `topic` | 列表中的话题；直接打开话题时折叠帖子流并保留展开入口 | `topicId`, `title`, `author`, `userId`, `tags`, `category`, `categoryId` |
| `post` | 加载出来的一条帖子，包括首帖 | `postId`, `body`, `author`, `userId`, `topicId`, `title`, `topicAuthor`, `tags`, `category`, `categoryId` |
| `user` | 该作者发的帖子、该发起者创建的话题 | `author`, `userId` 至少一个，另可用 `topicId`, `title`, `tags`, `category`, `categoryId` 限定所属话题 |

`author` 是用户名，不是昵称、最近回复者或被提及的人；用户规则不修改站点忽略/静音列表，也不阻止访问用户主页。`userId` 是作者数据库 ID，`postId` 是帖子数据库 ID，均不是楼层号。`topicAuthor` 专指所属话题发起者。`tags`、`category` 和 `categoryId` 属于话题，不是用户个人属性。


## 头像下快速本地屏蔽

话题帖子头像、`/u/<username>/summary` 资料头像和用户卡片头像下提供「本地屏蔽」按钮。它新增一条可在本机撤销的 `target: "user"` 规则：优先使用数字 `userId` 精确匹配；拿不到 ID 时使用用户名 `author` 精确匹配。首次添加成功后若内容过滤总开关关闭，会自动开启；再次点击撤销快速规则。若规则在面板中被停用，按钮显示「启用屏蔽」。

入口只读取当前帖子作者、用户卡片用户或资料页路由用户名；不按昵称、最近回复者、引用或提及对象屏蔽。规则仍受 200 条总限额约束，存储失败不会写入配置或打开总开关。面板中的手工规则不会被快速按钮修改或删除；所有快速规则也可从面板编辑、停用或删除。整个功能不操作站点忽略/静音设置。
正文按原帖子纯文本匹配；Base 解码显示不改变规则输入（已解码 span 按其原文载荷恢复后取文本）。水贴预设先去空白再检测，正文显式关键词不额外去空白。

## 匹配语义

- `op: "keyword"`：默认不分大小写的子串；`op: "exact"`：不分大小写的完整字符串，数组字段匹配任意一个成员。
- `op: "regex"`：JavaScript 正则源文本，不要外套 `/.../`。`flags` 允许 `i m s u g y`，不得重复。每次创建独立正则并重置 lastIndex，`g/y` 不会让重复结果漂移；`y` 本身仍遵守粘连匹配语义。
- 编辑器选择标签/类别时默认切换“精确”；需要子串或正则时显式选择。ID 必须使用数字字符串加 `exact`，类别不自动包含子类别。
- 一条规则 `conditions` 内全部成立（AND）；多条启用规则任一成立（OR）。按配置顺序显示首个命中的规则原因。
- 元数据不足、缺字段、过长文本不判命中，不通过未加载内容推测作者或标签。只读当前路由的列表/话题 JSON 补充元数据，不遍历下载全部未加载帖子；各站点按实际可取字段工作。
- 水贴必须同时满足短文本门槛和启用的预设；首帖、未知楼层及包含代码、引用、链接、图片、音视频、iframe、附件、onebox 的回复受保护。人工显式规则不受这些保护限制。

## 完整配置示例

```json
{
  "version": 1,
  "spam": {
    "enabled": true,
    "maxChars": 30,
    "rules": [
      {"id":"spam-1","name":"纯感谢","enabled":true,"op":"regex","value":"^(谢谢|thanks)[！!。.]*$","flags":"i"}
    ]
  },
  "rules": [
    {"id":"topic-1","name":"标题广告词且属于推广标签","enabled":true,"target":"topic","conditions":[{"field":"title","op":"keyword","value":"优惠"},{"field":"tags","op":"exact","value":"推广"}]},
    {"id":"post-1","name":"正文正则示例","enabled":false,"target":"post","conditions":[{"field":"body","op":"regex","value":"限时.{0,8}领取","flags":"i"}]},
    {"id":"user-1","name":"精确用户名","enabled":false,"target":"user","conditions":[{"field":"author","op":"exact","value":"example_user"}]},
    {"id":"category-1","name":"指定类别ID","enabled":false,"target":"topic","conditions":[{"field":"categoryId","op":"exact","value":"123"}]}
  ]
}
```

将示例改成自己的条件后保存。禁用条目也必须能通过格式校验；删除所有屏蔽规则用 `"rules": []`，不是保存一条空规则。恢复默认预设不会静默覆盖个人规则，完整 JSON 导入是显式替换配置。

## 恢复与其他功能

命中项前显示原因与“临时展开”；展开后可“重新折叠”。规则或内容变化会重新判定；关闭总开关、删除/停用规则会恢复原节点。列表占位是合法表格行，帖子不删除、不改服务器数据。显示过滤不自动改变站点未读统计，也**不自动取消或改变已读提速任务**。随读回应显式跳过被过滤隐藏的节点，展开后继续使用原可见性判断。

## 限额与错误

最多 200 条规则（含预设），每条最多 8 条件；正则源最多 256 字符，匹配值最多 1000 字符，配置 JSON 最多 200000 字符。匹配输入超过 20000 UTF-16 字符保持可见，每批最多 30 项、700000 字符；正则在可终止 Worker 中执行，启动 1800ms、匹配 250ms 超时。超时/CSP 禁止 Worker/异常均恢复可见并显示错误；相同失败快照不重复耗费 CPU，修改规则或内容后重试。不使用第三方依赖或云端内容审核。

## 构建与测试

```powershell
node scripts/build-content-filter.cjs
node scripts/build-content-filter.cjs --check
node scripts/run-selfcheck.cjs
node --check linuxdo-toolbox.user.js
node --check scripts/content-filter.js
node --check scripts/run-selfcheck.cjs
```

发布前另做所有内联脚本语法检查、暂存差异空白检查、真实页面验收和三方源码指纹核对；离线 mock 与真机结果分开报告。
