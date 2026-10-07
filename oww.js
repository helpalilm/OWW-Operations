// Shared by kitchen.html and inventory.html
const OWW = {
  // Paste your Apps Script Web App URL here (the one ending in /exec). It is the only place it lives.
  URL: 'https://script.google.com/macros/s/AKfycbzLCnRPV3gfH_sKgSXn_t_PDshZ3-Yiu5gH3t87jNuJVHuS6HmxQ6BrQ3ZMujES8ZWy/exec',
  tk: null, user: null, hooks: {},
  // Phone notifications (OneSignal, free plan). Paste your OneSignal App ID here to switch them on; leave empty = off.
  PUSH_APP_ID: '',
  $: id => document.getElementById(id),
  esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
};

OWW.api = async (action, p = {}) => {
  let j;
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 45000); // give up after 45 s instead of waiting forever
  try {
    // text/plain body = no CORS preflight, which Apps Script cannot answer
    const r = await fetch(OWW.URL, { method: 'POST', redirect: 'follow', signal: ac.signal, body: JSON.stringify({ ...p, action, token: OWW.tk }) });
    j = await r.json();
  } catch (e) { throw Object.assign(new Error(e.name === 'AbortError' ? 'The server took too long. Please try again.' : 'No connection to the server'), { net: true }); }
  finally { clearTimeout(tm); }
  if (!j.ok) {
    if (j.error === 'AUTH') { localStorage.removeItem('oww_s'); location.reload(); }
    throw new Error(/^Unknown action/.test(j.error) ? 'The server is not updated yet. In Apps Script: Deploy → Manage deployments → pencil → New version → Deploy' : j.error);
  }
  return j.data;
};

OWW.toast = (m, c = 'green') => {
  const t = document.createElement('div'); t.id = 'toast'; t.textContent = m; t.style.background = `var(--${c})`;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
};

// writes that survive a dropped connection (kitchen shifts have bad wifi)
OWW.send = async (action, p) => {
  try { return await OWW.api(action, p); }
  catch (e) {
    if (!e.net) throw e;
    const q = JSON.parse(localStorage.getItem('oww_q') || '[]'); q.push({ action, p });
    localStorage.setItem('oww_q', JSON.stringify(q)); OWW.toast('Offline — saved, will sync', 'amber');
  }
};
OWW.flush = async () => {
  const q = JSON.parse(localStorage.getItem('oww_q') || '[]'); if (!q.length || !OWW.tk) return;
  const left = [];
  for (const i of q) { try { await OWW.api(i.action, i.p); } catch (e) { if (e.net) left.push(i); } }
  localStorage.setItem('oww_q', JSON.stringify(left));
  if (left.length < q.length) OWW.toast('Synced ' + (q.length - left.length) + ' saved action(s)');
};
addEventListener('online', OWW.flush);

OWW.go = id => {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === id));
  document.querySelectorAll('.nb').forEach(b => b.classList.toggle('on', b.dataset.p === id));
  OWW.$('main').scrollTop = 0;
  if (OWW.hooks[id]) OWW.hooks[id]();
};

OWW.logout = () => { localStorage.removeItem('oww_s'); location.reload(); };

// cfg: { title, sub, allow:[roles], ready(user) }
OWW.start = cfg => {
  OWW.switchCfg = cfg.switchTo; // where the Director can jump to (set per app)
  const L = OWW.$('login');
  const formHtml = `<form id="lf" novalidate><img src="logo.png" alt="Old Wild West" style="width:124px;height:124px;margin:0 auto 2px"><h1>${cfg.title}</h1><p>${cfg.sub}</p><div style="text-align:center">${OWW.langBar ? OWW.langBar() : ''}</div>
    <input id="em" type="email" placeholder="Email" autocomplete="username" autocapitalize="none" required>
    <input id="pw" type="password" placeholder="Password" autocomplete="current-password" required>
    <div class="err" id="le" role="alert"></div><button class="btn p w" id="lb">Sign in</button></form>`;
  const enter = (tk, user) => {
    if (cfg.allow && !cfg.allow.includes(user.role)) throw new Error('This app is for managers and directors only');
    OWW.tk = tk; OWW.user = user; L.classList.add('hide'); L.innerHTML = ''; OWW.$('app').classList.remove('hide');
    localStorage.setItem('oww_s', JSON.stringify({ tk, user })); cfg.ready(user); OWW.flush(); OWW.push.init(); OWW.addSwitch();
  };
  const build = () => { L.innerHTML = formHtml;
  OWW.$('em').value = localStorage.getItem('oww_email') || '';
  OWW.$('lf').onsubmit = async e => {
    e.preventDefault(); const b = OWW.$('lb'), er = OWW.$('le'); er.textContent = ''; b.disabled = true; b.textContent = 'Signing in…';
    try {
      const em = OWW.$('em').value.trim(), r = await OWW.api('login', { email: em, password: OWW.$('pw').value });
      localStorage.setItem('oww_email', em); enter(r.token, r.user);
    } catch (x) { er.textContent = x.message; b.disabled = false; b.textContent = 'Sign in'; OWW.$('pw').value = ''; }
  };
  };
  // restore a still-valid session (12h) so people are not asked every time
  const s = JSON.parse(localStorage.getItem('oww_s') || 'null');
  if (s) { OWW.tk = s.tk; const go = () => { try { enter(s.tk, s.user); OWW.api('me').catch(() => {}); } catch (x) { OWW.logout(); } }; // runs after the whole page has loaded
    document.readyState === 'loading' ? addEventListener('DOMContentLoaded', go) : go(); } else build(); // opens instantly; an expired session returns to login
};

// settings card: who you are, change password, sign out
OWW.account = el => {
  const u = OWW.user;
  OWW.$(el).innerHTML = `<div class="sec">Account</div><div class="cols"><div class="card">
    <div class="row"><div class="grow"><div class="nm">${OWW.esc(u.full)}</div><div class="sub">${OWW.esc(u.email)} · ${OWW.esc(u.role)} · ${OWW.esc(u.branch)}</div></div></div>
    <form class="row" style="display:grid;gap:8px" onsubmit="OWW.changePw();return false"><div class="nm">Change password</div>
      <input type="text" name="username" autocomplete="username" value="${OWW.esc(u.email)}" readonly tabindex="-1" aria-hidden="true" style="position:absolute;opacity:0;height:0;width:0;padding:0;border:0;pointer-events:none">
      <input id="pc" name="oww-current" type="password" placeholder="Current password" autocomplete="current-password">
      <input id="pn" name="oww-new" type="password" placeholder="New password (8+ characters)" autocomplete="new-password">
      <button class="btn p" type="submit">Save password</button></form>
    <div class="row"><span class="grow">Language / Lingua</span>${OWW.langBar ? OWW.langBar() : ''}</div>
    ${OWW.PUSH_APP_ID ? '<div class="row"><button class="btn w" onclick="OWW.push.enable()">🔔 Turn on phone notifications</button></div>' : ''}
    ${OWW.switchCfg && u.role === 'Director' ? `<div class="row"><button class="btn w" onclick="OWW.goApp()"><span aria-hidden="true">⇄ </span>${OWW.esc(OWW.switchCfg.label)}</button></div>` : ''}
    <div class="row"><button class="btn w" onclick="OWW.logout()" style="color:var(--red)">Sign out</button></div></div></div>`;
};
OWW.changePw = async () => {
  try { await OWW.api('changePassword', { current: OWW.$('pc').value, next: OWW.$('pn').value }); OWW.toast('Password changed'); OWW.$('pc').value = OWW.$('pn').value = ''; }
  catch (e) { OWW.toast(e.message, 'red'); }
};

OWW.ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
OWW.hrs = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm'; };
OWW.kind = s => { const h = parseInt(s, 10); return h >= 6 && h < 12 ? 'Morning' : h >= 12 && h < 17 ? 'Lunch' : 'Dinner'; };
OWW.day = s => new Date(s + 'T12:00').toLocaleDateString(OWW.loc(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
OWW.shiftNow = () => new Date().getHours() < 15 ? 'Day' : 'Night';
OWW.ico = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

// bottom sheet (phone) / centred dialog (laptop)
OWW.sheet = html => { OWW.$('sheetc').innerHTML = html; OWW.$('sheet').classList.add('on'); };
OWW.close = () => OWW.$('sheet').classList.remove('on');
document.addEventListener('click', e => { if (e.target.id === 'sheet') OWW.close(); });

// type-ahead: items() -> [{k,l,s}], pick(k)
OWW.finder = (inp, pop, items, pick) => {
  const i = OWW.$(inp), p = OWW.$(pop);
  i.oninput = () => {
    const q = i.value.trim().toLowerCase(); if (!q) { p.classList.add('hide'); return; }
    const nz = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), qs = nz(q).split(/\s+/);
    const r = items().filter(x => { const h = nz(x.m || x.l); return qs.every(w => h.includes(w)); }).slice(0, 8);
    p.innerHTML = r.length ? r.map(x => `<div data-k="${OWW.esc(x.k)}"><span style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span class="nm">${OWW.esc(x.l)}</span><span style="display:flex;gap:6px;flex-shrink:0">${[].concat(x.t || []).filter(Boolean).map((t, i) => `<span class="tag ${i ? 'b' : 'a'}">${OWW.esc(t)}</span>`).join('')}</span></span><span class="sub">${OWW.esc(x.s || '')}</span></div>`).join('') : '<div class="sub">No match</div>';
    p.classList.remove('hide');
  };
  p.onclick = e => { const d = e.target.closest('[data-k]'); if (!d) return; p.classList.add('hide'); i.value = ''; pick(d.dataset.k); };
};

// service worker = required for "Install app"
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

// ── phone notifications via OneSignal (needs PUSH_APP_ID; on iPhone the app must be installed to the Home Screen, iOS 16.4+) ──
OWW.push = {
  init() {
    if (!OWW.PUSH_APP_ID || OWW._pi) return; OWW._pi = 1;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    const s = document.createElement('script'); s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'; s.defer = true; document.head.appendChild(s);
    OneSignalDeferred.push(async OS => {
      await OS.init({ appId: OWW.PUSH_APP_ID, serviceWorkerPath: location.pathname.replace(/^\/|[^/]*$/g, '') + 'sw.js', serviceWorkerParam: { scope: location.pathname.replace(/[^/]*$/, '') }, notifyButton: { enable: false } });
      if (OWW.user) OS.login(OWW.user.id); // links this phone to the person, so the server can target them
    });
  },
  enable() {
    if (!window.OneSignalDeferred) OWW.push.init();
    OneSignalDeferred.push(async OS => {
      try { await OS.Notifications.requestPermission(); await OS.login(OWW.user.id); OWW.toast(OS.Notifications.permission ? 'Notifications on ✓' : 'Notifications are blocked in your phone settings', OS.Notifications.permission ? 'green' : 'amber'); }
      catch (e) { OWW.toast('Could not turn on notifications', 'red'); }
    });
  }
};

// ── switching between Kitchen and Admin: Director only. Everyone else never sees it, and the action does nothing for them. ──
OWW.goApp = () => { if (OWW.user && OWW.user.role === 'Director' && OWW.switchCfg) location.href = OWW.switchCfg.href; };
OWW.addSwitch = () => {
  const u = OWW.user, c = OWW.switchCfg, rf = OWW.$('rf');
  if (!c || !u || u.role !== 'Director' || !rf || OWW.$('swb')) return;
  const b = document.createElement('button'); b.id = 'swb'; b.className = 'sm a swb';
  b.setAttribute('aria-label', c.label); b.title = c.label; b.innerHTML = '<span aria-hidden="true">⇄</span><span class="lbl"> ' + OWW.esc(c.label) + '</span>'; b.onclick = OWW.goApp; rf.before(b);
};
