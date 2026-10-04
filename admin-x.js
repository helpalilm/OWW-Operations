// Admin extras: HACCP fridges + readings, weekly rota, hours approval + export
const stTag = x => x.status === 'APPROVED' ? '<span class="tag g">Approved</span>' : x.status === 'REJECTED' ? '<span class="tag r">Rejected</span>' : '<span class="tag">Pending</span>';
const apBtn = x => x.status === 'APPROVED' ? '' : `<button class="sm g" aria-label="Approve" onclick="setSt('${esc(x.id)}','APPROVED')">✓</button>` + (x.status === 'REJECTED' ? '' : `<button class="sm" aria-label="Reject" onclick="setSt('${esc(x.id)}','REJECTED')">⊘</button>`);

// ── hours approval + export ──
async function setSt(id, st) {
  let note = ''; if (st === 'REJECTED') { note = prompt('Reason (shown to the staff member)'); if (note === null) return; }
  try { await OWW.api('shiftApprove', { ids: [id], status: st, note }); await loadDash(); } catch (e) { OWW.toast(e.message, 'red'); }
}
async function approveAll() {
  const ids = S.filter(x => x.status === 'PENDING').map(x => x.id); if (!ids.length) return OWW.toast('Nothing pending in this period', 'amber');
  if (!confirm('Approve ' + ids.length + ' pending shifts in this period?')) return;
  try { await OWW.api('shiftApprove', { ids, status: 'APPROVED' }); OWW.toast('Approved ✓'); await loadDash(); } catch (e) { OWW.toast(e.message, 'red'); }
}
function exportCsv() {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', n = h => h.toFixed(2).replace('.', ','), per = {};
  const l = ['Date;Name;Role;Start;End;Hours;Status;Note'];
  [...S].reverse().forEach(x => { l.push([x.date, q(x.name), q(x.role), x.start, x.end, n(x.hours), x.status, q(x.memo)].join(';'));
    const p = per[x.name] = per[x.name] || { APPROVED: 0, PENDING: 0, REJECTED: 0 }; p[x.status] = (p[x.status] || 0) + x.hours; });
  l.push('', 'Summary;Approved hours;Pending hours;Rejected hours');
  Object.keys(per).sort().forEach(k => l.push([q(k), n(per[k].APPROVED), n(per[k].PENDING), n(per[k].REJECTED)].join(';')));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + l.join('\r\n')], { type: 'text/csv' }));
  a.download = `oww-hours-${$('df').value}_${$('dt').value}.csv`; a.click();
}

// ── HACCP ──
let H = { fridges: [], logs: [] };
OWW.hooks['p-haccp'] = () => loadH();
$('hd').value = OWW.ymd(new Date()); $('hd').onchange = () => loadH();
async function loadH() {
  try { H = await OWW.api('tempData', { date: $('hd').value || OWW.ymd(new Date()) }); } catch (e) { return OWW.toast(e.message, 'red'); }
  renderH();
}
const hcell = l => l ? `<span class="tag ${l.status === 'ALERT' ? 'r' : 'g'}">${l.temp}°</span>` : '<span class="tag">—</span>';
function renderH() {
  const act = H.fridges.filter(f => f.active), alerts = H.logs.filter(l => l.status === 'ALERT').length, isToday = $('hd').value === OWW.ymd(new Date());
  $('hb').textContent = alerts; $('hb').classList.toggle('hide', !alerts || !isToday);
  $('hstats').innerHTML = [['Fridges', act.length, ''], ['Readings', H.logs.length, ''], ['Out of range', alerts, alerts ? 'var(--red)' : '']].map(s => `<div class="stat"><small>${s[0]}</small><b style="color:${s[2] || 'inherit'}">${s[1]}</b></div>`).join('');
  const g = (f, sh, p) => hcell(H.logs.find(l => l.fridgeId === f.id && l.shift === sh && l.phase === p));
  $('hgrid').innerHTML = act.length ? '<div class="card">' + act.map(f => `<div class="row" style="flex-wrap:wrap"><div class="grow"><div class="nm">${esc(f.name)}</div><div class="sub">${f.min}° to ${f.max}°C</div></div>
    <div style="display:grid;grid-template-columns:auto auto auto;gap:4px 8px;align-items:center;font-size:12px;color:var(--tx3)"><span></span><span>Start</span><span>End</span>
      <span>Day</span>${g(f, 'Day', 'Start')}${g(f, 'Day', 'End')}<span>Night</span>${g(f, 'Night', 'Start')}${g(f, 'Night', 'End')}</div></div>`).join('') + '</div>'
    : '<div class="card"><div class="empty">No fridges yet. Tap “Add fridge”.</div></div>';
  $('hfr').innerHTML = H.fridges.length ? H.fridges.map(f => `<div class="row"><div class="grow"><div class="nm">${esc(f.name)}</div><div class="sub">${esc(f.type)} · ${f.min}° to ${f.max}°C</div></div>
    <span class="tag ${f.active ? 'g' : ''}">${f.active ? 'Active' : 'Inactive'}</span><button class="sm" onclick="fridgeForm('${esc(f.id)}')">Edit</button></div>`).join('') : '<div class="empty">No fridges yet. Tap “Add fridge”.</div>';
}
const DEF = { Fridge: [0, 5], Freezer: [-30, -18], Other: [0, 5] };
function fridgeForm(id) {
  const f = H.fridges.find(x => x.id === id) || { type: 'Fridge', min: 0, max: 5, name: '', active: true };
  OWW.sheet(`<div class="nm" style="font-size:18px">${id ? 'Edit fridge' : 'Add fridge'}</div><input id="fn" placeholder="Name, e.g. Fridge 3 – sauces" value="${esc(f.name)}" maxlength="60">
    <select id="ft" onchange="const d=DEF[this.value];$('fmin').value=d[0];$('fmax').value=d[1]">${['Fridge', 'Freezer', 'Other'].map(t => `<option ${t === f.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <div class="two"><label class="fld"><small>Min °C</small><input id="fmin" type="number" step="0.5" value="${f.min}"></label><label class="fld"><small>Max °C</small><input id="fmax" type="number" step="0.5" value="${f.max}"></label></div>
    <select id="fa"><option value="1" ${f.active ? 'selected' : ''}>Active</option><option value="0" ${f.active ? '' : 'selected'}>Inactive</option></select><div class="err" id="fer"></div>
    <button class="btn p w" onclick="saveFridge('${esc(id || '')}')">Save</button><button class="btn w" onclick="OWW.close()">Cancel</button>`);
}
async function saveFridge(id) {
  try { await OWW.api('fridgeSave', { id: id || undefined, name: $('fn').value, type: $('ft').value, min: $('fmin').value, max: $('fmax').value, active: $('fa').value === '1' }); OWW.close(); await loadH(); }
  catch (e) { $('fer').textContent = e.message; }
}

// ── weekly rota ──
const addd = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
let RM = (() => { const x = new Date(); x.setHours(12); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; })(), RD = { rows: [], users: [] };
OWW.hooks['p-rota'] = () => loadRota();
async function loadRota() { try { RD = await OWW.api('rotaWeek', { from: OWW.ymd(RM) }); } catch (e) { return OWW.toast(e.message, 'red'); } renderRota(); }
function wk(n) { RM = addd(RM, 7 * n); loadRota(); }
function renderRota() {
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addd(RM, i)), dir = OWW.user.role === 'Director', t = OWW.ymd(new Date()), f = (d, o) => d.toLocaleDateString(OWW.loc(), o);
  $('wlab').textContent = f(days[0], { day: 'numeric', month: 'short' }) + ' – ' + f(days[6], { day: 'numeric', month: 'short', year: 'numeric' });
  $('rbar').classList.toggle('hide', !dir);
  $('rnote').textContent = dir ? 'Tap a cell to add or remove a shift. Staff get an email reminder about an hour before.' : 'Only the director can edit the rota.';
  $('rtab').innerHTML = '<table class="rt"><tr><th>Staff</th>' + days.map(d => `<th${OWW.ymd(d) === t ? ' style="color:var(--amber)"' : ''}>${f(d, { weekday: 'short' })}<br>${d.getDate()}</th>`).join('') + '</tr>' +
    RD.users.map(u => `<tr><td><b>${esc(u.full)}</b><br><span class="sub">${esc(u.role)}</span></td>` + days.map(d => { const ds = OWW.ymd(d), l = RD.rows.filter(r => r.uid === u.id && r.date === ds);
      return `<td class="c" data-u="${esc(u.id)}" data-d="${ds}">${l.map(r => `<span class="chipx">${esc(r.start)}–${esc(r.end)}</span>`).join('')}</td>`; }).join('') + '</tr>').join('') + '</table>';
}
$('rtab').onclick = e => { const c = e.target.closest('[data-u]'); if (c && OWW.user.role === 'Director') cellForm(c.dataset.u, c.dataset.d); };
function cellForm(uid, ds) {
  const u = RD.users.find(x => x.id === uid), l = RD.rows.filter(r => r.uid === uid && r.date === ds);
  OWW.sheet(`<div><div class="nm" style="font-size:18px">${esc(u.full)}</div><div class="sub">${OWW.day(ds)}</div></div>
    ${l.map(r => `<div class="row" style="padding:0"><span class="grow nm">${esc(r.start)} → ${esc(r.end)}${r.note ? ' · ' + esc(r.note) : ''}</span><button class="sm" aria-label="Delete" onclick="rotaDel('${esc(r.id)}')">✕</button></div>`).join('')}
    <div class="two"><label class="fld"><small>Start time</small><input type="time" id="rs"></label><label class="fld"><small>End time</small><input type="time" id="re"></label></div>
    <input id="rn" placeholder="Note (optional)" maxlength="80"><div class="err" id="rer"></div>
    <button class="btn p w" onclick="rotaAdd('${esc(uid)}','${ds}')">Add shift</button><button class="btn w" onclick="OWW.close()">Close</button>`);
}
async function rotaAdd(uid, ds) {
  try { await OWW.api('rotaSave', { userId: uid, date: ds, start: $('rs').value, end: $('re').value, note: $('rn').value.trim() }); OWW.close(); await loadRota(); }
  catch (e) { $('rer').textContent = e.message; }
}
async function rotaDel(id) { try { await OWW.api('rotaDelete', { id }); OWW.close(); await loadRota(); } catch (e) { OWW.toast(e.message, 'red'); } }
async function copyWeek() {
  if (!confirm('Copy the previous week into this week?')) return;
  try { const n = await OWW.api('rotaCopy', { from: OWW.ymd(addd(RM, -7)), to: OWW.ymd(RM) }); OWW.toast(n + ' shifts copied ✓'); await loadRota(); } catch (e) { OWW.toast(e.message, 'red'); }
}

// ── rota import: Excel / CSV / photo → review → one request ──
const XLSXJS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const OFFW = ['riposo', 'ferie', 'infortunio', 'malattia', 'permesso', 'assente'], TM = '\\d{1,2}(?:[,.:]\\d{2})?';
const CHAIN = new RegExp('^' + TM + '(?:\\s*[-–—]\\s*' + TM + ')+$');
const CELLRX = new RegExp(TM + '(?:\\s*[-–—~]\\s*' + TM + ')+|r[il1]p[o0]s[o0]|f[e3]r[il1][e3]|[il1]nf[o0]rtun[il1][o0]|malatt[il1]a|perm[e3]ss[o0]|assente', 'gi');
const ROLEW = /direttore|capo|servizio|sala|cucina|lavapiatti|riposo|ferie|infortunio/gi;
let RR = [];
const lettersOf = s => nz(s).replace(/[^a-z]/g, '');
const monOf = s => { const d = new Date((s || OWW.ymd(RM)) + 'T12:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
const hh = x => { const m = /^(\d{1,2})(?:[,.:](\d{2}))?$/.exec(x); if (!m) return ''; const h = +m[1], mi = m[2] ? +m[2] : 0; return h > 24 || mi > 59 ? '' : String(h % 24).padStart(2, '0') + ':' + String(mi).padStart(2, '0'); };
// "12,00-15,00-19,00-22,30" = two split shifts (12:00-15:00 and 19:00-22:30); RIPOSO/FERIE/INFORTUNIO = no shift
function segs(cell) {
  const t = String(cell || '').trim(); if (!t) return { segs: [], off: '', bad: false };
  const w = lettersOf(/[a-z]{3,}/i.test(t) ? t.replace(/0/g, 'o') : t);
  if (w.length > 3 && OFFW.some(k => w === k || lev(w, k) <= 1)) return { segs: [], off: t, bad: false };
  const n = t.match(new RegExp(TM, 'g')) || [], out = [];
  if (n.length < 2 || n.length % 2) return { segs: [], off: '', bad: true };
  for (let i = 0; i < n.length; i += 2) { const a = hh(n[i]), b = hh(n[i + 1]); if (!a || !b || a === b) return { segs: [], off: '', bad: true }; out.push([a, b]); }
  return { segs: out, off: '', bad: false };
}
const shiftLike = c => { const t = String(c || '').trim(); return CHAIN.test(t) || (/[a-z]{4,}/i.test(t) && OFFW.some(k => lettersOf(t) === k)); };
function findWeek(txt) {
  const m = /dal\s*(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\s*al\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/i.exec(txt); if (!m) return '';
  let y = +m[6]; if (y < 100) y += 2000; let y1 = m[3] ? +m[3] : (+m[2] > +m[5] ? y - 1 : y); if (y1 < 100) y1 += 2000;
  return y1 + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
}
function xlRows(aoa) {
  const wk = findWeek(aoa.map(r => r.join(' ')).join(' '));
  let dc = null;
  for (const r of aoa) { const ix = []; r.forEach((c, i) => { if (/^(lun|mar|mer|gio|ven|sab|dom|mon|tue|wed|thu|fri|sat|sun)/.test(nz(c).trim())) ix.push(i); }); if (ix.length >= 7) { dc = ix.slice(0, 7); break; } }
  if (!dc) for (const r of aoa) { const ix = []; r.forEach((c, i) => { if (shiftLike(c)) ix.push(i); }); if (ix.length >= 7) { dc = ix.slice(0, 7); break; } }
  if (!dc) return { wk, rows: [] };
  const rows = [];
  aoa.forEach(r => {
    const cells = dc.map(i => String(r[i] ?? '').trim()); if (cells.filter(shiftLike).length < 2) return;
    const names = r.slice(0, dc[0]).map(x => String(x ?? '').trim()).filter(x => /[a-zA-ZÀ-ÿ]{2}/.test(x) && !/^(direttore|capo servizio|sala|cucina|lavapiatti)$/i.test(x));
    rows.push({ name: names[0] || '', role: '', cells, flag: false });
  });
  return { wk, rows };
}
function ocrRows(lines) {
  const rows = [];
  lines.forEach(l => {
    const ms = [...l.matchAll(CELLRX)]; if (ms.length < 3) return;
    const name = l.slice(0, ms[0].index).replace(ROLEW, ' ').replace(/[^A-Za-zÀ-ÿ' ]/g, ' ').replace(/\s+/g, ' ').trim(), c = ms.map(m => m[0].trim());
    rows.push({ name, role: '', cells: c.slice(0, 7).concat(Array(Math.max(0, 7 - c.length)).fill('')), flag: c.length !== 7 });
  });
  return { wk: findWeek(lines.join(' ')), rows };
}
function matchUser(name) {
  const nt = nz(name).replace(/[^a-z ]/g, ' ').split(/\s+/).filter(t => t.length > 1); if (!nt.length) return '';
  let best = '', bs = 0;
  RD.users.forEach(u => {
    const ut = nz(u.full).replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
    const sc = nt.reduce((s, t) => s + Math.max(0, ...ut.map(x => x === t ? 1 : (Math.max(x.length, t.length) >= 3 && 1 - lev(x, t) / Math.max(x.length, t.length) >= .72 ? .85 : 0))), 0) / nt.length;
    if (sc > bs) { bs = sc; best = u.id; }
  });
  return bs >= .7 ? best : '';
}
async function toJpeg(f) {
  const bm = await createImageBitmap(f, { imageOrientation: 'from-image' }), k = Math.min(1, 1800 / Math.max(bm.width, bm.height)), c = document.createElement('canvas');
  c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k); c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
  return { mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.85).split(',')[1] };
}
OWW.hooks['p-rimp'] = async () => { if (!RD.users.length) await loadRota(); $('rwk').value = $('rwk').value || OWW.ymd(RM);
  $('rhint').textContent = RD.ai ? 'Photos are read with AI (accurate). Excel / CSV is exact.' : 'Excel / CSV is exact. Photos use the free on-device reader: best effort, so check every cell.'; };
async function rimpRead() {
  const f = $('rfile').files[0]; if (!f) return OWW.toast('Choose a file first', 'amber');
  const b = $('rscan'), pg = t => $('rprog').textContent = t; b.disabled = true; RR = [];
  try {
    if (!RD.users.length) await loadRota();
    let res = { wk: '', rows: [] };
    if (/\.(xlsx|xls|csv)$/i.test(f.name)) {
      pg('Reading the spreadsheet…'); await lib(XLSXJS); let wb;
      if (/\.csv$/i.test(f.name)) { const t = await f.text(); wb = XLSX.read(t, { type: 'string', FS: (t.match(/;/g) || []).length >= 5 ? ';' : (t.match(/\t/g) || []).length >= 5 ? '\t' : ',' }); }
      else wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      wb.SheetNames.forEach(n => { const r = xlRows(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' })); if (r.rows.length > res.rows.length) res = r; });
    } else if (RD.ai) {
      pg('Reading the picture with AI…'); const j = await OWW.api('rotaScan', await toJpeg(f));
      res = { wk: j.week_start || '', rows: (j.rows || []).map(r => ({ name: r.name || '', role: '', cells: [0, 1, 2, 3, 4, 5, 6].map(i => String((r.cells || [])[i] ?? '')), flag: (r.cells || []).some(c => String(c).includes('?')) })) };
    } else { pg('Reading the picture on this device (can take a minute)…'); res = ocrRows(await ocr([await toCanvas(f)])); }
    if (!res.rows.length) OWW.toast('No timetable rows found. Try the Excel file or a sharper, flatter photo.', 'amber');
    RR = res.rows.map(r => ({ ...r, uid: matchUser(r.name) })); if (res.wk) $('rwk').value = res.wk;
  } catch (e) { OWW.toast(e.message, 'red'); }
  pg(''); b.disabled = false; renderRimp();
}
function renderRimp() {
  if (!RR.length) { $('rrev').innerHTML = ''; return; }
  const base = monOf($('rwk').value), dn = [0, 1, 2, 3, 4, 5, 6].map(k => { const d = addd(base, k); return d.toLocaleDateString(OWW.loc(), { weekday: 'short' }) + ' ' + d.getDate(); });
  const opts = RD.users.map(u => `<option value="${esc(u.id)}">${esc(u.full)}</option>`).join('');
  const ok = RR.filter(r => r.uid).length, chk = RR.filter(r => r.flag || r.cells.some(c => segs(c).bad)).length;
  $('rrev').innerHTML = `<div class="sec">Review</div><div class="note">${ok} matched to app users · ${RR.length - ok} not in the app (skipped unless you choose a person) · ${chk} to double-check. Week of ${esc(OWW.ymd(base))}.</div>` +
    RR.map((r, i) => `<div class="card" style="padding:12px;display:grid;gap:8px"><div style="display:flex;gap:8px;align-items:center"><div class="grow"><div class="sub">“${esc(r.name || '?')}”</div>
      <select data-ri="${i}" aria-label="Person"><option value="">— skip (not in the app) —</option>${opts.replace(`value="${esc(r.uid)}"`, `value="${esc(r.uid)}" selected`)}</select></div>${r.flag ? '<span class="tag a">check</span>' : ''}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px">${r.cells.map((c, k) => `<label class="fld"><small>${esc(dn[k])}</small><input data-rc="${i}:${k}" value="${esc(c)}" style="${segs(c).bad ? 'border-color:var(--red)' : ''}"></label>`).join('')}</div></div>`).join('') +
    '<div class="bar"><button class="btn g" onclick="rimpApply()">Import shifts</button></div>';
}
$('rwk').onchange = () => renderRimp();
$('rrev').onchange = e => { const i = e.target.dataset.ri; if (i !== undefined) RR[i].uid = e.target.value; };
$('rrev').oninput = e => { const p = e.target.dataset.rc; if (!p) return; const [i, k] = p.split(':'); RR[i].cells[k] = e.target.value; e.target.style.borderColor = segs(e.target.value).bad ? 'var(--red)' : ''; };
async function rimpApply() {
  const base = monOf($('rwk').value), items = []; let ppl = 0;
  RR.forEach(r => { if (!r.uid) return; let n = 0; r.cells.forEach((c, k) => segs(c).segs.forEach(s => { items.push({ userId: r.uid, date: OWW.ymd(addd(base, k)), start: s[0], end: s[1] }); n++; })); if (n) ppl++; });
  if (!items.length) return OWW.toast('Nothing to import yet. Choose a person for each row.', 'amber');
  if (RR.some(r => r.uid && r.cells.some(c => segs(c).bad)) && !confirm('Some cells (red) could not be read and will be skipped. Continue?')) return;
  if (!confirm('Import ' + items.length + ' shifts for ' + ppl + ' people for the week starting ' + OWW.ymd(base) + '?\nExisting shifts of these people in that week are replaced.')) return;
  try { const r = await OWW.api('rotaImport', { from: OWW.ymd(base), items, replace: true }); OWW.toast(r.added + ' shifts imported ✓'); RM = base; RR = []; $('rfile').value = ''; OWW.go('p-rota'); }
  catch (e) { OWW.toast(e.message, 'red'); }
}
