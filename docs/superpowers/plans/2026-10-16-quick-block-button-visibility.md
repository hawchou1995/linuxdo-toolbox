# Quick Local-Block Button Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Keep each step checked only after running its stated verification.

**Goal:** Add a persisted Content Filter panel switch that hides the three avatar-level quick-block entry points without changing saved rules or filtering behavior.

**Architecture:** Extend the existing `ldkit.contentFilter.v1` config with optional boolean `quickBlockButtons`, normalized to `true` for older configs. The Content Filter panel saves this flag and asks `scanQuickBlockButtons()` to remove or restore hosts; rule evaluation remains independent.

**Tech Stack:** Vanilla JavaScript, existing `localStorage` config, generated userscript via Node.js, offline Chromium/Playwright self-check.

## Global Constraints

- Keep `version: 1` and the existing storage key `ldkit.contentFilter.v1`.
- Default `quickBlockButtons` to `true`; legacy configs missing the property must continue to show the buttons.
- Hiding the three entry points must not remove, disable, or change existing local block rules; enabled rules continue filtering.
- Preserve the three existing DOM scopes: topic-post avatar, `/u/<username>/summary` avatar, and user-card avatar.
- Do not alter site ignore/mute settings or add per-entry controls.
- Local implementation only; do not publish to GreasyFork or push GitHub in this plan.

---

## File Structure

- `scripts/content-filter.js` — config default/normalization, Content Filter panel switch, and button-scan visibility gate.
- `scripts/content-filter-selfcheck.html` — schema, UI, DOM, filtering-independence, and reload-persistence assertions.
- `linuxdo-toolbox.user.js` — generated module embedding plus synchronized script version, panel version, debug version, and release note.
- `README.md` — current feature/version summary and test count.
- `docs/content-filter.md` — quick-block switch behavior and compatibility description.
- `docs/content-filter-verification.md` — local v2.12.0 verification record; explicitly not a GF publication receipt.

## Task 1: Config compatibility

**Files:**
- Modify: `scripts/content-filter.js`
- Modify: `scripts/content-filter-selfcheck.html`
- Generated: `linuxdo-toolbox.user.js`

- [x] **Step 1: Add three config assertions** after the existing `config` helper in `scripts/content-filter-selfcheck.html`:

```js
const legacyQuickConfig = {version:1,spam:{enabled:false,maxChars:30,rules:[]},rules:[]};
const legacyQuickResult = F.validate(legacyQuickConfig);
ok('QUICKCFG 默认显示快速按钮', F.defaults().quickBlockButtons === true);
ok('QUICKCFG 旧配置缺字段默认开启', legacyQuickResult.ok && legacyQuickResult.config.quickBlockButtons === true);
ok('QUICKCFG 非布尔值拒绝导入', !F.validate({...legacyQuickConfig,quickBlockButtons:'false'}).ok);
```

- [x] **Step 2: Run the suite and verify the new tests fail for the intended reason.**

Run: `node scripts/run-selfcheck.cjs`
Expected: the existing checks remain passing; the three new `QUICKCFG` assertions fail because the field is not implemented yet.

- [x] **Step 3: Add defaulting and validation in `scripts/content-filter.js`.** Add `quickBlockButtons: true` to `defaults()`. In `validate(raw)`, after cloning and validating the required top-level fields, normalize only an absent property and reject any other non-boolean value:

```js
if (c.quickBlockButtons === undefined) c.quickBlockButtons = true;
if (typeof c.quickBlockButtons !== 'boolean') throw Error('快捷按钮设置必须为布尔值');
```

- [x] **Step 4: Rebuild the embedded module and verify config tests.**

- Run: `node scripts/build-content-filter.cjs`
- Run: `node scripts/run-selfcheck.cjs`
Expected: `QUICKCFG` tests pass and the suite reports **222 / 222**.

## Task 2: Panel switch and DOM behavior

**Files:**
- Modify: `scripts/content-filter.js`
- Modify: `scripts/content-filter-selfcheck.html`
- Generated: `linuxdo-toolbox.user.js`

- [x] **Step 1: Add a guarded UI test for the default switch.** After `const cfPanel = sh.querySelector('.cf-panel');`, assert that `.cf-quick-buttons-on` exists and starts checked. Keep the assertion null-safe so the pre-implementation run reports a test failure rather than aborting the page.

```js
const quickButtonsSwitch = cfPanel.querySelector('.cf-quick-buttons-on');
ok('QUICKUI 快捷按钮开关默认开启', !!quickButtonsSwitch && quickButtonsSwitch.checked);
```

- [x] **Step 2: Add four DOM/UI assertions.** In the existing quick-button fixture stage, create one `.topic-post`, one `.user-profile-avatar`, and one `.user-card` together. Add a quick user rule for the topic author with `F.toggleQuickUser({userId:'8',author:'alice'})`, then exercise the switch. Assert: the checkbox is present; turning it off removes all three `.ldkit-quickblock-host` nodes; the rule remains stored and `F.scan(fixture)` still folds the matching post; turning it on restores the three hosts and the topic button’s blocked state. Add exactly four `ok()` assertions in total for this UI/DOM behavior.

- [x] **Step 3: Implement the panel switch.** In `ContentFilter.mount()`, add a “快捷入口” section with a `.cf-quick-buttons-on` checkbox labelled “显示头像下的本地屏蔽按钮” and helper text “关闭仅隐藏按钮；已保存的本地屏蔽规则继续生效。” Initialize `checked` from `config.quickBlockButtons`. On `change`, clone the current config, set the property, call `save(next)`, and after successful save call `scanQuickBlockButtons()` immediately. If save fails, restore the checkbox from the unchanged `config.quickBlockButtons`; `save()` already writes the error to the panel status.

- [x] **Step 4: Gate mounting in `scanQuickBlockButtons()`.** At function entry, when `config.quickBlockButtons` is false, remove every `.ldkit-quickblock-host[data-ldkit-quickblock]` and return before collecting targets. Do not touch `config.rules`, `FLAGS.contentFilter`, `scan()`, or fold/restore state.

- [x] **Step 5: Rebuild and run the suite.**

- Run: `node scripts/build-content-filter.cjs`
- Run: `node scripts/run-selfcheck.cjs`
Expected: the three `QUICKCFG` and five `QUICKUI` assertions pass; suite reports **227 / 227** before the reload assertion is added.

## Task 3: Reload persistence, version, and docs

**Files:**
- Modify: `scripts/content-filter-selfcheck.html`
- Modify: `linuxdo-toolbox.user.js`
- Modify: `README.md`
- Modify: `docs/content-filter.md`
- Modify: `docs/content-filter-verification.md`

- [x] **Step 1: Add the reload persistence assertion.** In the `/filter-persist` branch, assert `F.getConfig().quickBlockButtons === false`. Before the existing test finishes and navigates to `/filter-persist`, save the existing two persistence rules with `quickBlockButtons:false`. This adds exactly one assertion, so the final suite target is **228 / 228** (219 baseline + 3 config + 5 UI/DOM + 1 persistence).

- [x] **Step 2: Update version and docs.** Set the userscript header `@version`, panel footer, and debug `version` to `2.12.0`; add a source changelog entry that says the Content Filter panel can hide avatar-level quick-block buttons while saved rules remain active. Update the README’s feature summary and the “头像下快速本地屏蔽” section in `docs/content-filter.md` with the default-on and rules-continue behavior. Add a v2.12.0 local verification section to `docs/content-filter-verification.md`; state clearly that this task does not publish to GreasyFork.

- [x] **Step 3: Rebuild and run all checks.**

- Run: `node scripts/build-content-filter.cjs`
- Run: `node --check scripts/content-filter.js`
- Run: `node --check linuxdo-toolbox.user.js`
- Run: `node --check scripts/run-selfcheck.cjs`
- Run: `node scripts/build-content-filter.cjs --check`
- Run: `node scripts/run-selfcheck.cjs`
- Run: `git diff --check`
Expected: exact embedded-source match, valid syntax, **228 / 228 PASS**, and no whitespace errors. Keep the implementation changes local and uncommitted unless asked to commit or publish.
