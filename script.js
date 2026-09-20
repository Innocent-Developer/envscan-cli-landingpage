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
