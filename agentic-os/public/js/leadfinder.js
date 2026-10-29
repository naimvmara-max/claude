// "Hitta företag": search the Norwegian business register by industry, municipality and size,
// look at each company's website for an existing chat, and add the good ones to the pipeline.
// No model, no cost. Enkeltpersonforetak are never listed (they are not cold-emailed), and only
// generic company mailboxes (post@, kontakt@ …) are kept.

/** Industries with a real customer service load, as SN2007 codes in Enhetsregisteret. */
export const INDUSTRIES = [
  ['47.910', 'Nettbutikk'],
  ['55.101,55.102', 'Hotell'],
  ['86.230', 'Tannlege'],
  ['86.211', 'Legesenter'],
  ['86.902', 'Fysioterapi'],
  ['93.130', 'Treningssenter'],
  ['47.782', 'Optiker'],
  ['45.201', 'Bilverksted'],
  ['68.310', 'Eiendomsmegling'],
  ['79.110', 'Reisebyrå'],
  ['43.221', 'Rørlegger'],
  ['43.210', 'Elektriker'],
  ['69.201', 'Regnskap'],
];

/** Municipality numbers after the 2024 county change. Results show the town, so a wrong one is visible. */
export const MUNICIPALITIES = [
  ['', 'Hela Norge'], ['0301', 'Oslo'], ['4601', 'Bergen'], ['5001', 'Trondheim'], ['1103', 'Stavanger'],
  ['4204', 'Kristiansand'], ['5501', 'Tromsø'], ['1804', 'Bodø'], ['3301', 'Drammen'],
];

// The preview has no register behind it: made-up companies that show what a search returns.
const DEMO_RESULTS = [
  { orgnr: '900000001', name: 'Fjordkyst Nettbutikk AS', industry: 'Detaljhandel via Internett', employees: 14, website: 'fjordkyst.example', email: 'post@fjordkyst.example', phone: '55 00 00 01', city: 'Bergen' },
  { orgnr: '900000002', name: 'Vågen Sport AS', industry: 'Detaljhandel via Internett', employees: 32, website: 'vagensport.example', email: 'kundeservice@vagensport.example', phone: '55 00 00 02', city: 'Bergen' },
  { orgnr: '900000003', name: 'Bryggeloftet Interiør AS', industry: 'Detaljhandel via Internett', employees: 8, website: 'bryggeloftet.example', email: '', phone: '55 00 00 03', city: 'Bergen', namedEmailDropped: true },
  { orgnr: '900000004', name: 'Nordnes Kaffe AS', industry: 'Detaljhandel via Internett', employees: 6, website: 'nordneskaffe.example', email: 'hei@nordneskaffe.example', phone: '', city: 'Bergen' },
];
const DEMO_CHECKS = {
  'fjordkyst.example': { hasChat: false, chat: [], observation: 'Ingen chatt på webbplatsen, bara kontaktformulär, mejl till post@fjordkyst.example.' },
  'vagensport.example': { hasChat: true, chat: ['Tidio'], observation: 'Har redan chatt (Tidio): fråga vad den klarar och vad som händer efter stängning.' },
  'bryggeloftet.example': { hasChat: false, chat: [], observation: 'Ingen chatt på webbplatsen.' },
  'nordneskaffe.example': { hasChat: false, chat: [], observation: 'Ingen chatt på webbplatsen, mejl till hei@nordneskaffe.example.' },
};

/**
 * @param {object} d  $, $$, esc, store, api, toast, isDemo, getState, addLeads(list) -> Promise<number>
 */
export function createLeadFinder(d) {
  const { esc } = d;
  const el = document.createElement('details');
  el.className = 'glass lead-finder';
  el.id = 'lead-finder';
  let q = { industry: '47.910', municipality: '4601', min: 3, max: 200, name: '', ...d.store.get('finder', {}) };
  let found = null;
  let checks = {};
  let selected = new Set();
  let busy = false;

  el.innerHTML = `
    <summary><span class="label">Hitta företag · Brønnøysundregistret</span><span class="muted">bransch, kommun och storlek · aldrig enskilda firmor · gratis, ingen AI</span></summary>
    <form class="lf-form" autocomplete="off">
      <label>Bransch<select name="industry">${INDUSTRIES.map(([v, l]) => `<option value="${v}">${l} (${v})</option>`).join('')}<option value="">Annan kod / bara namn</option></select></label>
      <label>Egen kod<input name="code" placeholder="t.ex. 47.910" inputmode="decimal"></label>
      <label>Kommun<select name="municipality">${MUNICIPALITIES.map(([v, l]) => `<option value="${v}">${l}${v ? ` (${v})` : ''}</option>`).join('')}</select></label>
      <label>Anställda från<input name="min" type="number" min="0" step="1"></label>
      <label>till<input name="max" type="number" min="0" step="1"></label>
      <label>Ord i namnet<input name="name" placeholder="t.ex. tann, sykkel"></label>
      <button class="dock-btn" type="submit">Sök</button>
    </form>
    <div class="lf-results" aria-live="polite"></div>`;

  const form = el.querySelector('form');
  form.industry.value = INDUSTRIES.some(([v]) => v === q.industry) ? q.industry : '';
  form.code.value = INDUSTRIES.some(([v]) => v === q.industry) ? '' : q.industry || '';
  form.municipality.value = q.municipality;
  form.min.value = q.min || '';
  form.max.value = q.max || '';
  form.name.value = q.name || '';
  el.open = Boolean(d.store.get('finderOpen', false));
  el.addEventListener('toggle', () => d.store.set('finderOpen', el.open));
  form.addEventListener('submit', (e) => { e.preventDefault(); search(0); });

  async function search(page) {
    if (busy) return;
    q = {
      industry: form.code.value.trim() || form.industry.value,
      municipality: form.municipality.value,
      min: form.min.value, max: form.max.value, name: form.name.value.trim(), page,
    };
    d.store.set('finder', { ...q, page: 0 });
    busy = true;
    render('Söker i Brønnøysundregistret …');
    try {
      if (d.isDemo()) {
        found = { results: DEMO_RESULTS, total: DEMO_RESULTS.length, page: 0, pages: 1, skipped: { enk: 2, closed: 1, existing: 0, namedEmail: 1 }, demo: true };
      } else {
        const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== '' && v != null));
        found = await d.api(`/api/brreg?${p}`);
      }
      selected = new Set(found.results.map((r) => r.orgnr));
      checks = {};
      render();
    } catch (err) {
      found = null;
      render(err.message);
    } finally {
      busy = false;
    }
  }

  async function check(orgnr) {
    const r = found?.results.find((x) => x.orgnr === orgnr);
    if (!r?.website) return;
    checks[orgnr] = { pending: true };
    render();
    try {
      checks[orgnr] = d.isDemo() ? DEMO_CHECKS[r.website] || { hasChat: false, chat: [], observation: 'Ingen chatt på webbplatsen.' } : await d.api('/api/sitecheck', { url: r.website });
      // A generic mailbox found on the site is as good as one in the register.
      if (!r.email && checks[orgnr].generic?.length) r.email = checks[orgnr].generic[0];
    } catch (err) {
      checks[orgnr] = { error: err.message };
    }
    render();
  }

  async function checkAll() {
    for (const r of (found?.results || []).filter((x) => selected.has(x.orgnr) && x.website && !checks[x.orgnr])) {
      // One site at a time: polite to the companies, and the list fills in as it goes.
      await check(r.orgnr);
    }
  }

  async function addSelected() {
    const rows = (found?.results || []).filter((r) => selected.has(r.orgnr));
    if (!rows.length) { d.toast('Välj minst ett företag.'); return; }
    const leads = rows.map((r) => {
      const c = checks[r.orgnr];
      return {
        company: r.name,
        website: r.website,
        industry: (INDUSTRIES.find(([v]) => v === q.industry)?.[1] || r.industry || '').toLowerCase(),
        city: r.city,
        email: r.email,
        phone: r.phone,
        channel: r.email ? 'email' : 'phone',
        notes: [c?.observation, `org.nr ${r.orgnr}`, r.employees != null ? `${r.employees} anställda` : ''].filter(Boolean).join(' · '),
      };
    });
    const added = await d.addLeads(leads);
    if (added) {
      d.toast(`${added} företag tillagda i pipelinen.`);
      const done = new Set(rows.map((r) => r.orgnr));
      found.results = found.results.filter((r) => !done.has(r.orgnr));
      selected = new Set();
      render();
    }
  }

  function chatCell(r) {
    const c = checks[r.orgnr];
    if (!r.website) return '<span class="muted">ingen webb</span>';
    if (!c) return `<button class="row-live" data-check="${esc(r.orgnr)}">Kolla</button>`;
    if (c.pending) return '<span class="muted">kollar …</span>';
    if (c.error) return `<span class="muted" title="${esc(c.error)}">gick inte</span>`;
    return c.hasChat ? `<span class="chip" title="${esc(c.observation)}">har ${esc(c.chat.join(', '))}</span>` : `<span class="chip lf-good" title="${esc(c.observation)}">ingen chatt</span>`;
  }

  function render(message = '') {
    const box = el.querySelector('.lf-results');
    if (message || !found) { box.innerHTML = message ? `<p class="muted">${esc(message)}</p>` : ''; return; }
    const s = found.skipped || {};
    const notes = [
      s.enk ? `${s.enk} enskild${s.enk === 1 ? ' firma' : 'a firmor'} bortsorterade` : '',
      s.closed ? `${s.closed} i konkurs eller avveckling` : '',
      s.existing ? `${s.existing} finns redan i pipelinen` : '',
      s.namedEmail ? `${s.namedEmail} med bara en personlig e-postadress: ring dem` : '',
    ].filter(Boolean).join(' · ');
    box.innerHTML = found.results.length ? `
      <div class="lf-head"><span class="label">${found.results.length} av ${found.total} träffar${found.demo ? ' · exempel' : ''}</span>${notes ? `<span class="muted">${esc(notes)}</span>` : ''}</div>
      <div class="table-wrap"><table class="leads lf-table">
        <thead><tr><th><input type="checkbox" data-all aria-label="Välj alla" ${selected.size === found.results.length ? 'checked' : ''}></th><th>Företag</th><th>Ort</th><th>Anst.</th><th>Allmän e-post</th><th>Telefon</th><th>Chatt</th></tr></thead>
        <tbody>${found.results.map((r) => `<tr>
          <td><input type="checkbox" data-pick="${esc(r.orgnr)}" aria-label="Välj ${esc(r.name)}" ${selected.has(r.orgnr) ? 'checked' : ''}></td>
          <td><b>${esc(r.name)}</b><br><span class="muted">${esc(r.industry)} · ${esc(r.orgnr)}</span>${r.website ? `<br><a href="https://${esc(r.website)}" target="_blank" rel="noopener">${esc(r.website)}</a>` : ''}</td>
          <td>${esc(r.city)}</td>
          <td class="num-cell">${r.employees ?? '—'}</td>
          <td>${r.email ? esc(r.email) : '<span class="muted">ring</span>'}</td>
          <td>${esc(r.phone || '—')}</td>
          <td>${chatCell(r)}</td>
        </tr>`).join('')}</tbody></table></div>
      <div class="lf-actions">
        <button class="ghost-btn" data-checkall>Kolla webbplatserna för valda</button>
        <button class="dock-btn" data-add>Lägg till valda (${selected.size}) i pipelinen</button>
        ${found.page + 1 < found.pages ? '<button class="ghost-btn" data-next>Nästa sida</button>' : ''}
      </div>
      <p class="muted">Bara allmänna adresser (post@, kontakt@ …) sparas: kalla mejl till en namngiven person kräver samtycke i Norge. Ingen e-post = ring.</p>`
      : `<p class="muted">Inga träffar${notes ? ` (${esc(notes)})` : ''}. Branschkoderna kan ha bytts (SN2025): sök företaget på brreg.no, se koden och skriv in den under "Egen kod", eller sök på ett ord i namnet.</p>`;
    box.querySelectorAll('[data-check]').forEach((b) => b.addEventListener('click', () => check(b.dataset.check)));
    box.querySelectorAll('[data-pick]').forEach((c) => c.addEventListener('change', () => { if (c.checked) selected.add(c.dataset.pick); else selected.delete(c.dataset.pick); render(); }));
    box.querySelector('[data-all]')?.addEventListener('change', (e) => { selected = e.target.checked ? new Set(found.results.map((r) => r.orgnr)) : new Set(); render(); });
    box.querySelector('[data-checkall]')?.addEventListener('click', checkAll);
    box.querySelector('[data-add]')?.addEventListener('click', addSelected);
    box.querySelector('[data-next]')?.addEventListener('click', () => search(found.page + 1));
  }

  return { node: el };
}
