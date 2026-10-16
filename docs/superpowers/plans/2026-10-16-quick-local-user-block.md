# 快速本地屏蔽用户 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在话题帖子、用户 summary 与用户卡片头像下挂载可撤销按钮，并通过既有内容过滤用户规则实现本地折叠。

**Architecture:** 在独立源码 `scripts/content-filter.js` 扩展用户快速规则 API、规则元信息校验、按钮挂载与状态同步；用 `scripts/build-content-filter.cjs` 嵌回单文件 userscript。专项浏览器自检使用真实 Chromium 与固定 DOM fixture 覆盖三个挂载点、身份回退、幂等和按钮行为；不扩展服务端写入。

**Tech Stack:** 原生 JavaScript、DOM、MutationObserver、localStorage、现有 Playwright Chromium 自检执行器。

## Global Constraints

- 快速屏蔽只修改本地配置 `ldkit.contentFilter.v1`，不调用站点忽略/静音接口。
- 身份主匹配优先数字 `userId`；无 ID 时按精确用户名匹配。
- 只过滤帖子作者与话题发起者，不匹配最近回复者、引用或提及对象。
- 配置总规则上限仍为 200 条；存储失败时不改当前配置，不自动开启总开关。
- 新功能的发布范围未获批准；只提交本地 Git 变更，不推送、不发布。

---

### Task 1: 快速规则 API 与身份元数据校验

**Files:**
- Modify: `scripts/content-filter.js`
- Modify: `scripts/content-filter-selfcheck.html`

**Interfaces:**
- `getQuickUserState(identity)` accepts `{ userId?: string|null, author?: string|null }` and returns `{ canMatch, blocked, ruleId }`.
- `toggleQuickUser(identity)` returns `{ ok, blocked, action, error? }`; `action` is `added`, `removed`, or `enabled`.
- A quick rule uses `target: "user"`, one exact condition, and `quickUser: { userId: string|null, author: string|null }` metadata. If the numeric ID exists, its sole condition is `userId`; otherwise its sole condition is `author`.

- [ ] Add self-checks for ID preference, username fallback, same-identity recognition when another view lacks ID, add/remove/re-enable transitions, 200-rule limit and storage-write failure.
- [ ] Run the existing self-check and verify these tests fail before the API exists.
- [ ] Extend `validate` to accept only well-formed `quickUser` metadata on a one-condition `target:user` exact rule; preserve existing JSON shape for all ordinary rules.
- [ ] Implement state lookup and toggle through the existing `save` path. Add/re-enable the quick rule before calling `setEnabled(true)` when global filtering is off; do not enable when save fails.
- [ ] Run `node scripts/run-selfcheck.cjs` and verify the API checks pass while existing assertions remain green.

### Task 2: Three avatar button mount points and state synchronization

**Files:**
- Modify: `scripts/content-filter.js`
- Modify: `scripts/content-filter-selfcheck.html`

**Interfaces:**
- The delegated mount routine creates one `.ldkit-quickblock-host[data-ldkit-quickblock]` below a discovered avatar and one button with `aria-pressed="true|false"`.
- `identityForAvatar(avatar, context)` uses `data-user-id`, `data-user-card`, `/u/<username>` links and, only on the matching summary route, the route username. It never uses display-name text or avatar alt text.

- [ ] Add fixtures for `.topic-post .topic-avatar .post-avatar`, `/u/alice/summary .user-profile-avatar`, and `.user-card .user-card-avatar`, including ID and username-only cases.
- [ ] Assert each fixture initially has one button, rescanning keeps one, and a dynamically inserted/replaced avatar receives one.
- [ ] Implement bounded selectors for those three contexts and insert a sibling host immediately after the avatar wrapper; prevent card click bubbling.
- [ ] Render `本地屏蔽` when inactive and `撤销屏蔽` when active; sync `aria-pressed`, title and text after rule save/remove/storage events and route updates.
- [ ] Add CSS that centers a compact button beneath the avatar without changing site avatar elements.
- [ ] Run the focused self-check and verify all three mounted-button transitions pass.

### Task 3: Build, regression checks and evidence

**Files:**
- Modify: `linuxdo-toolbox.user.js` (generated region only)
- Modify: `docs/content-filter.md`
- Modify: `docs/superpowers/specs/2026-10-16-quick-local-user-block-design.md`

- [ ] Update `scripts/content-filter.js` user-facing design notes and the usage document to document quick buttons, identity precedence and undo behavior.
- [ ] Run `node scripts/build-content-filter.cjs`, then `node scripts/build-content-filter.cjs --check`.
- [ ] Run `node --check linuxdo-toolbox.user.js`, `node --check scripts/content-filter.js`, and `node scripts/run-selfcheck.cjs`.
- [ ] Run `git diff --check`; verify the original 200 assertions and all new assertions pass.
- [ ] Attempt real logged-in page acceptance through the existing BrowserSkill session; if its daemon cannot be started from the host, record the exact failure and leave this acceptance explicitly outstanding.
- [ ] Inspect final diff/status; commit the design/plan before implementation and commit verified implementation separately. Do not push or publish.
