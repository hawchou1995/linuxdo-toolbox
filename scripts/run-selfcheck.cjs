'use strict';
/*
 * 「只看此人」离线自检执行器
 * ------------------------------------------------------------------
 * 起一个本地静态服务，把改后的用户脚本喂给 scripts/selfcheck.html，
 * 再用真实 Chromium（Playwright）跑两个场景并收集断言：
 *   场景 1（默认）：mock 话题 DOM + 注入脚本，验按钮位置 / 点击 URL / 单帖用户 /
 *                   重复扫描去重 / 已筛选态 / 非话题页 / 三个参数。
 *   场景 2（scenario=off）：把 onlyUser 关掉，验「关掉就不插任何按钮」。
 *
 * 用法：  node scripts/run-selfcheck.cjs
 * 可用环境变量：
 *   PLAYWRIGHT_CORE   playwright-core 所在目录（找不到时自动在全局 npm root 下搜）
 *   SELFCHECK_PORT    本地服务端口（默认 8791）
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const USERSCRIPT = path.join(ROOT, 'linuxdo-toolbox.user.js');
const PAGE = path.join(ROOT, 'scripts', 'selfcheck.html');
const PORT = Number(process.env.SELFCHECK_PORT || 8791);
const TOPIC_PATH = '/t/xxx/2998304';
const BASE = `http://127.0.0.1:${PORT}`;

function resolvePlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_CORE) candidates.push(process.env.PLAYWRIGHT_CORE);
  candidates.push('playwright-core');
  candidates.push('@playwright/mcp/node_modules/playwright-core');
  candidates.push('@mobilenext/mobile-mcp/node_modules/playwright-core');
  let globalRoot = '';
  try { globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim(); } catch (e) { /* ignore */ }
  if (globalRoot) {
    candidates.push(path.join(globalRoot, '@playwright', 'mcp', 'node_modules', 'playwright-core'));
    candidates.push(path.join(globalRoot, 'playwright-core'));
    candidates.push(path.join(globalRoot, '@mobilenext', 'mobile-mcp', 'node_modules', 'playwright-core'));
  }
  const errs = [];
  for (const c of candidates) {
    try { return require(c); } catch (e) { errs.push(`${c}: ${e.message}`); }
  }
  throw new Error('找不到 playwright-core，请设 PLAYWRIGHT_CORE。尝试过：\n  ' + errs.join('\n  '));
}

// 本机可能装着比 playwright-core 自带版本更旧或更新的 Chromium：直接指向磁盘上真实存在的那支可执行文件，
// 避免「playwright-core 期望 chromium-XXXX 而本机没有」导致启动失败。
function resolveExecutable() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cacheDir = process.env.PLAYWRIGHT_BROWSERS_PATH
    || path.join(process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local'), 'ms-playwright');
  const found = [];
  try {
    for (const name of fs.readdirSync(cacheDir)) {
      if (/^chromium-\d+$/.test(name)) {
        const exe = path.join(cacheDir, name, 'chrome-win64', 'chrome.exe');
        if (fs.existsSync(exe)) found.push({ name, exe, rev: Number(name.split('-')[1]) });
      }
    }
  } catch (e) { /* 没装就算了，让 playwright 自己找 */ }
  found.sort((a, b) => b.rev - a.rev);
  return found.length ? found[0].exe : undefined;
}
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, BASE);
    if (url.pathname === '/linuxdo-toolbox.user.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      fs.createReadStream(USERSCRIPT).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    fs.createReadStream(PAGE).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function runScenario(page, url, label) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__SELFCHECK_DONE__ === true', null, { timeout: 30000 });
  const results = await page.evaluate('window.__SELFCHECK_RESULTS__');
  const report = await page.evaluate("document.getElementById('report').textContent");
  return { label, results, report };
}

(async function main() {
  const pw = resolvePlaywright();
  const server = await startServer();
  const exe = resolveExecutable();
  if (exe) console.log('使用本机 Chromium：' + exe);
  const browser = await pw.chromium.launch(exe ? { headless: true, executablePath: exe } : { headless: true });
  const ctx = await browser.newContext({ locale: 'zh-CN' });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

  const scenarios = [];
  try {
    // 场景 1：默认（脚本自带开关：只有 onlyUser 开）
    scenarios.push(await runScenario(page, `${BASE}${TOPIC_PATH}?page=2`, '默认（只看此人开启）'));

    // 场景 2：把 onlyUser 关掉（先在同源写本地开关，再带 scenario=off 重进）
    await page.evaluate(() => localStorage.setItem('ldkit.flags.v1', JSON.stringify({
      b64: false, mdCopy: false, linkUnlock: false, autoReact: false, readBoost: false, cfShield: false, onlyUser: false
    })));
    scenarios.push(await runScenario(page, `${BASE}${TOPIC_PATH}?page=2&scenario=off`, '开关关闭（onlyUser=false）'));
  } finally {
    await page.close();
    await ctx.close();
    await browser.close();
    server.close();
  }

  let total = 0, pass = 0;
  for (const s of scenarios) {
    console.log('\n──────── 场景：' + s.label + ' ────────');
    for (const r of s.results) {
      total++;
      if (r.ok) pass++;
      console.log((r.ok ? '  PASS  ' : '  FAIL  ') + r.name + (r.detail ? '   << ' + r.detail : ''));
    }
  }
  console.log('\n════ 合计：' + pass + ' / ' + total + ' 项通过 ════');
  if (consoleErrors.length) {
    console.log('\n页面控制台错误（前 10 条）：');
    consoleErrors.slice(0, 10).forEach((e) => console.log('  - ' + e));
  }

  const failed = total - pass;
  if (failed > 0) {
    console.log('\nRESULT: FAIL');
    process.exit(1);
  }
  console.log('\nRESULT: PASS');
  process.exit(0);
})().catch((e) => {
  console.error('自检执行器失败：' + (e && e.stack || e));
  process.exit(2);
});
