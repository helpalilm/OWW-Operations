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
