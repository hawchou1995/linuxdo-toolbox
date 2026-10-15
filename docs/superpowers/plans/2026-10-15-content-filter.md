# 内容过滤实施与验收计划

**Goal:** 按已批准 `.pi/goal/继续完成工具箱统一内容过滤并验收发布-20261015-1509.md` 交付统一模块，不增加审批关卡。

**Architecture:** 单文件 userscript 内独立 ContentFilter 模块；纯配置校验与受限 Worker 匹配；DOM 保留并以 class 折叠；共享原面板注册表。只读当前路由 JSON 补元数据，不获取全部未加载帖子。

**Tech stack:** 原生 JavaScript、Worker/Blob、localStorage、现有 Playwright Chromium；无第三方运行时依赖。

## Tasks

- [ ] 核对 v2.9.0、量子速读 0.3（MIT）与 linuxdo-scripts 1.5.35（Apache-2.0），记录差距、出处与不采用的行为。
- [ ] 配置 schema：version=1、spam={enabled,maxChars,rules}、rules=[{id,name,enabled,target,conditions:[{field,op,value,flags}]}]。字段白名单、200 条总限、8 条件限、256 字符正则限、输入上限、Worker 超时。无效保存不落盘。
- [ ] 新增唯一 contentFilter 注册项（默认 false），面板可视规则编辑/删除/启停、JSON 导入导出与示例。已有七项配置保留。
- [ ] 列表/回复/直接打开话题提取快照；规则 AND/OR；水贴短门槛+预设且结构保护；折叠原因和展开按钮。SPA、节点复用、元数据更新重判；关闭恢复；随读回应显式跳过过滤隐藏内容。
- [ ] 新增 content-filter-selfcheck 场景，保留原 103 项；纯匹配、UI、DOM、动态、持久化、错误、超时与回归全绿；review 一次并修复复测。
- [ ] bsk 真实登录态测试，先备份配置，禁止自动社交与阅读写入，测试后还原；记录不含私人规则的验收摘要。
- [ ] 同步新版本、说明及测试数字；提交前 cached diff --check；正常推送 main；发布现有 GF 596713；版本历史与三方字节指纹核验；清理会话和临时任务。

## Commands

```powershell
node --check linuxdo-toolbox.user.js
node --check scripts/run-selfcheck.cjs
node scripts/run-selfcheck.cjs
git diff --check
git diff --cached --check
```

## Acceptance mapping

差距文档→AC1；唯一入口→AC2；水贴结构保护→AC3；schema/字段→AC4–5；面板及恢复→AC6；动态与兼容→AC7；自检/review/真机→AC8；三方发布→AC9；汇总与还原清理→AC10。
