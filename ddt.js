// Reads the weekly HAVI delivery note (DDT, PDF) and turns it into stock-in for ONE area.
// Shared by the Admin app (area KITCHEN = group FOOD) and the Sala app (area SALA = BEVE, PAPER, OPER, UNIF).
// Nothing is saved until the manager has checked the review list and pressed the green button.
const DDT = {
  PDFJS: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  PDFW: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  SECTION: { 'SURGELATO/CONGELATO': 'Cella Negativa', 'REFRIGERATO': 'Frigo +', 'SECCO GENERALE': 'Scaffale' }, // where the item lives, from the note's headings
  area: (group, over) => over || (String(group).toUpperCase() === 'FOOD' ? 'KITCHEN' : 'SALA'),
  num: s => { const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }, // 21,890 -> 21.89
  iso: d => d.slice(6, 10) + '-' + d.slice(3, 5) + '-' + d.slice(0, 2),
  key: rimos => String(rimos).replace(/^0+/, ''), // 0000056096-500-000 -> 56096-500-000 (the supplier code we remember)
  clean: d => String(d).replace(/^O\./, '').replace(/\s+/g, ' ').trim()
};

// lines (text, top to bottom) -> { doc, lines[] }. Pure function: easy to test.
DDT.parse = function (rows) {
  const ITEM = /^(\d{10}-\d{3}-\d{3})\s+(\S+)\s+(.+?)\s+(\d+,\d{2})\s+(KG|PCE|L)\s+(\d+,\d{3})\s+_+\s*(KG|BOX|PCE|FUS)\s+(\d+)?\s*(FOOD|BEVE|PAPER|OPER|UNIF)\b/;
  const LOT = /^(\d{2}\/\d{2}\/\d{4})\s+(KG|PCE|L)\s+(\d+,\d{3})\s+(KG|BOX|PCE|FUS)(?:\s+(\d+))?\s*$/;
  const doc = { no: '', date: '', colli: 0, kg: 0 }, out = [], byCode = {};
  let cur = null, section = '';
  rows.map(r => String(r).replace(/\s+/g, ' ').trim()).filter(Boolean).forEach(t => {
    let m;
    if (!doc.no && (m = /Documento N\.\s*(\d+)/.exec(t))) doc.no = m[1];
    if (!doc.date && (m = /Data consegna\s*(\d{2}\/\d{2}\/\d{4})/.exec(t))) doc.date = DDT.iso(m[1]);
    if ((m = /Numero totale colli\s*(\d+)/.exec(t))) doc.colli = +m[1];
    if ((m = /Totale peso lordo\s*([\d.,]+)/.exec(t))) doc.kg = DDT.num(m[1]);
    if (DDT.SECTION[t]) { section = t; cur = null; return; }
    if ((m = ITEM.exec(t))) {
      cur = { rimos: m[1], code: DDT.key(m[1]), alias: m[2], desc: DDT.clean(m[3]), content: DDT.num(m[4]), uom: m[5], qty: DDT.num(m[6]), un: m[7],
        crtns: m[8] ? +m[8] : 0, group: m[9], section: section, storage: DDT.SECTION[section] || '', lots: [], ordered: null, runOut: false, subFor: '', subBy: '', note: '' };
      byCode[cur.code] = cur; out.push(cur); return;
    }
    if (!cur) return;
    if ((m = LOT.exec(t))) { cur.lots.push({ exp: DDT.iso(m[1]), qty: DDT.num(m[3]), un: m[4] }); return; }
    if ((m = /Ordinata\s*([\d.,]+)/.exec(t)) && /Attenzione/i.test(t)) { cur.ordered = DDT.num(m[1].replace(/[.,]$/, '')); cur.note = 'Delivered quantity differs from the order'; return; }
    if (/run-?out/i.test(t)) { cur.runOut = true; const o = /Ordinato\s*([\d.,]+)/.exec(t), s = /(\d{5}-\d{3}-\d{3})/.exec(t); cur.ordered = o ? DDT.num(o[1].replace(/[.,]$/, '')) : cur.ordered; cur.subBy = s ? s[1] : ''; cur.note = 'Discontinued item: replaced by ' + (s ? s[1] : 'another article'); return; }
    if ((m = /sostitutivo per\s*(\d{5}-\d{3}-\d{3})/i.exec(t))) { cur.subFor = m[1]; cur.note = 'Replaces ' + m[1]; }
  });
  return { doc: doc, lines: out };
};

// default conversion: how many STOCK units one delivered unit is worth (editable on the review screen, then remembered)
DDT.factor = l => l.content || 1; // the note says how much of the unit (kg, pieces, litres) is inside ONE delivered box / piece / keg

// ---- PDF -> text lines (same technique as the stock-count import) ----
DDT.lib = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Could not load the PDF reader. Check your internet connection.')); document.head.appendChild(s); });
DDT.pdfRows = async function (file) {
  await DDT.lib(DDT.PDFJS); pdfjsLib.GlobalWorkerOptions.workerSrc = DDT.PDFW;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise, lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent(), rows = {};
    tc.items.forEach(i => { if (!i.str.trim()) return; const y = Math.round(i.transform[5] / 5); (rows[y] = rows[y] || []).push(i); });
    Object.keys(rows).map(Number).sort((a, b) => b - a).forEach(y => lines.push(rows[y].sort((a, b) => a.transform[4] - b.transform[4]).map(i => i.str).join(' ')));
  }
  return lines;
};

// ---- review + apply screen ----
// DDT.mount('elementId', { area: 'KITCHEN'|'SALA', after: () => reload })
DDT.mount = function (id, cfg) {
  const $ = document.getElementById.bind(document), esc = OWW.esc, S = { M: null, P: null, L: [], busy: false };
  const el = $(id);
  el.innerHTML = `<div class="card"><div class="row" style="display:grid;gap:10px">
      <div class="nm">Friday delivery note (DDT)</div>
      <div class="sub">Upload the HAVI delivery note as a PDF. Only the ${cfg.area === 'KITCHEN' ? 'FOOD' : 'drinks, paper, cleaning and uniform'} lines are shown here; the rest belong to the ${cfg.area === 'KITCHEN' ? 'Sala' : 'Kitchen'} app. Nothing changes until you press the green button.</div>
      <input type="file" id="${id}-f" accept="application/pdf">
      <button class="btn p w" id="${id}-b">Read delivery note</button><div class="sub" id="${id}-s"></div></div></div><div id="${id}-r"></div>`;
  const say = t => $(id + '-s').textContent = t;
  $(id + '-b').onclick = async () => {
    const f = $(id + '-f').files[0]; if (!f) return OWW.toast('Choose the PDF first', 'amber');
    const b = $(id + '-b'); b.disabled = true; say('Reading…');
    try {
      const p = DDT.parse(await DDT.pdfRows(f)); if (!p.lines.length || !p.doc.no) throw new Error('This does not look like a HAVI delivery note.');
      S.M = await OWW.api('ddtMatch', { no: p.doc.no });
      S.P = p; S.L = p.lines.filter(l => DDT.area(l.group, (S.M.map[l.code] || {}).area) === cfg.area).map(l => DDT.prep(l, S.M, cfg.area));
      S.other = p.lines.length - S.L.length; say('');
    } catch (e) { OWW.toast(e.message, 'red'); say(''); S.P = null; }
    b.disabled = false; draw();
  };
  function draw() {
    const r = $(id + '-r'); if (!S.P) { r.innerHTML = ''; return; }
    const pend = S.L.filter(l => !l.skip), nw = pend.filter(l => l.itemId === '+').length, un = pend.filter(l => !l.itemId).length;
    r.innerHTML = `<div class="sec">Delivery note ${esc(S.P.doc.no)} · ${esc(S.P.doc.date)}</div>
      <div class="note">${S.L.length} lines for this app${S.other ? ' (' + S.other + ' other lines belong to the ' + (cfg.area === 'KITCHEN' ? 'Sala' : 'Kitchen') + ' app)' : ''}. ${S.M.done ? '<b style="color:var(--amber)">This delivery note was already applied here.</b> ' : ''}${un ? '<b style="color:var(--amber)">' + un + ' still need an item.</b> ' : ''}${nw ? nw + ' new item(s) will be created.' : ''}</div>
      ${un ? `<div class="bar"><button class="btn" id="${id}-new">Create the ${un} unmatched lines as new items</button></div>` : ''}
      <div class="card">${S.L.map((l, i) => row(l, i)).join('') || '<div class="empty">No lines for this app</div>'}</div>
      <div class="bar"><button class="btn g" id="${id}-go" ${S.busy ? 'disabled' : ''}>Add to stock (${pend.filter(l => l.itemId).length} items)</button></div>`;
  }
  function row(l, i) {
    const opts = '<option value="">— choose item —</option><option value="+">+ Create as new item</option>' + S.M.items.map(x => `<option value="${esc(x.id)}" ${x.id === l.itemId ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    const tag = l.qty === 0 ? '<span class="tag r">Not delivered</span>' : l.ordered !== null && l.ordered !== l.qty ? `<span class="tag a">Short: ordered ${esc(String(l.ordered).replace('.', ','))}</span>` : '';
    const lots = l.lots.length ? l.lots.map(x => x.exp.split('-').reverse().join('/')).filter((v, k, a) => a.indexOf(v) === k).join(', ') : '';
    const nw = l.itemId === '+' ? `<div class="two" style="margin-top:6px"><input data-n="${i}" value="${esc(l.newName)}" placeholder="Item name" aria-label="New item name"><input data-u="${i}" value="${esc(l.newUnit)}" placeholder="Stock unit" aria-label="Stock unit"></div>` : '';
    return `<div class="row" style="flex-wrap:wrap;${l.skip ? 'opacity:.45' : ''}"><div class="grow" style="min-width:180px"><div class="nm">${esc(l.desc)}</div>
      <div class="sub">${esc(String(l.qty).replace('.', ','))} ${esc(l.un)}${l.content && l.un !== l.uom ? ' × ' + esc(String(l.content).replace('.', ',')) + ' ' + esc(l.uom) : ''}${lots ? ' · expires ' + esc(lots) : ''} ${tag}</div>${l.note ? `<div class="sub" style="color:var(--amber)">${esc(l.note)}</div>` : ''}
      ${!l.itemId && l.sugg ? `<button class="sm a" data-g="${i}" style="margin-bottom:6px">Use “${esc((S.M.items.find(x => x.id === l.sugg) || {}).name || '')}”</button>` : ''}
      <select data-i="${i}" aria-label="Item">${opts}</select>${nw}</div>
      <div style="display:grid;gap:3px;justify-items:end"><input class="qty" type="number" step="any" min="0" inputmode="decimal" data-q="${i}" value="${l.stock}" aria-label="Quantity to add to stock"><div class="sub">to stock · ×${esc(String(l.factor).replace('.', ','))}</div>
      <button class="sm" data-k="${i}">${l.skip ? 'Include' : 'Skip'}</button></div></div>`;
  }
  bind();
  function bind() {
    el.addEventListener('change', e => {
      const t = e.target, L = S.L; let i;
      if ((i = t.dataset.i) !== undefined) { const l = L[i]; l.itemId = t.value; const it = S.M.items.find(x => x.id === t.value); if (it) { const m = S.M.map[l.code]; l.factor = m && m.itemId === it.id ? m.factor : DDT.factor(l); l.stock = DDT.round(l.qty * l.factor); } else if (t.value === '+') { l.factor = DDT.factor(l); l.stock = DDT.round(l.qty * l.factor); } draw(); }
      else if ((i = t.dataset.q) !== undefined) { L[i].stock = parseFloat(t.value) || 0; L[i].factor = L[i].qty ? DDT.round(L[i].stock / L[i].qty) : L[i].factor; draw(); }
      else if ((i = t.dataset.n) !== undefined) L[i].newName = t.value; else if ((i = t.dataset.u) !== undefined) L[i].newUnit = t.value;
    });
    el.addEventListener('click', async e => {
      const k = e.target.closest('[data-k]'); if (k) { S.L[k.dataset.k].skip = !S.L[k.dataset.k].skip; draw(); return; }
      const g = e.target.closest('[data-g]'); if (g) { const l = S.L[g.dataset.g]; l.itemId = l.sugg; const m = S.M.map[l.code]; l.factor = m && m.itemId === l.itemId ? m.factor : DDT.factor(l); l.stock = DDT.round(l.qty * l.factor); draw(); return; }
      if (e.target.closest('#' + id + '-new')) { S.L.forEach(l => { if (!l.skip && !l.itemId) { l.itemId = '+'; l.factor = DDT.factor(l); l.stock = DDT.round(l.qty * l.factor); } }); draw(); return; }
      if (!e.target.closest('#' + id + '-go') || S.busy) return;
      const go = S.L.filter(l => !l.skip && l.itemId && l.qty > 0), bad = go.filter(l => l.itemId === '+' && !l.newName.trim());
      if (bad.length) return OWW.toast('Give each new item a name', 'amber');
      if (!go.length) return OWW.toast('Nothing to add yet', 'amber');
      if (S.M.done && !confirm('This delivery note was already applied. Add it to stock AGAIN?')) return;
      if (!confirm('Add ' + go.length + ' items from delivery note ' + S.P.doc.no + ' to your stock?')) return;
      S.busy = true; draw();
      try {
        const res = await OWW.api('ddtApply', { doc: S.P.doc, again: !!S.M.done, lines: go.map(l => ({ code: l.code, desc: l.desc, group: l.group, uom: l.uom, un: l.un, content: l.content, qty: l.qty, ordered: l.ordered, lots: l.lots, note: l.note,
          itemId: l.itemId, factor: l.factor, stock: l.stock, newName: l.newName.trim(), newUnit: l.newUnit.trim(), storage: l.storage })) });
        OWW.toast(res.items + ' items added to stock' + (res.created ? ' · ' + res.created + ' new' : '') + ' ✓'); S.P = null; $(id + '-f').value = ''; if (cfg.after) await cfg.after();
      } catch (x) { OWW.toast(x.message, 'red'); }
      S.busy = false; draw();
    });
  }
};
DDT.round = x => Math.round(x * 1000) / 1000;
// the item is pre-selected ONLY when this supplier code was confirmed in an earlier import; otherwise the most similar name is offered as a one-tap suggestion
DDT.prep = function (l, M, area) { // new items: kitchen items live where the note says (freezer / fridge / shelf); Sala items go to Bevande or Magazzino
  const m = M.map[l.code], o = { ...l, skip: l.qty === 0, itemId: '', factor: DDT.factor(l), stock: 0, newName: DDT.title(l.desc), newUnit: DDT.unitName(l) };
  if (area === 'SALA') o.storage = l.group === 'BEVE' ? 'Bevande' : 'Magazzino';
  if (m && M.items.some(i => i.id === m.itemId)) { o.itemId = m.itemId; o.factor = m.factor; }
  else if (!m) { const g = DDT.guess(l.desc, M.items); if (g) o.sugg = g; } // only a SUGGESTION: a wrong automatic match would put stock on the wrong item
  o.stock = DDT.round(o.qty * o.factor); return o;
};
DDT.title = d => d.toLowerCase().replace(/\b([a-zà-ú])/g, c => c.toUpperCase());
DDT.unitName = l => l.uom === 'KG' ? 'kg' : l.uom === 'L' ? 'litri' : 'pz';
DDT.norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/(\d),(\d)/g, '$1.$2').replace(/[^a-z0-9.\s]/g, ' ');
DDT.guess = function (desc, items) { // simple word overlap; only suggests when clearly similar (the manager still confirms)
  const w = s => DDT.norm(s).split(/\s+/).filter(t => t.length > 2 && !/^\d/.test(t)), a = w(desc); if (!a.length) return '';
  let best = '', bs = 0; items.forEach(it => { const b = w(it.name), c = a.filter(t => b.some(u => u === t || (t.length > 4 && u.length > 4 && (u.startsWith(t.slice(0, 5)) || t.startsWith(u.slice(0, 5)))))).length, sc = 2 * c / (a.length + b.length); if (sc > bs) { bs = sc; best = it.id; } });
  return bs >= .4 ? best : '';
};
if (typeof module !== 'undefined') module.exports = DDT;
