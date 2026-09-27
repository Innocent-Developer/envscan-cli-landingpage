(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const enhancementStyles = document.createElement('link');
  enhancementStyles.rel = 'stylesheet';
  enhancementStyles.href = '/styles-enhancements.css';
  document.head.appendChild(enhancementStyles);

  const cta = document.querySelector('.cta');
  if (cta && !document.getElementById('support')) {
    const section = document.createElement('section');
    section.id = 'support';
    section.className = 'section support-section';
    section.setAttribute('aria-labelledby', 'support-title');
    section.innerHTML = `
      <div class="wrap support-grid">
        <div class="support-copy">
          <h2 id="support-title">Need help with your environment?</h2>
          <p>Have a question, found a bug, or need help configuring envscan-cli for your project? We’re happy to help you keep your environment variables documented, secure, and ready for production.</p>
          <div class="support-links">
            <a class="support-link" href="mailto:envscan-cli@mail.abubakkar.dev"><span class="support-icon" aria-hidden="true">✉</span><span>envscan-cli@mail.abubakkar.dev</span></a>
            <a class="support-link" href="https://github.com/Innocent-Developer/envscan-cli/issues" target="_blank" rel="noopener"><span class="support-icon" aria-hidden="true">↗</span><span>Open a GitHub issue</span></a>
          </div>
        </div>
        <aside class="support-card">
          <span class="file">support.envscan-cli</span>
          <h3>Let’s fix the drift before production.</h3>
          <p>Include your envscan-cli version, command, and a redacted report when contacting support. Never share real secret values.</p>
          <a class="support-email" href="mailto:envscan-cli@mail.abubakkar.dev?subject=envscan-cli%20support">envscan-cli@mail.abubakkar.dev</a>
        </aside>
      </div>`;
    cta.parentNode.insertBefore(section, cta);
  }

  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {
      const area = document.createElement('textarea');
      area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.select(); let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) {}
      area.remove(); return ok;
    }
  }
  document.querySelectorAll('.copy-btn').forEach(button => button.addEventListener('click', async () => {
    const target = button.dataset.copyTarget && document.getElementById(button.dataset.copyTarget);
    const ok = await copyText(target ? target.innerText : button.dataset.copy || '');
    const original = button.textContent;
    button.textContent = ok ? 'Copied' : 'Press Ctrl+C';
    button.classList.toggle('done', ok);
    if (ok) showToast('Copied to clipboard');
    setTimeout(() => { button.textContent = original; button.classList.remove('done'); }, 1600);
  }));

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('nav-list');
  if (toggle && nav) {
    const closeNav = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.querySelector('.sr-only').textContent = 'Open menu'; };
    toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); toggle.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu'; });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeNav(); toggle.focus(); } });
  }

  const term = document.getElementById('term');
  const replay = document.getElementById('replay');
  if (term && replay) {
    const full = term.innerHTML;
    const lines = full.split('\n');
    let timers = [];
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const play = () => {
      clear();
      if (reduceMotion) { term.innerHTML = full; return; }
      const command = 'npx envscan-cli';
      term.innerHTML = '<span class="t-cmd">$ </span><span class="cursor"></span>';
      let time = 350;
      for (let i = 1; i <= command.length; i++) { timers.push(setTimeout(() => { term.innerHTML = `<span class="t-cmd">$ ${command.slice(0, i)}</span><span class="cursor"></span>`; }, time)); time += 55; }
      time += 450; let shown = lines[0];
      lines.slice(1).forEach(line => { timers.push(setTimeout(() => { shown += '\n' + line; term.innerHTML = shown + '<span class="cursor"></span>'; }, time)); time += line.trim() ? 130 : 60; });
      timers.push(setTimeout(() => { term.innerHTML = full + '\n<span class="t-cmd">$ </span><span class="cursor"></span>'; }, time + 200));
    };
    replay.addEventListener('click', play);
    if ('IntersectionObserver' in window) { const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { play(); observer.disconnect(); } }, { threshold: .35 }); observer.observe(term); }
  }

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const selectTab = tab => tabs.forEach(item => { const selected = item === tab; item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1; document.getElementById(item.getAttribute('aria-controls')).hidden = !selected; });
  tabs.forEach((tab, index) => { tab.addEventListener('click', () => selectTab(tab)); tab.addEventListener('keydown', event => { const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0; const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : direction ? tabs[(index + direction + tabs.length) % tabs.length] : null; if (next) { event.preventDefault(); selectTab(next); next.focus(); } }); });

  const filter = document.getElementById('flag-filter');
  const rows = [...document.querySelectorAll('#flags tbody tr')];
  const noMatch = document.getElementById('no-match');
  if (filter && noMatch) filter.addEventListener('input', () => { const query = filter.value.trim().toLowerCase(); let visible = 0; rows.forEach(row => { const match = !query || row.textContent.toLowerCase().includes(query); row.hidden = !match; if (match) visible++; }); noMatch.hidden = visible !== 0; });
})();
