// Sala staff screens: shifts + hours log, my rota, requests, events, low-stock flags (adapted from the Kitchen app)
let EVK = [];
const relD = d => { const n = Math.round((new Date(d + 'T12:00') - new Date(OWW.ymd(new Date()) + 'T12:00')) / 864e5); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'in ' + n + ' days'; };

let RQ = { list: [], users: [] };
// ── events ──
function renderEvk() {
  const l = EVK.slice(0, 5);
  $('evk').innerHTML = l.length ? '<div class="sec">Upcoming events</div><div class="card">' + l.map(e => { const d = new Date(e.date + 'T12:00');
    return `<div class="row"><div style="min-width:46px;text-align:center"><div style="font-weight:700;font-size:20px;line-height:1">${d.getDate()}</div><div class="sub">${d.toLocaleDateString(OWW.loc(), { month: 'short' })}</div></div>
      <div class="grow"><div class="nm">${esc(e.title)}</div><div class="sub">${relD(e.date)}${e.time ? ' · ' + esc(e.time) : ''}${e.notes ? ' · ' + esc(e.notes) : ''}</div></div></div>`; }).join('') + '</div>' : '';
}

// ── my planned shifts (inside the Shifts tab) ──
const ABSL = { REST: 'Rest', HOLIDAY: 'Holiday', SICK: 'Sick', LEAVE: 'Leave', ABSENT: 'Absent' };
function renderMyRota() {
  const l = A.rota || [];
  $('rotam').innerHTML = l.length ? '<div class="sec">My upcoming shifts</div><div class="card">' + l.map(r => r.type && r.type !== 'SHIFT'
    ? `<div class="row"><div class="grow"><div class="nm">${OWW.day(r.date)}</div></div><span class="tag ${r.type === 'HOLIDAY' ? 'g' : r.type === 'SICK' ? 'r' : ''}">${ABSL[r.type] || r.type}</span></div>`
    : `<div class="row"><div class="grow"><div class="nm">${OWW.day(r.date)}</div><div class="sub">${esc(r.start)} → ${esc(r.end)}${r.note ? ' · ' + esc(r.note) : ''}</div></div><button class="sm a" data-use="${esc(r.id)}">Use for log</button></div>`).join('') + '</div>'
    : '<div class="note">No planned shifts yet. Your manager adds them in the rota.</div>';
}
$('rotam').onclick = e => {
  const b = e.target.closest('[data-use]'); if (!b) return; const r = (A.rota || []).find(x => x.id === b.dataset.use); if (!r) return;
  $('ad').value = r.date; $('as').value = r.start; $('ae').value = r.end; $('am').value = r.note || '';
  document.querySelector('#aseg [data-v=log]').click(); durUpdate(); $('a-log').scrollIntoView({ behavior: 'smooth' });
};

// ── requests: day off + ask a colleague to cover ──
const KIND = { HOLIDAY: 'Holiday', REST: 'Rest day', LEAVE: 'Leave' };
const RST = { PENDING_PEER: ['a', 'Waiting for colleague'], PENDING: ['a', 'Waiting for manager'], APPROVED: ['g', 'Approved'], DECLINED: ['r', 'Declined'], CANCELLED: ['', 'Cancelled'] };
async function loadReq() { try { RQ = await OWW.api('reqList'); } catch (e) { return; } renderReq(); }
function renderReq() {
  const me = OWW.user.id, mine = RQ.list.filter(r => r.uid === me), toMe = RQ.list.filter(r => r.peerId === me && r.status === 'PENDING_PEER');
  $('reqs').innerHTML = '<div class="sec">Requests</div><div class="bar"><button class="btn" onclick="reqForm(\'off\')">Request day off</button><button class="btn" onclick="reqForm(\'swap\')">Ask a colleague to cover</button></div>' +
    (toMe.length ? '<div class="card">' + toMe.map(r => `<div class="row" style="flex-wrap:wrap"><div class="grow"><div class="nm">${esc(r.name)} asks you to cover</div><div class="sub">${OWW.day(r.from)} · ${esc(r.shift)}</div></div><button class="sm g" data-rp="${esc(r.id)}:1">Accept</button><button class="sm" data-rp="${esc(r.id)}:0">Decline</button></div>`).join('') + '</div>' : '') +
    (mine.length ? '<div class="card">' + mine.slice(0, 8).map(r => { const s = RST[r.status] || ['', r.status];
      return `<div class="row"><div class="grow"><div class="nm">${r.type === 'DAY_OFF' ? (KIND[r.kind] || 'Day off') : 'Cover: ' + esc(r.peerName)}</div><div class="sub">${OWW.day(r.from)}${r.to && r.to !== r.from ? ' → ' + OWW.day(r.to) : ''}${r.shift ? ' · ' + esc(r.shift) : ''}${r.dnote ? ' · “' + esc(r.dnote) + '”' : ''}</div></div>
        <span class="tag ${s[0]}">${s[1]}</span>${String(r.status).startsWith('PENDING') ? `<button class="sm" data-rc="${esc(r.id)}" aria-label="Cancel request">✕</button>` : ''}</div>`; }).join('') + '</div>' : '');
}
$('reqs').onclick = async e => {
  const p = e.target.closest('[data-rp]'), c = e.target.closest('[data-rc]'); if (!p && !c) return;
  try { if (p) { const [id, ok] = p.dataset.rp.split(':'); await OWW.api('reqPeer', { id, accept: ok === '1' }); OWW.toast(ok === '1' ? 'Accepted ✓' : 'Declined'); } else await OWW.api('reqCancel', { id: c.dataset.rc }); await loadReq(); }
  catch (x) { OWW.toast(x.message, 'red'); }
};
function reqForm(kind) {
  if (kind === 'off') return OWW.sheet(`<div class="nm" style="font-size:18px">Request day off</div>
    <div class="two"><label class="fld"><small>From</small><input type="date" id="rf1" value="${OWW.ymd(new Date())}"></label><label class="fld"><small>To (optional)</small><input type="date" id="rf2"></label></div>
    <select id="rk"><option value="HOLIDAY">Holiday</option><option value="REST">Rest day</option><option value="LEAVE">Leave</option></select>
    <input id="rn2" placeholder="Note (optional)" maxlength="120"><div class="err" id="rerr"></div>
    <button class="btn p w" onclick="sendReq('DAY_OFF')">Send request</button><button class="btn w" onclick="OWW.close()">Cancel</button>`);
  const sh = (A.rota || []).filter(r => !r.type || r.type === 'SHIFT');
  if (!sh.length) return OWW.toast('You have no planned shifts to hand over yet', 'amber');
  OWW.sheet(`<div class="nm" style="font-size:18px">Ask a colleague to cover</div>
    <select id="rs1">${sh.map(r => `<option value="${esc(r.id)}">${OWW.day(r.date)} · ${esc(r.start)} → ${esc(r.end)}</option>`).join('')}</select>
    <select id="rp1">${RQ.users.map(u => `<option value="${esc(u.id)}">${esc(u.full)}</option>`).join('')}</select>
    <input id="rn2" placeholder="Note (optional)" maxlength="120"><div class="err" id="rerr"></div>
    <button class="btn p w" onclick="sendReq('SWAP')">Send request</button><button class="btn w" onclick="OWW.close()">Cancel</button>`);
}
async function sendReq(type) {
  const b = type === 'DAY_OFF' ? { type, from: $('rf1').value, to: $('rf2').value || $('rf1').value, kind: $('rk').value, note: $('rn2').value.trim() } : { type, rotaId: $('rs1').value, peerId: $('rp1').value, note: $('rn2').value.trim() };
  try { await OWW.api('reqCreate', b); OWW.close(); OWW.toast('Request sent ✓'); await loadReq(); } catch (e) { $('rerr').textContent = e.message; }
}


// ── punctuality: late / early leave versus the rota ──
const REASONS = ['Transport', 'Illness', 'Personal', 'Approved by manager', 'Other'];
let REASON_CB = null;
function nowT(id) { const d = new Date(); $(id).value = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); durUpdate(); }
function dev(date, st, en) { // minutes late / left early compared with the planned shift of that day (planned shifts known: today and the next 3 weeks)
  const p = (A.rota || []).filter(r => (!r.type || r.type === 'SHIFT') && r.date === date); if (!p.length) return null;
  const a = toM(st); let best = null;
  p.forEach(r => { const d = ((a - toM(r.start) + 1440 + 720) % 1440) - 720; if (!best || Math.abs(d) < Math.abs(best.d)) best = { r, d }; });
  const ps = toM(best.r.start), pe = ((toM(best.r.end) - ps + 1440) % 1440) || 1440, ae = ((toM(en) - ps + 1440) % 1440) || 1440;
  return { ps: best.r.start, pe: best.r.end, late: Math.max(0, best.d), early: Math.max(0, pe - ae) };
}
function devText(d) {
  const g = A.grace ?? 5, o = [];
  if (d.late > g) o.push('Late arrival: ' + d.late + ' min'); if (d.early > g) o.push('Early leave: ' + d.early + ' min'); if (d.ps) o.push('Planned ' + d.ps + '–' + d.pe);
  return o.join(' · ');
}
function reasonSheet(info, go) {
  REASON_CB = go;
  OWW.sheet(`<div><div class="nm" style="font-size:18px">Please tell us why</div><div class="sub" style="margin-top:4px">${esc(info)}</div></div>
    <select id="rsn">${REASONS.map(r => `<option>${r}</option>`).join('')}</select>
    <button class="btn p w" onclick="REASON_CB($('rsn').value);OWW.close()">Save shift</button><button class="btn w" onclick="OWW.close()">Cancel</button>`);
}
function pTags(x) {
  const g = A.grace ?? 5;
  return (x.late > g ? `<span class="tag a">Late ${x.late} min</span>` : '') + (x.early > g ? `<span class="tag a">Left early ${x.early} min</span>` : '') + (x.excused ? '<span class="tag g">Excused</span>' : '');
}
function lateN() {
  const g = A.grace ?? 5, m = OWW.ymd(new Date()).slice(0, 7);
  return A.shifts.filter(x => x.date.slice(0, 7) === m && x.late > g && !x.excused && x.status !== 'REJECTED').length + ' / ' + (A.limit ?? 3);
}


// everything the staff screens need besides the shift log
async function loadX() {
  const [e, q, s] = await Promise.all([OWW.api('eventList').catch(() => null), OWW.api('reqList').catch(() => null), OWW.api('salaData').catch(() => null)]);
  if (e) EVK = e; if (q) RQ = q; if (s) SD = s;
  renderEvk(); renderReq(); renderMyAlerts();
}

// ── flag a low-stock item (the Sala list) ──
let SD = { items: [], alerts: [] };
const stockItems = () => (SD.items || []).map(r => ({ id: r.id, name: r.name, m: r.name, unit: r.unit || '', loc: r.loc || '', kind: r.cat || 'Sala' })).filter(x => x.id && x.name);
OWW.finder('aq', 'ap', () => stockItems().map(x => ({ k: x.id, l: x.name, m: x.m, t: [x.loc], s: x.kind + (x.unit ? ' · ' + x.unit : '') })), id => {
  const c = stockItems().find(x => x.id === id);
  OWW.sheet(`<div><div class="nm" style="font-size:18px">${esc(c.name)}</div><div class="sub">${esc(c.kind)}${c.loc ? ' · ' + esc(c.loc) : ''}</div></div>
    <input id="fq" placeholder="How much is left? e.g. 2 bottiglie"><input id="fn" placeholder="Note (optional)">
    <button class="btn p w" onclick="flag('${esc(id)}')">Send alert to manager</button><button class="btn w" onclick="OWW.close()">Cancel</button>`);
});
async function flag(id) {
  const c = stockItems().find(x => x.id === id), q = $('fq').value.trim() || 'not specified', n = $('fn').value.trim(); OWW.close();
  try {
    const r = await OWW.send('raiseAlert', { itemId: id, itemName: c.name, qty: q, unit: c.unit, shift: OWW.shiftNow(), note: n });
    if (r) { OWW.toast(r.duplicate ? 'Already flagged this week' : 'Alert sent ✓'); await loadX(); }
  } catch (e) { OWW.toast(e.message, 'red'); }
}
function renderMyAlerts() {
  const m = (SD.alerts || []).filter(a => a['Flagged By'] === OWW.user.full), open = m.filter(a => a['Status'] === 'OPEN').length;
  $('ab').textContent = open; $('ab').classList.toggle('hide', !open);
  const st = { OPEN: ['a', 'Waiting for manager'], ORDERED: ['g', 'Ordered ✓'], DISMISSED: ['', 'Dismissed'], RESET_FRIDAY: ['', 'Closed'] };
  $('mine').innerHTML = m.length ? '<div class="card">' + m.map(a => { const s = st[a['Status']] || ['', a['Status']];
    return `<div class="row"><div class="grow"><div class="nm">${esc(a['Item Name'])}</div><div class="sub">${esc(a['Qty Remaining'])} · ${esc(String(a['Date Raised']).slice(0, 10))}${a['Notes'] ? ' · “' + esc(a['Notes']) + '”' : ''}</div></div><span class="tag ${s[0]}">${s[1]}</span></div>`; }).join('') + '</div>'
    : '<div class="empty">No alerts raised this week</div>';
}

// ── attendance (log + history): instant, saved in the background ──
let A = { shifts: [] };
const akey = () => 'oww_att_' + OWW.user.id;
OWW.hooks['p-att'] = () => renderAtt();
async function loadAtt() {
  try { A = await OWW.api('shiftMine'); localStorage.setItem(akey(), JSON.stringify(A)); } catch (e) { return OWW.toast(e.message, 'red'); }
  renderAtt();
}
document.querySelectorAll('#aseg button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#aseg button').forEach(x => x.classList.toggle('on', x === b));
  $('a-log').classList.toggle('hide', b.dataset.v !== 'log'); $('a-hist').classList.toggle('hide', b.dataset.v !== 'hist');
});
const toM = t => parseInt(t) * 60 + parseInt(t.split(':')[1]);
function durUpdate() {
  const a = $('as').value, e = $('ae').value; if (!a || !e) { $('adur').textContent = ''; return; }
  let m = toM(e) - toM(a); const over = m < 0; if (m <= 0) m += 1440;
  $('adur').innerHTML = m > 420 ? '<span style="color:var(--red)">' + OWW.hrs(m / 60) + ' — longer than 7 hours, it will be blocked</span>' : 'Duration: <b>' + OWW.hrs(m / 60) + '</b>' + (over ? ' (overnight)' : '');
}
$('as').oninput = $('ae').oninput = durUpdate; $('af').oninput = () => renderAtt();
function checkShift(date, st, en) {
  if (!date || !st || !en) return 'Enter the date, start time and end time';
  const a = toM(st); let z = toM(en); if (a === z) return 'Start and end time cannot be the same'; if (z < a) z += 1440;
  if ((z - a) / 60 > 7) return 'Blocked: a shift cannot be longer than 7 hours';
  if (A.shifts.some(x => { if (x.date !== date) return false; const p = toM(x.start); let q = toM(x.end); if (q < p) q += 1440; return a < q && z > p; }))
    return 'Overlap: you already logged a shift that conflicts with this time';
  return '';
}
async function saveShift() {
  const date = $('ad').value, start = $('as').value, end = $('ae').value, memo = $('am').value.trim(), bad = checkShift(date, start, end);
  if (bad) return OWW.toast(bad, 'red');
  const d = dev(date, start, end), g = A.grace ?? 5;
  if (d && (d.late > g || d.early > g)) return reasonSheet(devText(d), r => commitShift(date, start, end, memo, r, d)); // late / early: ask why first
  commitShift(date, start, end, memo, '', d);
}
async function commitShift(date, start, end, memo, reason, d) {
  let m = toM(end) - toM(start); if (m <= 0) m += 1440;
  const t = { id: 'tmp' + Date.now(), date, start, end, memo, reason, late: d ? d.late : 0, early: d ? d.early : 0, hours: Math.round(m / 60 * 100) / 100, pending: true };
  A.shifts.push(t); A.shifts.sort((x, y) => x.date === y.date ? y.start.localeCompare(x.start) : y.date.localeCompare(x.date));
  $('as').value = $('ae').value = $('am').value = ''; durUpdate(); renderAtt(); OWW.toast('Shift saved ✓'); // shown instantly
  try { const r = await OWW.send('shiftLog', { date, start, end, memo, reason }); if (r) { t.id = r.id; t.late = r.late; t.early = r.early; delete t.pending; renderAtt(); localStorage.setItem(akey(), JSON.stringify(A)); } }
  catch (e) {
    A.shifts = A.shifts.filter(x => x !== t); renderAtt();
    const q = /^REASON_REQUIRED:(\d+):(\d+)$/.exec(e.message); // the server found a late / early leave that the phone could not see (e.g. a past day)
    if (q) return reasonSheet(devText({ late: +q[1], early: +q[2] }), r => commitShift(date, start, end, memo, r, d));
    $('as').value = start; $('ae').value = end; $('am').value = memo; durUpdate(); OWW.toast(e.message, 'red');
  }
}
function stats() {
  const d = new Date(), mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7), prev = new Date(mon); prev.setDate(mon.getDate() - 7);
  const w0 = OWW.ymd(mon), p0 = OWW.ymd(prev), m0 = OWW.ymd(d).slice(0, 7), s = { week: 0, last: 0, month: 0 }, days = new Set();
  A.shifts.forEach(x => { if (x.date >= w0) s.week += x.hours; else if (x.date >= p0) s.last += x.hours; if (x.date.slice(0, 7) === m0) { s.month += x.hours; days.add(x.date); } });
  s.days = days.size; return s;
}
function renderAtt() {
  renderMyRota();
  const s = stats();
  $('astats').innerHTML = [['This week', OWW.hrs(s.week)], ['Last week', OWW.hrs(s.last)], ['This month', OWW.hrs(s.month)], ['Days this month', s.days], ['Late this month', lateN()]]
    .map(x => `<div class="stat"><small>${x[0]}</small><b style="font-size:21px">${x[1]}</b></div>`).join('');
  const f = $('af').value, l = A.shifts.filter(x => !f || x.date === f), g = {};
  l.forEach(x => (g[x.date] = g[x.date] || []).push(x));
  $('alist').innerHTML = Object.keys(g).length ? Object.keys(g).map(d => `<div class="sec">${OWW.day(d)}</div><div class="card">` + g[d].map(x =>
    `<div class="row"><span class="tag b">${OWW.kind(x.start)}</span><div class="grow"><div class="nm">${esc(x.start)} → ${esc(x.end)}</div>${x.memo ? `<div class="sub">${esc(x.memo)}</div>` : ''}</div>${pTags(x)}${stTag(x)}<b>${OWW.hrs(x.hours)}</b></div>`).join('') + '</div>').join('')
    : '<div class="empty">No shifts logged' + (f ? ' on this date' : ' yet') + '</div>';
}
