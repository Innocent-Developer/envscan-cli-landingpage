(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Toast */
  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  /* Copy buttons */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove();
      return ok;
    }
  }

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.copyTarget;
      const text = targetId ? document.getElementById(targetId).innerText : btn.dataset.copy;
      const ok = await copyText(text);
      const original = btn.textContent;
      btn.textContent = ok ? 'Copied' : 'Press Ctrl+C';
      btn.classList.toggle('done', ok);
      if (ok) showToast('Copied to clipboard');
      setTimeout(() => { btn.textContent = original; btn.classList.remove('done'); }, 1600);
    });
  });

  /* Mobile nav */
  const toggle = document.querySelector('.nav-toggle');
  const navList = document.getElementById('nav-list');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = navList.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
    });
    navList.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      navList.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  /* Terminal demo — static HTML stays in the page for SEO and no-JS */
  const term = document.getElementById('term');
  const replayBtn = document.getElementById('replay');
  const fullHTML = term.innerHTML;
  const lines = fullHTML.split('\n');
  const command = 'npx envscan-cli';
  let timers = [];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function play() {
    clearTimers();
    if (reduceMotion) { term.innerHTML = fullHTML; return; }
    term.innerHTML = '<span class="t-cmd">$ </span><span class="cursor"></span>';
    let t = 350;
    for (let i = 1; i <= command.length; i++) {
      later(() => {
        term.innerHTML = `<span class="t-cmd">$ ${command.slice(0, i)}</span><span class="cursor"></span>`;
      }, t);
      t += 55;
    }
    t += 450;
    let shown = lines[0];
    lines.slice(1).forEach(line => {
      later(() => {
        shown += '\n' + line;
        term.innerHTML = shown + '<span class="cursor"></span>';
      }, t);
      t += line.trim() === '' ? 60 : 130;
    });
    later(() => { term.innerHTML = fullHTML + '\n<span class="t-cmd">$ </span><span class="cursor"></span>'; }, t + 200);
  }

  replayBtn.addEventListener('click', play);

  // Play once when the terminal first comes into view
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { play(); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(term);
  }

  /* Tabs (WAI-ARIA pattern with arrow keys) */
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab) {
    tabs.forEach(t => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', e => {
      let next;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next); next.focus(); }
    });
  });

  /* Options filter */
  const filter = document.getElementById('flag-filter');
  const rows = Array.from(document.querySelectorAll('#flags tbody tr'));
  const noMatch = document.getElementById('no-match');
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    let visible = 0;
    rows.forEach(row => {
      const match = !q || row.textContent.toLowerCase().includes(q);
      row.hidden = !match;
      if (match) visible++;
    });
    noMatch.hidden = visible !== 0;
  });
})();

/* ---------- Live stats from npm + GitHub ---------- */
(() => {
  'use strict';
  const PKG = 'envscan-cli';
  const REPO = 'Innocent-Developer/envscan-cli';
  const CACHE_KEY = 'envscan-live-stats-v1';
  const TTL = 30 * 60 * 1000; // re-fetch at most every 30 minutes per visitor

  const $ = sel => document.querySelector(sel);
  const statusEl = $('#stats-status');
  if (!statusEl) return;

  const nf = new Intl.NumberFormat('en');
  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const fmtNum = n => (typeof n !== 'number' ? '—' : n >= 100000 ? compact.format(n) : nf.format(n));
  const fmtSize = b => (typeof b !== 'number' ? '—' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' kB');
  const fmtShortDate = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  function fmtAgo(iso) {
    if (!iso) return '—';
    const diff = (new Date(iso) - Date.now()) / 1000;
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
    return 'just now';
  }
  const isoDay = d => d.toISOString().slice(0, 10);

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || null; } catch (_) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (_) {}
  }

  async function getJSON(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(url + ' → ' + res.status);
    return res.json();
  }

  // Sum every download since the package was created. npm's range API
  // allows at most ~18 months per request, so long histories are chunked.
  async function totalDownloads(createdISO) {
    const start = new Date(createdISO);
    const end = new Date();
    let total = 0;
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    while (cursor <= end) {
      const chunkEnd = new Date(Math.min(end, cursor.getTime() + 500 * 86400000));
      const data = await getJSON(`https://api.npmjs.org/downloads/range/${isoDay(cursor)}:${isoDay(chunkEnd)}/${PKG}`);
      total += (data.downloads || []).reduce((s, d) => s + d.downloads, 0);
      cursor = new Date(chunkEnd.getTime() + 86400000);
    }
    return total;
  }

  async function fetchAll(prev) {
    const out = Object.assign({}, prev || {});
    let failed = 0;

    const [gh, reg, month, week] = await Promise.allSettled([
      getJSON(`https://api.github.com/repos/${REPO}`),
      getJSON(`https://registry.npmjs.org/${PKG}`),
      getJSON(`https://api.npmjs.org/downloads/range/last-month/${PKG}`),
      getJSON(`https://api.npmjs.org/downloads/point/last-week/${PKG}`)
    ]);

    if (gh.status === 'fulfilled') {
      const r = gh.value;
      Object.assign(out, { stars: r.stargazers_count, forks: r.forks_count, watchers: r.subscribers_count, issues: r.open_issues_count });
    } else failed++;

    if (reg.status === 'fulfilled') {
      const p = reg.value;
      const latest = p['dist-tags'] && p['dist-tags'].latest;
      const v = (p.versions && p.versions[latest]) || {};
      Object.assign(out, {
        version: latest,
        published: p.time && p.time[latest],
        created: p.time && p.time.created,
        versions: Object.keys(p.versions || {}).length,
        size: v.dist && v.dist.unpackedSize,
        deps: Object.keys(v.dependencies || {}).length,
        license: v.license || p.license
      });
    } else failed++;

    if (month.status === 'fulfilled') {
      let days = month.value.downloads || [];
      // Drop days before the package existed so a young package isn't padded with zeros
      if (out.created) days = days.filter(d => d.day >= out.created.slice(0, 10));
      out.daily = days;
      out.month = days.reduce((s, d) => s + d.downloads, 0);
      out.peak = days.reduce((m, d) => Math.max(m, d.downloads), 0);
    } else failed++;

    if (week.status === 'fulfilled') out.week = week.value.downloads;
    else failed++;

    if (out.created) {
      try { out.total = await totalDownloads(out.created); } catch (_) { failed++; }
    }

    if (failed >= 4 && !prev) throw new Error('all sources failed');
    out.fetchedAt = Date.now();
    return { data: out, failed };
  }

  function setStat(name, value) {
    document.querySelectorAll(`[data-stat="${name}"]`).forEach(el => {
      if (el.textContent === value) return;
      el.textContent = value;
      el.hidden = false;
      el.classList.remove('updated'); void el.offsetWidth; el.classList.add('updated');
    });
  }

  function renderChart(days) {
    const chart = $('#dl-chart');
    if (!days || !days.length) {
      chart.innerHTML = '<span class="empty">Daily numbers will appear here after the first full day on npm.</span>';
      chart.setAttribute('aria-label', 'No daily download data yet');
      return;
    }
    const max = Math.max(1, ...days.map(d => d.downloads));
    chart.innerHTML = days.map(d => {
      const h = Math.max(2, Math.round((d.downloads / max) * 100));
      const cls = d.downloads === max && max > 0 ? 'bar hi' : 'bar';
      return `<span class="${cls}" style="height:${h}%" title="${fmtShortDate(d.day)}: ${nf.format(d.downloads)} downloads"></span>`;
    }).join('');
    chart.setAttribute('aria-label', `Daily downloads over the last ${days.length} days, peaking at ${nf.format(max)} in one day`);
    $('#dl-from').textContent = fmtShortDate(days[0].day);
    $('#dl-to').textContent = fmtShortDate(days[days.length - 1].day);
  }

  function render(d) {
    setStat('total', fmtNum(d.total));
    setStat('week', fmtNum(d.week));
    setStat('month', fmtNum(d.month));
    setStat('peak', fmtNum(d.peak));
    setStat('stars', fmtNum(d.stars));
    setStat('forks', fmtNum(d.forks));
    setStat('watchers', fmtNum(d.watchers));
    setStat('issues', fmtNum(d.issues));
    setStat('version', d.version ? 'v' + d.version : '—');
    if (d.version) setStat('version-pill', 'v' + d.version);
    setStat('published', fmtAgo(d.published));
    setStat('versions', fmtNum(d.versions));
    setStat('size', fmtSize(d.size));
    setStat('deps', typeof d.deps === 'number' ? String(d.deps) : '—');
    if (d.license) setStat('license', d.license);
    if (typeof d.stars === 'number') setStat('stars-nav', fmtNum(d.stars));
    renderChart(d.daily);
  }

  function setStatus(text, state) {
    statusEl.textContent = text;
    statusEl.classList.remove('live', 'stale');
    if (state) statusEl.classList.add(state);
  }

  async function load() {
    const cached = readCache();
    if (cached) {
      render(cached);
      setStatus(`Last checked ${fmtAgo(new Date(cached.fetchedAt).toISOString())}.`, 'live');
      if (Date.now() - cached.fetchedAt < TTL) return;
    }
    try {
      const { data, failed } = await fetchAll(cached);
      render(data);
      if (failed === 0 || !cached) writeCache(data);
      if (failed === 0) setStatus('Updated just now.', 'live');
      else if (cached) setStatus('Some sources didn’t respond, so a few numbers are from your last visit.', 'stale');
      else setStatus('Some sources didn’t respond. Refresh in a minute to try again.', 'stale');
    } catch (_) {
      setStatus(cached ? 'Couldn’t refresh right now. Showing the last saved numbers.' : 'Couldn’t reach npm or GitHub. Refresh in a minute to try again.', 'stale');
    }
  }

  // Wait until the section is near the viewport so first paint stays fast
  const section = $('#stats');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { io.disconnect(); load(); }
    }, { rootMargin: '300px' });
    io.observe(section);
  } else load();
})();
