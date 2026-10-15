  // Content filtering is display-only. This source is embedded by build-content-filter.cjs.
  const ContentFilter = (function () {
    'use strict';
    const KEY = 'ldkit.contentFilter.v1';
    const FIELDS = {
      topic: ['topicId', 'title', 'author', 'userId', 'tags', 'category', 'categoryId'],
      post: ['postId', 'body', 'author', 'userId', 'topicId', 'title', 'topicAuthor', 'tags', 'category', 'categoryId'],
      user: ['author', 'userId', 'topicId', 'title', 'tags', 'category', 'categoryId']
    };
    const LABELS = { topicId: '话题 ID', postId: '帖子 ID', title: '话题标题', body: '帖子正文', author: '作者用户名', userId: '作者 ID', topicAuthor: '话题发起者', tags: '标签', category: '类别名称', categoryId: '类别 ID' };
    const defaults = () => ({ version: 1, spam: { enabled: true, maxChars: 30, rules: [
      { id: 'spam-thanks', name: '纯感谢短语', enabled: true, op: 'regex', value: '^(谢谢|感谢分享|谢谢分享|感谢大佬|thanks|thx)[！!。.~～]*$', flags: 'i' },
      { id: 'spam-mark', name: '占位短语', enabled: true, op: 'regex', value: '^(mark|插眼|前排|沙发|帮顶|签到|打卡|来了)[！!。.~～]*$', flags: 'i' },
      { id: 'spam-laugh', name: '纯笑声或数字', enabled: true, op: 'regex', value: '^(哈{2,}|嘿{2,}|6{2,}|666)[！!。.~～]*$', flags: 'i' }
    ] }, rules: [] });
    let config = defaults(), epoch = 0, timer = null, busy = false, dirty = false, mounted = null;
    let lastRoute = '', metadata = null, metadataRoute = '', fetchRoute = '', fetchController = null, notice = '';
    let fetchAttempts = 0, retryAt = 0;
    const states = new Map();
    let cachedFingerprint = '', cachedMatches = null, cachedError = '';
    const bounded = value => String(value == null ? '' : value).slice(0, 20001);
    function validate(raw) {
      try {
        if (typeof raw === 'string') {
          if (raw.length > 200000) throw Error('配置不得超过 200000 字符');
          raw = JSON.parse(raw);
        }
        const c = JSON.parse(JSON.stringify(raw));
        if (!c || c.version !== 1 || !c.spam || !Array.isArray(c.rules) || !Array.isArray(c.spam.rules)) throw Error('需要 version=1、spam 和 rules 数组');
        if (typeof c.spam.enabled !== 'boolean' || !Number.isInteger(c.spam.maxChars) || c.spam.maxChars < 1 || c.spam.maxChars > 500) throw Error('水贴门槛必须是 1–500 的整数');
        if (c.rules.length + c.spam.rules.length > 200) throw Error('最多 200 条规则（含水贴预设）');
        const ids = new Set();
        const checkPattern = (p, idField) => {
          if (!p || !['exact', 'keyword', 'regex'].includes(p.op)) throw Error('匹配方式须为 exact / keyword / regex');
          if (typeof p.value !== 'string' || !p.value.trim() || p.value.length > 1000) throw Error('匹配值必须为非空字符串（最多 1000 字符）');
          if (idField && (p.op !== 'exact' || !/^\d+$/.test(p.value))) throw Error('ID 只允许数字字符串的精确匹配');
          if (p.flags !== undefined && typeof p.flags !== 'string') throw Error('flags 必须是字符串');
          if (p.op === 'regex') {
            if (p.value.length > 256 || !/^[imsugy]*$/.test(p.flags || '') || new Set(p.flags || '').size !== (p.flags || '').length) throw Error('正则最多 256 字符；flags 仅允许 i m s u g y 且不重复');
            new RegExp(p.value, p.flags || '');
          } else if (p.flags) throw Error('非正则规则不可设置 flags');
        };
        const checkHeader = r => {
          if (!r || typeof r.id !== 'string' || !r.id || r.id.length > 80 || ids.has(r.id)) throw Error('规则 ID 必须非空且唯一（最多 80 字符）');
          ids.add(r.id);
          if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 100 || typeof r.enabled !== 'boolean') throw Error('规则需要名称和 enabled 布尔值');
        };
        c.spam.rules.forEach(r => { checkHeader(r); checkPattern(r, false); });
        c.rules.forEach(r => {
          checkHeader(r);
          if (!Object.prototype.hasOwnProperty.call(FIELDS, r.target)) throw Error('对象必须是 topic / post / user');
          if (!Array.isArray(r.conditions) || r.conditions.length < 1 || r.conditions.length > 8) throw Error('每条规则须有 1–8 个 AND 条件');
          if (r.target === 'user' && !r.conditions.some(p => p.field === 'author' || p.field === 'userId')) throw Error('用户规则须包含用户名或用户 ID 条件');
          r.conditions.forEach(p => {
            if (!p || !FIELDS[r.target].includes(p.field)) throw Error('字段不适用于所选对象：' + (p && p.field));
            checkPattern(p, /Id$/.test(p.field));
          });
        });
        if (JSON.stringify(c).length > 200000) throw Error('配置过大');
        return { ok: true, config: c };
      } catch (e) { return { ok: false, error: '未保存：' + e.message }; }
    }
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) { const v = validate(saved); if (v.ok) config = v.config; else notice = v.error; }
    } catch (e) { notice = '无法读取本地过滤配置'; }

    // Runs only in a disposable Worker, never on the UI thread.
    function workerMain() {
      const test = (p, values) => {
        if (values == null) return false;
        const list = Array.isArray(values) ? values : [values];
        return list.some(v => {
          if (v == null || String(v).length > 20000) return false;
          const s = String(v); if (!s.trim()) return false;
          if (p.op === 'exact') return s.toLowerCase() === p.value.toLowerCase();
          if (p.op === 'keyword') return s.toLowerCase().includes(p.value.toLowerCase());
          const re = new RegExp(p.value, p.flags || '');
          re.lastIndex = 0;
          return re.test(s);
        });
      };
      self.onmessage = e => {
        try {
          const { config: c, items } = e.data;
          const results = items.map(item => {
            for (const r of c.rules) {
              if (!r.enabled || (r.target !== item.kind && r.target !== 'user')) continue;
              if (r.conditions.every(p => test(p, item[p.field]))) return { id: r.id, reason: r.name };
            }
            if (item.kind === 'post' && c.spam.enabled && item.postNumber > 1 && !item.protected) {
              const text = (item.body || '').replace(/\s+/g, '');
              if (text && [...text].length <= c.spam.maxChars) {
                const r = c.spam.rules.find(p => p.enabled && test(p, text));
                if (r) return { id: r.id, reason: '水贴预设：' + r.name };
              }
            }
            return null;
          });
          self.postMessage({ results });
        } catch (err) { self.postMessage({ error: err.message }); }
      };
      self.postMessage({ ready: true });
    }
    function evaluate(items, c) {
      return new Promise((resolve, reject) => {
        if (!Array.isArray(items) || items.length > 30 || JSON.stringify(items).length > 700000) { reject(Error('匹配批次超过资源限额')); return; }
        let worker, url, timeout, settled = false;
        const finish = (error, value) => {
          if (settled) return;
          settled = true; clearTimeout(timeout);
          if (worker) worker.terminate();
          if (url) URL.revokeObjectURL(url);
          if (error) reject(error); else resolve(value);
        };
        try {
          url = URL.createObjectURL(new Blob(['(' + workerMain.toString() + ')()'], { type: 'text/javascript' }));
          worker = new Worker(url);
          timeout = setTimeout(() => finish(Error('正则 Worker 启动超时，内容保持可见')), 1800);
          worker.onerror = () => finish(Error('正则 Worker 不可用（可能被 CSP 限制），内容保持可见'));
          worker.onmessage = e => {
            if (e.data.ready) {
              clearTimeout(timeout);
              timeout = setTimeout(() => finish(Error('正则匹配超时（250ms），内容保持可见')), 250);
              worker.postMessage({ items, config: c || config });
            } else if (e.data.error) finish(Error(e.data.error));
            else finish(null, e.data.results);
          };
        } catch (e) { finish(Error('匹配 Worker 创建失败：' + e.message)); }
      });
    }
    function save(raw) {
      const v = validate(raw);
      if (!v.ok) { status(v.error); return v; }
      try { localStorage.setItem(KEY, JSON.stringify(v.config)); }
      catch (e) { const error = '未保存：本地存储不可写'; status(error); return { ok: false, error }; }
      config = v.config; epoch++; restoreAll(); renderRules(); schedule(); status('规则已保存');
      return { ok: true };
    }
    function status(text) {
      notice = text;
      if (mounted) { const el = mounted.querySelector('.cf-message'); if (el && el.textContent !== text) el.textContent = text; }
    }
    function setEnabled(value) {
      setFlag('contentFilter', value); epoch++;
      if (!value) { if (fetchController) fetchController.abort(); fetchController = null; fetchRoute = ''; fetchAttempts = 0; retryAt = 0; restoreAll(); status('内容过滤已关闭'); }
      else { status('内容过滤已开启'); schedule(); }
      if (KitUI.onDot) KitUI.onDot('contentFilter', value ? 'on' : 'off');
    }
    function restore(el) {
      const state = states.get(el);
      if (!state) return;
      el.classList.remove('ldkit-filter-folded'); el.removeAttribute('data-ldkit-filter-folded');
      state.placeholder.remove(); states.delete(el);
    }
    function restoreAll() { Array.from(states.keys()).forEach(restore); }
    function fold(el, match, signature) {
      let state = states.get(el);
      if (state && (state.signature !== signature || !state.placeholder.isConnected)) { restore(el); state = null; }
      if (state) { if (!state.expanded) { el.setAttribute('data-ldkit-filter-folded', '1'); } return; }
      const row = el.tagName === 'TR';
      const placeholder = document.createElement(row ? 'tr' : 'div');
      placeholder.className = 'ldkit-filter-placeholder';
      const box = row ? placeholder.appendChild(document.createElement('td')) : placeholder;
      if (row) box.colSpan = Math.max(1, el.children.length);
      const reason = document.createElement('span'); reason.textContent = '已过滤 · ' + match.reason + ' ';
      const button = document.createElement('button'); button.type = 'button'; button.textContent = '临时展开';
      box.append(reason, button);
      state = { placeholder, signature, expanded: false };
      button.addEventListener('click', () => {
        state.expanded = !state.expanded;
        el.classList.toggle('ldkit-filter-folded', !state.expanded);
        if (state.expanded) el.removeAttribute('data-ldkit-filter-folded'); else el.setAttribute('data-ldkit-filter-folded', '1');
        button.textContent = state.expanded ? '重新折叠' : '临时展开';
      });
      if (el.matches('.topic-post')) el.prepend(placeholder); else el.before(placeholder);
      el.classList.add('ldkit-filter-folded'); el.setAttribute('data-ldkit-filter-folded', '1'); states.set(el, state);
    }
    function currentRoute() { return location.pathname + location.search; }
    const currentTopicId = () => (location.pathname.match(/^\/t\/(?:[^/]+\/)?(\d+)/) || [])[1] || null;
    function modelTopic() {
      try {
        const mod = window.require && window.require('discourse/lib/url');
        const container = mod && (mod.default || mod).container;
        const ctrl = container && container.lookup('controller:topic');
        const m = ctrl && (ctrl.get ? ctrl.get('model') : ctrl.model);
        if (m && String(m.id) === currentTopicId()) return m;
      } catch (e) { /* DOM/JSON fallback */ }
      return null;
    }
    function topicMeta() {
      const id = currentTopicId();
      const m = modelTopic();
      const j = metadataRoute === currentRoute() ? metadata : null;
      const data = m || (j && j.id && String(j.id) === id ? j : null);
      const categoryId = data && (data.category_id || (data.category && data.category.id));
      const tagNodes = document.querySelectorAll('#topic-title .discourse-tag');
      const by = data && data.details && data.details.created_by;
      return {
        topicId: id,
        title: bounded(data && data.title || document.querySelector('#topic-title h1')?.textContent || document.querySelector('h1 .fancy-title')?.textContent || ''),
        topicAuthor: by && by.username || null,
        categoryId: categoryId ? String(categoryId) : document.querySelector('#topic-title [data-category-id]')?.getAttribute('data-category-id') || null,
        category: data && data.category && data.category.name || document.querySelector('#topic-title .category-name')?.textContent?.trim() || null,
        tags: tagNodes.length ? Array.from(tagNodes, t => t.textContent.trim()) : (data && Array.isArray(data.tags) ? data.tags.map(t => typeof t === 'string' ? t : t.name) : null),
        author: by && by.username || null, userId: by && by.id ? String(by.id) : null
      };
    }
    function readPost(el, meta) {
      const article = el.querySelector('article[data-post-id], article[id^="post_"]') || el;
      const id = article.getAttribute('data-post-id') || el.getAttribute('data-post-id') || null;
      const num = Number(el.getAttribute('data-post-number') || article.getAttribute('data-post-number')) || 0;
      const cooked = el.querySelector('.cooked');
      let body = null;
      if (cooked) {
        if (cooked.querySelector('.ld-b64')) {
          const clone = cooked.cloneNode(true);
          clone.querySelectorAll('.ld-b64').forEach(n => { n.textContent = n.dataset.raw || ''; });
          body = bounded(clone.textContent.trim());
        } else body = bounded(cooked.textContent.trim());
      }
      const authorNode = el.querySelector('.topic-meta-data .names [data-user-card], .topic-avatar [data-user-card]');
      const name = authorNode?.getAttribute('data-user-card') || el.querySelector('.topic-meta-data .username')?.textContent?.trim() || null;
      const j = metadataRoute === currentRoute() && metadata;
      const post = j && j.post_stream && j.post_stream.posts && j.post_stream.posts.find(p => id ? String(p.id) === id : p.post_number === num);
      return Object.assign({}, meta, { kind: 'post', postId: id || (post ? String(post.id) : null), postNumber: num,
        author: name || post && post.username || null,
        userId: article.getAttribute('data-user-id') || el.getAttribute('data-user-id') || (post && post.user_id ? String(post.user_id) : null),
        body, protected: !num || !!cooked?.querySelector('pre, code, blockquote, aside.quote, a, img, video, audio, iframe, .attachment, .lightbox, .onebox') });
    }
    function collect(scope) {
      const root = scope || document, records = [], meta = topicMeta();
      const j = metadataRoute === currentRoute() && metadata;
      root.querySelectorAll('.topic-list-item:not(.ldkit-filter-placeholder)').forEach(el => {
        const link = el.querySelector('.raw-topic-link, a.title');
        const id = el.getAttribute('data-topic-id') || (link?.getAttribute('href')?.match(/\/t\/(?:[^/]+\/)?(\d+)/) || [])[1] || null;
        const topic = j && j.topic_list && j.topic_list.topics && j.topic_list.topics.find(t => String(t.id) === id);
        const posterId = topic && topic.posters && topic.posters[0] && topic.posters[0].user_id;
        const author = j && j.users && j.users.find(u => u.id === posterId);
        // Only the first poster is the topic starter, never the latest responder.
        const starter = el.querySelector('.posters > a:first-child[data-user-card]');
        const tagNodes = el.querySelectorAll('.discourse-tags .discourse-tag, .discourse-tags a');
        const item = { kind: 'topic', topicId: id, title: link ? bounded(link.textContent.trim()) : null,
          author: author && author.username || starter?.getAttribute('data-user-card') || null,
          userId: author ? String(author.id) : starter?.getAttribute('data-user-id') || null,
          tags: tagNodes.length ? Array.from(tagNodes, t => t.textContent.trim()) : (topic && Array.isArray(topic.tags) ? topic.tags.map(t => typeof t === 'string' ? t : t.name) : null),
          categoryId: topic && topic.category_id ? String(topic.category_id) : el.querySelector('[data-category-id]')?.getAttribute('data-category-id') || el.getAttribute('data-category-id') || null,
          category: el.querySelector('.category-name')?.textContent?.trim() || null };
        records.push({ el, item });
      });
      root.querySelectorAll('.topic-post').forEach(el => records.push({ el, item: readPost(el, meta) }));
      const stream = root.querySelector('.post-stream');
      if (stream && meta.topicId) records.unshift({ el: stream, item: Object.assign({ kind: 'topic' }, meta) });
      return records;
    }
    function enrich() {
      const route = currentRoute();
      if (fetchRoute === route || !isOn('contentFilter') || fetchAttempts >= 2 || Date.now() < retryAt) return;
      const topicId = currentTopicId();
      const path = location.pathname.replace(/\/$/, '');
      if (!topicId && !/^\/(latest|new|unread|top|hot|categories|c\/|tag\/|tags\/)/.test(path)) return;
      fetchRoute = route; fetchAttempts++;
      if (fetchController) fetchController.abort();
      fetchController = new AbortController();
      const controller = fetchController;
      const stop = setTimeout(() => controller.abort(), 7000);
      const url = topicId ? '/t/' + topicId + '.json' : path + '.json' + location.search;
      fetch(url, { credentials: 'same-origin', signal: controller.signal }).then(r => {
        if (!r.ok) throw Error('metadata unavailable'); return r.text();
      }).then(text => {
        if (text.length > 2000000) throw Error('metadata too large');
        const j = JSON.parse(text);
        if (route === currentRoute() && isOn('contentFilter')) { metadata = j; metadataRoute = route; schedule(); }
      }).catch(() => {
        if (fetchController === controller && route === currentRoute()) { fetchRoute = ''; retryAt = Date.now() + 3000; }
      }).finally(() => { clearTimeout(stop); if (fetchController === controller) fetchController = null; });
    }
    async function scan(scope) {
      if (!isOn('contentFilter')) { restoreAll(); return; }
      if (busy) { dirty = true; return; }
      busy = true;
      const runEpoch = epoch, route = currentRoute();
      try {
        const records = collect(scope), alive = new Set(records.map(r => r.el));
        if (!scope) states.forEach((s, el) => { if (!el.isConnected || !alive.has(el)) restore(el); });
        const fingerprint = route + ':' + runEpoch + ':' + JSON.stringify(records.map(r => r.item));
        let matches;
        if (fingerprint === cachedFingerprint) {
          if (cachedError) throw Error(cachedError);
          matches = cachedMatches;
        } else {
          matches = [];
          try {
            for (let i = 0; i < records.length; i += 30) {
              const batch = records.slice(i, i + 30);
              matches.push(...await evaluate(batch.map(r => r.item)));
              if (runEpoch !== epoch || route !== currentRoute() || !isOn('contentFilter')) return;
            }
            cachedFingerprint = fingerprint; cachedMatches = matches; cachedError = '';
          } catch (e) { cachedFingerprint = fingerprint; cachedMatches = null; cachedError = e.message; throw e; }
        }
        records.forEach((r, i) => {
          if (matches[i]) fold(r.el, matches[i], route + JSON.stringify(r.item) + matches[i].id + runEpoch);
          else restore(r.el);
        });
        status('已过滤 ' + matches.filter(Boolean).length + ' 项（仅本地显示）');
      } catch (e) { restoreAll(); status(e.message); }
      finally { busy = false; if (dirty) { dirty = false; schedule(); } }
    }
    function schedule() {
      if (!isOn('contentFilter')) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; scan(); }, 120);
    }
    function init() {
      if (document.getElementById('ldkit-filter-style')) return;
      const style = document.createElement('style'); style.id = 'ldkit-filter-style';
      style.textContent = '.ldkit-filter-folded:not(.topic-post),[data-ldkit-filter-folded="1"]:not(.topic-post){display:none!important}.topic-post[data-ldkit-filter-folded="1"]>:not(.ldkit-filter-placeholder){display:none!important}.ldkit-filter-placeholder{padding:8px;border:1px dashed var(--primary-low,#aaa);border-radius:6px;margin:5px 0;font-size:12px}.ldkit-filter-placeholder button{cursor:pointer;margin-left:8px}';
      document.head.appendChild(style);
      const observer = new MutationObserver(mutations => {
        if (mutations.some(m => {
          const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          if (!el || el.closest('.ldkit-filter-placeholder, #ldb64-manual-host')) return false;
          if (m.type === 'childList' && [...m.addedNodes, ...m.removedNodes].every(n => n.nodeType === 1 && (n.classList.contains('ldkit-filter-placeholder') || n.id === 'ldb64-manual-host'))) return false;
          return true;
        })) schedule();
      });
      observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-post-id', 'data-topic-id', 'data-post-number', 'data-user-card', 'data-user-id', 'data-category-id', 'href'] });
      setInterval(() => {
        const route = currentRoute();
        if (route !== lastRoute) { lastRoute = route; epoch++; metadata = null; metadataRoute = ''; fetchRoute = ''; fetchAttempts = 0; retryAt = 0; restoreAll(); }
        if (isOn('contentFilter')) { enrich(); schedule(); }
      }, 1500);
      window.addEventListener('storage', e => {
        if (e.key === KEY) { const v = validate(e.newValue || defaults()); if (v.ok) { config = v.config; epoch++; restoreAll(); renderRules(); schedule(); } }
        if (e.key === FLAGS_KEY) { try {
          const f = JSON.parse(e.newValue); FLAGS.contentFilter = !!(f && f.contentFilter); epoch++; restoreAll();
          if (!FLAGS.contentFilter) { if (fetchController) fetchController.abort(); fetchController = null; fetchRoute = ''; fetchAttempts = 0; retryAt = 0; }
          if (KitUI.onDot) KitUI.onDot('contentFilter', FLAGS.contentFilter ? 'on' : 'off');
          schedule();
        } catch (err) { /* Invalid foreign storage ignored. */ } }
      });
      lastRoute = currentRoute(); enrich(); schedule();
    }
    function ruleExample(target) {
      return { id: 'rule-' + Date.now().toString(36), name: '新规则', enabled: true, target: target || 'topic', conditions: [{ field: target === 'user' ? 'author' : target === 'post' ? 'body' : 'title', op: target === 'user' ? 'exact' : 'keyword', value: '示例词' }] };
    }
    function renderRules() {
      if (!mounted) return;
      const list = mounted.querySelector('.cf-rule-list'); if (!list) return;
      list.textContent = '';
      const draft = mounted.querySelector('.cf-json');
      if (draft) draft.value = JSON.stringify(config, null, 2);
      [['水贴预设', config.spam.rules, true], ['屏蔽规则', config.rules, false]].forEach(([label, rules, spam]) => {
        const header = document.createElement('strong'); header.textContent = label; list.appendChild(header);
        rules.forEach(r => {
          const line = document.createElement('div');
          const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.checked = r.enabled;
          toggle.setAttribute('aria-label', '启停 ' + r.name);
          toggle.addEventListener('change', () => { const c = JSON.parse(JSON.stringify(config)); (spam ? c.spam.rules : c.rules).find(x => x.id === r.id).enabled = toggle.checked; save(c); });
          const name = document.createElement('span'); name.textContent = r.name + (spam ? '' : ' · ' + r.target);
          const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'mini'; edit.textContent = '编辑';
          edit.addEventListener('click', () => openEditor(r, spam));
          const del = document.createElement('button'); del.type = 'button'; del.className = 'mini'; del.textContent = '删除';
          del.addEventListener('click', () => { const c = JSON.parse(JSON.stringify(config)); if (spam) c.spam.rules = c.spam.rules.filter(x => x.id !== r.id); else c.rules = c.rules.filter(x => x.id !== r.id); save(c); });
          line.append(toggle, name, edit, del); list.appendChild(line);
        });
      });
      mounted.querySelector('.cf-spam-on').checked = config.spam.enabled;
      mounted.querySelector('.cf-max').value = String(config.spam.maxChars);
    }
    function openEditor(rule, spam) {
      const form = mounted.querySelector('.cf-editor'); form.hidden = false; form.textContent = '';
      const draft = JSON.parse(JSON.stringify(rule));
      const name = document.createElement('input'); name.value = draft.name; name.setAttribute('aria-label', '规则名称');
      form.appendChild(name);
      const target = document.createElement('select'); target.setAttribute('aria-label', '规则对象');
      ['topic', 'post', 'user'].forEach(t => { const o = new Option({topic:'话题',post:'帖子',user:'用户'}[t], t); target.appendChild(o); });
      target.value = draft.target || 'post'; target.disabled = spam; form.appendChild(target);
      const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = spam ? '预设需要短文本门槛且通过结构保护。' : '同条条件全部命中；用户名规则作用于作者。标签和类别属于话题。'; form.appendChild(hint);
      const rows = document.createElement('div'); form.appendChild(rows);
      function conditions() {
        rows.textContent = '';
        const parts = spam ? [draft] : draft.conditions;
        parts.forEach((p, index) => {
          const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:3px;flex-wrap:wrap;margin:5px 0';
          if (!spam) {
            const field = document.createElement('select'); field.setAttribute('aria-label', '匹配字段');
            FIELDS[target.value].forEach(f => field.appendChild(new Option(LABELS[f], f))); field.value = p.field;
            field.onchange = () => { p.field = field.value; if (['tags', 'category'].includes(p.field) || /Id$/.test(p.field)) { p.op = 'exact'; delete p.flags; } conditions(); }; row.appendChild(field);
          }
          const op = document.createElement('select'); op.setAttribute('aria-label', '匹配方式');
          [['exact','精确'],['keyword','关键词'],['regex','正则']].forEach(([v,l]) => op.appendChild(new Option(l,v))); op.value = p.op;
          op.onchange = () => { p.op = op.value; if (p.op !== 'regex') delete p.flags; conditions(); }; row.appendChild(op);
          const value = document.createElement('input'); value.value = p.value; value.placeholder = '匹配值'; value.setAttribute('aria-label', '匹配值'); value.style.minWidth = '90px'; value.style.width = '120px'; value.oninput = () => { p.value = value.value; }; row.appendChild(value);
          const flags = document.createElement('input'); flags.value = p.flags || ''; flags.disabled = p.op !== 'regex'; flags.placeholder = 'flags'; flags.setAttribute('aria-label', '正则 flags'); flags.style.width = '45px'; flags.oninput = () => { p.flags = flags.value; }; row.appendChild(flags);
          if (!spam) { const del = document.createElement('button'); del.type = 'button'; del.textContent = '移除条件'; del.onclick = () => { draft.conditions.splice(index, 1); conditions(); }; row.appendChild(del); }
          rows.appendChild(row);
        });
      }
      target.onchange = () => { draft.target = target.value; draft.conditions = ruleExample(target.value).conditions; conditions(); };
      conditions();
      if (!spam) { const add = document.createElement('button'); add.type = 'button'; add.textContent = '增加 AND 条件'; add.onclick = () => { draft.conditions.push(ruleExample(target.value).conditions[0]); conditions(); }; form.appendChild(add); }
      const submit = document.createElement('button'); submit.type = 'button'; submit.className = 'go'; submit.textContent = '保存这条规则';
      submit.onclick = () => {
        draft.name = name.value;
        const c = JSON.parse(JSON.stringify(config)); const list = spam ? c.spam.rules : c.rules;
        const index = list.findIndex(r => r.id === draft.id); if (index < 0) list.push(draft); else list[index] = draft;
        if (save(c).ok) form.hidden = true;
      };
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '取消编辑'; cancel.onclick = () => { form.hidden = true; };
      form.append(submit, cancel);
    }
    function mount(root) {
      mounted = root.querySelector('.cf-panel'); if (!mounted) return;
      mounted.innerHTML = '<p class="hint">仅本地折叠；不改变站点忽略设置或已读提速任务。关键词忽略大小写；同条 AND、多条 OR。标签/类别为话题属性；ID 精确。JSON 区可导入完整配置，保存前校验。</p><label><input class="cf-spam-on" type="checkbox">启用水贴预设</label><label>短文本最多 <input class="cf-max" type="number" min="1" max="500" style="width:60px"> 字</label><button type="button" class="mini cf-spam-save">保存水贴设置</button><div class="cf-rule-list" style="display:flex;flex-direction:column;gap:5px"></div><div class="row-btns"><button type="button" class="mini cf-add">新增屏蔽规则</button><button type="button" class="mini cf-add-spam">新增水贴预设</button></div><div class="cf-editor" hidden></div><details><summary>配置 JSON / 导入导出 / 示例</summary><textarea class="cf-json" aria-label="过滤配置 JSON" rows="10" spellcheck="false" style="width:100%;font-size:11px"></textarea><button type="button" class="mini cf-import">校验并导入</button><button type="button" class="mini cf-export">复制导出</button><button type="button" class="mini cf-example">载入示例（不自动保存）</button></details><p class="cf-message" role="status"></p>';
      mounted.querySelector('.cf-spam-save').onclick = () => { const c = JSON.parse(JSON.stringify(config)); c.spam.enabled = mounted.querySelector('.cf-spam-on').checked; c.spam.maxChars = Number(mounted.querySelector('.cf-max').value); save(c); };
      mounted.querySelector('.cf-add').onclick = () => openEditor(ruleExample('topic'), false);
      mounted.querySelector('.cf-add-spam').onclick = () => openEditor({id:'spam-'+Date.now().toString(36),name:'新水贴预设',enabled:true,op:'exact',value:'示例短语'}, true);
      mounted.querySelector('.cf-import').onclick = () => save(mounted.querySelector('.cf-json').value);
      mounted.querySelector('.cf-export').onclick = () => copyText(JSON.stringify(config, null, 2)).then(r => status(r.ok ? '已复制完整配置' : '复制失败，请手动复制 JSON'));
      mounted.querySelector('.cf-example').onclick = () => {
        const c = defaults(); c.rules = [ruleExample('topic'), Object.assign(ruleExample('user'), { id:'example-user', name:'用户精确屏蔽示例', conditions:[{field:'author',op:'exact',value:'example_user'}] })];
        mounted.querySelector('.cf-json').value = JSON.stringify(c, null, 2); status('示例未保存；确认后点击校验并导入');
      };
      renderRules(); status(notice || (isOn('contentFilter') ? '内容过滤已开启' : '内容过滤默认关闭'));
    }
    return { KEY, defaults, validate, save, evaluate, collect, scan, init, mount, setEnabled, getConfig: () => JSON.parse(JSON.stringify(config)), getNotice: () => notice };
  })();
