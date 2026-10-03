// Kitchen extras: upcoming events, fridge temperature checks, my rota, recipe cards
const stTag = x => x.pending ? '<span class="tag a">syncing</span>' : x.status === 'APPROVED' ? '<span class="tag g">Approved</span>' : x.status === 'REJECTED' ? '<span class="tag r">Rejected</span>' : '<span class="tag">Pending</span>';
let EVK = [], H = { fridges: [], logs: [] }, ph = 'Start';
const relD = d => { const n = Math.round((new Date(d + 'T12:00') - new Date(OWW.ymd(new Date()) + 'T12:00')) / 864e5); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'in ' + n + ' days'; };

async function loadX() {
  try { [EVK, H] = await Promise.all([OWW.api('eventList'), OWW.api('tempData', {})]); } catch (e) { return; }
  renderEvk(); renderChk();
}
// ── events ──
function renderEvk() {
  const l = EVK.slice(0, 5);
  $('evk').innerHTML = l.length ? '<div class="sec">Upcoming events</div><div class="card">' + l.map(e => { const d = new Date(e.date + 'T12:00');
    return `<div class="row"><div style="min-width:46px;text-align:center"><div style="font-weight:700;font-size:20px;line-height:1">${d.getDate()}</div><div class="sub">${d.toLocaleDateString(OWW.loc(), { month: 'short' })}</div></div>
      <div class="grow"><div class="nm">${esc(e.title)}</div><div class="sub">${relD(e.date)}${e.time ? ' · ' + esc(e.time) : ''}${e.notes ? ' · ' + esc(e.notes) : ''}</div></div></div>`; }).join('') + '</div>' : '';
}
// ── fridge temperatures ──
OWW.hooks['p-chk'] = () => renderChk();
document.querySelectorAll('#pseg button').forEach(b => b.onclick = () => { ph = b.dataset.p; document.querySelectorAll('#pseg button').forEach(x => x.classList.toggle('on', x === b)); renderChk(); });
function shiftDate() { const d = new Date(); if (shift === 'Night' && d.getHours() < 6) d.setDate(d.getDate() - 1); return OWW.ymd(d); }
function renderChk() {
  const sd = shiftDate(), mine = H.logs.filter(l => l.date === sd && l.shift === shift && l.phase === ph);
  $('chk').innerHTML = H.fridges.length ? H.fridges.map(f => { const l = mine.find(x => x.fridgeId === f.id);
    return `<div class="row" data-f="${esc(f.id)}"><div class="grow"><div class="nm">${esc(f.name)}</div><div class="sub">${esc(f.type)} · ${f.min}° to ${f.max}°C${l ? ' · saved by ' + esc(l.by) : ''}</div></div>
      ${l ? `<span class="tag ${l.status === 'ALERT' ? 'r' : 'g'}">${l.status === 'ALERT' ? 'Out of range' : 'OK'}</span>` : ''}
      <button class="sm" data-neg aria-label="Plus/minus">±</button><input class="qty" type="text" inputmode="decimal" data-t value="${l ? esc(l.temp) : ''}" placeholder="°C" aria-label="Temperature"></div>`; }).join('')
    : '<div class="empty">No fridges set up yet. Ask your manager to add them in Admin → HACCP.</div>';
  paintT();
}
function paintT() {
  document.querySelectorAll('#chk [data-t]').forEach(i => { const f = H.fridges.find(x => x.id === i.closest('[data-f]').dataset.f), v = parseFloat(i.value.replace(',', '.'));
    i.style.borderColor = i.value !== '' && !isNaN(v) && (v < f.min || v > f.max) ? 'var(--red)' : ''; });
}
$('chk').oninput = paintT;
$('chk').onclick = e => { const b = e.target.closest('[data-neg]'); if (!b) return; const i = b.nextElementSibling; i.value = i.value.startsWith('-') ? i.value.slice(1) : '-' + i.value; paintT(); };
async function saveTemps() {
  const items = [...document.querySelectorAll('#chk [data-t]')].filter(i => i.value.trim() !== '').map(i => ({ fridgeId: i.closest('[data-f]').dataset.f, temp: i.value.trim() }));
  if (!items.length) return OWW.toast('Enter at least one temperature', 'amber');
  const b = $('chk-save'); b.disabled = true;
  try { const r = await OWW.api('tempLog', { shift, phase: ph, items });
    OWW.toast(r.alerts.length ? '⚠ Out of range: ' + r.alerts.join(', ') + ' — tell your manager' : 'Temperatures saved ✓', r.alerts.length ? 'red' : 'green'); await loadX(); }
  catch (e) { OWW.toast(e.message, 'red'); }
  b.disabled = false;
}
// ── my planned shifts (inside the Shifts tab) ──
function renderRota() {
  const l = A.rota || [];
  $('rotam').innerHTML = l.length ? '<div class="sec">My upcoming shifts</div><div class="card">' + l.map(r => `<div class="row"><div class="grow"><div class="nm">${OWW.day(r.date)}</div>
    <div class="sub">${esc(r.start)} → ${esc(r.end)}${r.note ? ' · ' + esc(r.note) : ''}</div></div><button class="sm a" data-use="${esc(r.id)}">Use for log</button></div>`).join('') + '</div>'
    : '<div class="note">No planned shifts yet. Your manager adds them in the rota.</div>';
}
$('rotam').onclick = e => {
  const b = e.target.closest('[data-use]'); if (!b) return; const r = (A.rota || []).find(x => x.id === b.dataset.use); if (!r) return;
  $('ad').value = r.date; $('as').value = r.start; $('ae').value = r.end; $('am').value = r.note || '';
  document.querySelector('#aseg [data-v=log]').click(); durUpdate(); $('a-log').scrollIntoView({ behavior: 'smooth' });
};
// ── recipe card + allergens ──
async function showRecipe() {
  const p = cur; OWW.sheet('<div class="empty">Loading…</div>');
  try {
    const r = await OWW.api('recipe', { prepId: p['Prep ID'] }), un = r.unchecked;
    OWW.sheet(`<div><div class="nm" style="font-size:18px">${esc(r.name)}</div><div class="sub">${esc(r.dose)}</div></div>
      <div><div class="sub" style="margin-bottom:6px">Allergens</div>${r.allergens.map(a => `<span class="tag r" style="margin:0 4px 4px 0">${esc(a)}</span>`).join('')}
        ${!r.allergens.length && !un.length ? '<span class="tag g">None recorded</span>' : ''}
        ${un.length ? `<div class="sub" style="color:var(--amber);margin-top:4px">⚠ Not checked yet for: ${esc(un.slice(0, 6).join(', '))}${un.length > 6 ? '…' : ''}</div>` : ''}</div>
      <div><div class="sub" style="margin-bottom:4px">Ingredients per dose</div>${r.ingredients.length ? r.ingredients.map(i => `<div class="row" style="padding:7px 0;min-height:0"><span class="grow">${esc(i.name)}</span><b>${esc(i.qty)} ${esc(i.unit)}</b></div>`).join('') : '<div class="sub">—</div>'}</div>
      <div><div class="sub" style="margin-bottom:4px">Method</div><div style="white-space:pre-wrap;font-size:14px">${r.method ? esc(r.method) : '<span class="sub">No method written yet. Add it in the global sheet, RECIPES tab.</span>'}</div>${r.notes ? `<div class="sub" style="margin-top:8px">${esc(r.notes)}</div>` : ''}</div>
      <button class="btn w" onclick="drawQty()">Back</button>`);
  } catch (e) { drawQty(); OWW.toast(e.message, 'red'); }
}
