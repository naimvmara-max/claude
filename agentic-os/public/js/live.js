// The Live view: one screen for a call or a demo. Pick the company, take notes, ask Driv's
// six questions, count credits, answer objections and explain the product from cards, then
// save: the note goes to samtal/ in the vault, the pipeline row moves, and /call-summary can
// write the follow-up email. Nothing here shows commission, so it is safe to share the screen.

import { parseCards, searchCards, matchObjections } from './cards.js';
import { meetingIcs, downloadIcs } from './ics.js';
import { creditPlan, packageOf, privacyMode, STAGE_LABELS, PACKAGES, isoLocal } from './pipeline.js';

const CALL_TYPES = { phone: 'Kallt samtal', followup: 'Uppföljning', demo: 'Demo' };

const OUTCOMES = {
  none: { label: 'Bara anteckning', date: 'Nästa datum', action: '' },
  callback: { label: 'Ring tillbaka', date: 'Ring tillbaka den', action: 'Ring igen' },
  meeting: { label: 'Möte bokat', date: 'Mötesdatum', action: 'Demomöte' },
  demo: { label: 'Demo hållen', date: 'Skicka offerten senast', action: 'Skicka offert' },
  offer: { label: 'Offert skickad', date: 'Följ upp den', action: 'Följ upp offerten' },
  won: { label: 'Vunnen', date: '', action: '' },
  lost: { label: 'Inte intresserad', date: '', action: '' },
};

const LOST_REASONS = ['pris', 'inte nu', 'har redan en lösning', 'inget behov', 'fel person', 'annat'];

const NUMBER_FIELDS = [
  ['agent', 'Personer som svarar kunder'],
  ['queue', 'Köer eller team'],
  ['webchat', 'Webbplatser med chatt'],
  ['ai_agent', 'AI-agenter (en per kanal)'],
  ['email_channel', 'E-postinkorgar'],
];

const TABS = [
  ['objections', 'Invändningar'],
  ['produkt', 'Produkt'],
  ['fråga', 'Kundfrågor'],
  ['fras', 'Fraser'],
];
// Kundläge hides what the customer should not see on a shared screen: the objection playbook
// and the phrase cards.
const SHARE_HIDDEN = ['objections', 'fras'];

const blankDraft = () => ({
  lead: '', company: '', type: 'phone', notes: '', answers: {}, numbers: {}, perDay: '', systems: '',
  heard: [], startedAt: null, elapsed: 0, running: false, transcript: '', consent: false,
  outcome: 'none', nextDate: '', meetingTime: '', nextAction: '', lostReason: '', pkg: '', summarize: true,
});

/**
 * @param {object} d  what the Live view needs from the HUD:
 *   $, $$, esc, store, api, toast, getState, isDemo, saveLead, addLead, loadText, openFile,
 *   Recognition, listenLang, voiceBlockedReason, demoJob
 */
export function createLive(d) {
  const { $, $$, esc } = d;
  let draft = { ...blankDraft(), ...d.store.get('live', {}) };
  let built = false;
  let ready = null;
  let cards = [];
  let objections = [];
  let tab = 'objections';
  let query = '';
  let tick = null;
  let saveTimer = null;
  let rec = null;
  let prevCalls = [];

  const persist = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => d.store.set('live', draft), 250); };
  const leads = () => d.getState()?.leads || [];
  const lead = () => leads().find((r) => r.id === draft.lead) || null;
  const business = () => d.getState()?.business || {};

  // ---------------------------------------------------------------- timer

  const elapsed = () => draft.elapsed + (draft.running && draft.startedAt ? Date.now() - draft.startedAt : 0);
  function clockText() {
    const s = Math.floor(elapsed() / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  function startTimer() {
    if (draft.running) return;
    draft.running = true;
    draft.startedAt = Date.now();
    persist();
    renderTimer();
  }
  function pauseTimer() {
    if (!draft.running) return;
    draft.elapsed = elapsed();
    draft.running = false;
    draft.startedAt = null;
    persist();
    renderTimer();
  }
  function renderTimer() {
    const t = $('#lv-time');
    if (!t) return;
    t.textContent = clockText();
    $('#lv-start').textContent = draft.running ? 'Pausa' : elapsed() ? 'Fortsätt' : 'Starta';
    $('#lv-time').classList.toggle('on', draft.running);
  }

  // ---------------------------------------------------------------- build once

  function build() {
    $('#view-live').innerHTML = `
      <div class="live">
        <div class="glass live-bar">
          <label class="lv-pick"><span class="label">Företag</span>
            <input id="lv-company" list="lv-companies" autocomplete="off" placeholder="Sök i pipelinen eller skriv ett nytt företag">
          </label>
          <datalist id="lv-companies"></datalist>
          <div class="seg" role="group" aria-label="Typ av samtal">${Object.entries(CALL_TYPES).map(([k, v]) => `<button data-type="${k}">${v}</button>`).join('')}</div>
          <div class="lv-timer"><b id="lv-time">00:00</b><button class="ghost-btn" id="lv-start">Starta</button></div>
          <label class="check lv-share" title="Döljer tips, anteckningar och interna uppgifter så att du kan dela skärmen med kunden"><input type="checkbox" id="lv-share"> Kundläge</label>
          <button class="ghost-btn" id="lv-new">Nytt samtal</button>
          <button class="dock-btn" id="lv-save">Spara samtalet</button>
        </div>
        <div class="live-grid">
          <section class="lv-col">
            <div class="glass lv-card internal" id="lv-company-card"></div>
            <div class="glass lv-card internal">
              <span class="label">Drivs sex frågor · behovsavklaring</span>
              <div class="lv-questions" id="lv-questions"></div>
            </div>
            <div class="glass lv-card">
              <span class="label">Räkna krediter · steg 3 "Velg pakke"</span>
              <div class="lv-numbers">${NUMBER_FIELDS.map(([k, label]) => `<label><span>${label}</span><input type="number" min="0" step="1" data-num="${k}"></label>`).join('')}</div>
              <div class="lv-plan" id="lv-plan" aria-live="polite"></div>
              <div class="lv-extra internal">
                <label><span>Kundfrågor per dag</span><input type="number" min="0" step="1" id="lv-perday"></label>
                <label><span>System de använder</span><input id="lv-systems" placeholder="HubSpot, Outlook …"></label>
              </div>
            </div>
          </section>
          <section class="lv-col lv-mid internal">
            <div class="glass lv-card lv-listen internal">
              <div class="lv-notes-head"><span class="label">Lyssna på samtalet · transkript och förslag</span><button class="ghost-btn" id="lv-listen" title="Transkriberar ljudet från datorns ljudingång (Chrome eller Edge)">Lyssna</button></div>
              <label class="check"><input type="checkbox" id="lv-consent"> Kunden har sagt ja till AI-transkribering («Før vi starter …» under Fraser)</label>
              <div class="lv-suggest" id="lv-suggest" aria-live="polite"></div>
              <div class="lv-transcript" id="lv-transcript"></div>
            </div>
            <div class="glass lv-card internal">
              <div class="lv-notes-head"><label class="label" for="lv-notes">Anteckningar</label><button class="ghost-btn" id="lv-dictate" title="Skriv med rösten (Chrome eller Edge)">Diktera</button></div>
              <textarea id="lv-notes" placeholder="${privacyMode(business()) === 'full' ? 'Skriv medan ni pratar: vad de säger, siffror, namn, vem som bestämmer …  Ctrl+S sparar.' : 'Skriv medan ni pratar: vad de säger, siffror, vem som bestämmer. GDPR-läge: skriv roll, inte namn (t.ex. «daglig leder»).  Ctrl+S sparar.'}"></textarea>
              <div class="lv-heard" id="lv-heard"></div>
            </div>
            <div class="glass lv-card internal">
              <span class="label">Resultat och nästa steg</span>
              <div class="seg wrap" role="group" aria-label="Resultat">${Object.entries(OUTCOMES).map(([k, v]) => `<button data-outcome="${k}">${v.label}</button>`).join('')}</div>
              <div class="lv-next" id="lv-next"></div>
              <label class="check"><input type="checkbox" id="lv-summarize"> Låt Jarvis sammanfatta och skriva uppföljningsmejlet (/call-summary)</label>
            </div>
          </section>
          <section class="lv-col lv-right">
            <div class="glass lv-card lv-cardpanel">
              <input id="lv-search" placeholder="Sök: pris, outlook, gdpr, app …  ( / )" autocomplete="off">
              <div class="tabs" role="tablist" aria-label="Kort" id="lv-tabs"></div>
              <div class="lv-cards" id="lv-cards"></div>
            </div>
          </section>
        </div>
      </div>`;
    bind();
    built = true;
  }

  function bind() {
    $('#lv-company').addEventListener('change', (e) => pickCompany(e.target.value));
    $('#lv-company').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pickCompany(e.target.value); } });
    $$('#view-live [data-type]').forEach((b) => b.addEventListener('click', () => { draft.type = b.dataset.type; persist(); renderBar(); }));
    $('#lv-start').addEventListener('click', () => (draft.running ? pauseTimer() : startTimer()));
    $('#lv-share').addEventListener('change', (e) => { document.body.classList.toggle('share-safe', e.target.checked); renderCards(); });
    $('#lv-new').addEventListener('click', () => {
      if (draft.notes.trim() && !confirm('Börja ett nytt samtal? Det osparade försvinner.')) return;
      reset();
    });
    $('#lv-save').addEventListener('click', save);
    $('#lv-notes').addEventListener('input', (e) => { draft.notes = e.target.value; if (!draft.running && !draft.elapsed) startTimer(); persist(); });
    $('#lv-dictate').addEventListener('click', dictate);
    $('#lv-listen').addEventListener('click', listen);
    $('#lv-consent').addEventListener('change', (e) => { draft.consent = e.target.checked; persist(); });
    $$('#view-live [data-num]').forEach((el) => el.addEventListener('input', () => { draft.numbers[el.dataset.num] = el.value; persist(); renderPlan(); }));
    $('#lv-perday').addEventListener('input', (e) => { draft.perDay = e.target.value; persist(); });
    $('#lv-systems').addEventListener('input', (e) => { draft.systems = e.target.value; persist(); });
    $$('#view-live [data-outcome]').forEach((b) => b.addEventListener('click', () => { draft.outcome = b.dataset.outcome; persist(); renderOutcome(); }));
    $('#lv-summarize').addEventListener('change', (e) => { draft.summarize = e.target.checked; persist(); });
    $('#lv-search').addEventListener('input', (e) => { query = e.target.value; renderCards(); });
    $('#lv-search').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; query = ''; renderCards(); } });
  }

  // ---------------------------------------------------------------- company

  function pickCompany(value) {
    const name = String(value || '').split(' · ')[0].trim();
    if (!name) return;
    const match = leads().find((r) => r.company.toLowerCase() === name.toLowerCase())
      || leads().find((r) => r.company.toLowerCase().startsWith(name.toLowerCase()));
    draft.company = match ? match.company : name;
    draft.lead = match ? match.id : '';
    $('#lv-company').value = draft.company;
    persist();
    renderCompany();
  }

  /** Open the Live view on one company, from the pipeline or the follow-up list. */
  function openCompany(id) {
    const r = leads().find((x) => x.id === id);
    if (!r) return;
    if (draft.lead !== id && draft.notes.trim() && !confirm(`Byta till ${r.company}? Anteckningarna för ${draft.company || 'samtalet'} finns kvar tills du sparar eller börjar om.`)) return;
    if (draft.lead !== id) draft = { ...blankDraft(), summarize: draft.summarize };
    draft.lead = r.id;
    draft.company = r.company;
    if (r.status === 'booked') draft.type = 'demo';
    else if (r.contacted) draft.type = 'followup';
    persist();
    if (built) fill();
  }

  async function renderCompany() {
    const el = $('#lv-company-card');
    if (!el) return;
    const r = lead();
    if (!draft.company) {
      el.innerHTML = '<span class="label">Företaget</span><p class="empty">Välj ett företag ovan, eller öppna ett från Pipeline eller Uppföljningar med knappen Live.</p>';
      return;
    }
    if (!r) {
      el.innerHTML = `<span class="label">Företaget</span><p class="empty"><b>${esc(draft.company)}</b> finns inte i pipelinen. Det läggs till när du sparar samtalet.</p>`;
      return;
    }
    const site = r.website ? `<a href="${esc(/^https?:/.test(r.website) ? r.website : `https://${r.website}`)}" target="_blank" rel="noopener">${esc(r.website.replace(/^https?:\/\//, ''))}</a>` : '';
    el.innerHTML = `
      <span class="label">Företaget · ${esc(r.id)}</span>
      <h3 class="lv-co">${esc(r.company)}</h3>
      <p class="muted">${esc([r.industry, r.city].filter(Boolean).join(' · '))}${site ? ` · ${site}` : ''}</p>
      <dl class="lv-facts">
        <dt class="private">Kontakt</dt><dd class="private">${esc(r.contact || '—')}</dd>
        <dt>Telefon</dt><dd>${r.phone ? `<a href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">${esc(r.phone)}</a>` : '—'}</dd>
        <dt class="private">E-post</dt><dd class="private">${esc(r.email || '—')}</dd>
        <dt>Status</dt><dd>${esc(STAGE_LABELS[r.status] || r.status)}${packageOf(r) ? ` · ${esc(business().packages?.[packageOf(r)]?.name || packageOf(r))}` : ''}</dd>
        <dt>Nästa</dt><dd>${esc(r.next_action || '—')}${r.next_date ? ` · ${esc(r.next_date)}` : ''}</dd>
      </dl>
      ${r.notes ? `<p class="lv-obs">${esc(r.notes)}</p>` : ''}
      <div class="lv-prev" id="lv-prev"></div>`;
    await loadPrevious(r.company);
  }

  async function loadPrevious(company) {
    const box = $('#lv-prev');
    if (!box) return;
    if (d.isDemo()) { box.innerHTML = '<span class="label">Tidigare samtal</span><p class="empty">I riktiga Jarvis listas tidigare anteckningar för företaget här.</p>'; return; }
    try {
      prevCalls = (await d.api(`/api/calls?company=${encodeURIComponent(company)}`)).calls || [];
    } catch { prevCalls = []; }
    box.innerHTML = `<span class="label">Tidigare samtal</span>${prevCalls.length
      ? prevCalls.map((c) => `<button class="doc-link" data-path="${esc(c.path)}"><span>${esc(c.date)}</span><small>öppna</small></button>`).join('')
      : '<p class="empty">Inga sparade samtal än.</p>'}`;
    $$('#lv-prev .doc-link').forEach((b) => b.addEventListener('click', () => d.openFile(b.dataset.path)));
  }

  // ---------------------------------------------------------------- questions, numbers, plan

  function renderQuestions() {
    const qs = cards.filter((c) => (c.fields.typ || '') === 'behov');
    $('#lv-questions').innerHTML = qs.length
      ? qs.map((q, i) => `<label class="lv-q"><span>${esc(q.title)}</span><small>Lyssna efter: ${esc(q.fields['lyssna efter'] || '')}</small><input data-q="${i}" value="${esc(draft.answers[q.title] || '')}" placeholder="Deras svar"></label>`).join('')
      : '<p class="empty">Inga frågor hittades i wiki/product-cards.md.</p>';
    $$('#lv-questions [data-q]').forEach((el) => el.addEventListener('input', () => {
      draft.answers[qs[Number(el.dataset.q)].title] = el.value;
      persist();
    }));
  }

  function needFromDraft() {
    return Object.fromEntries(NUMBER_FIELDS.map(([k]) => [k, Math.max(0, Number(draft.numbers[k]) || 0)]));
  }

  function renderPlan() {
    const plan = creditPlan(needFromDraft(), business());
    const el = $('#lv-plan');
    if (!plan.credits) { el.innerHTML = '<p class="empty">Fyll i det kunden berättar så räknar Jarvis fram paketet. Chatt-widgeten kostar 0 krediter.</p>'; return; }
    const p = plan.pick;
    const alt = plan.options.find((o) => o.key !== p.key && o.extraCredits > 0 && o.extraCredits <= 3 && o.monthly < p.monthly);
    el.innerHTML = `<div class="lv-pkg"><b>${esc(p.name)}${p.extraCredits ? ` + ${p.extraCredits}` : ''}</b><span>${plan.credits} krediter · ${p.monthly.toLocaleString('sv-SE')} kr/mån exkl. moms</span></div>
      ${alt ? `<p class="muted">Alternativ: ${esc(alt.name)} + ${alt.extraCredits} extra kredit${alt.extraCredits === 1 ? '' : 'er'} = ${alt.monthly.toLocaleString('sv-SE')} kr/mån, om extra krediter kostar ${plan.extraPrice} kr/mån (fråga Driv).</p>` : ''}
      <button class="ghost-btn internal" id="lv-usepkg">Använd ${esc(p.name)} i resultatet</button>`;
    $('#lv-usepkg').addEventListener('click', () => { draft.pkg = p.key; persist(); renderOutcome(); d.toast(`${p.name} vald som paket.`); });
  }

  // ---------------------------------------------------------------- outcome

  function renderOutcome() {
    $$('#view-live [data-outcome]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.outcome === draft.outcome)));
    const o = OUTCOMES[draft.outcome];
    const pk = business().packages || {};
    const pkgSelect = ['meeting', 'demo', 'offer', 'won'].includes(draft.outcome)
      ? `<label><span>Paket</span><select id="lv-pkg"><option value="">vet inte än</option>${PACKAGES.map((k) => `<option value="${k}"${draft.pkg === k ? ' selected' : ''}>${esc(pk[k]?.name || k)}</option>`).join('')}</select></label>` : '';
    const dateField = o.date ? `<label><span>${o.date}</span><input type="date" id="lv-date" value="${esc(draft.nextDate)}"></label>` : '';
    const timeField = draft.outcome === 'meeting' ? `<label><span>Tid</span><input type="time" id="lv-mtime" step="900" value="${esc(draft.meetingTime)}"></label>` : '';
    const actionField = draft.outcome !== 'won' && draft.outcome !== 'lost'
      ? `<label class="grow"><span>Nästa steg</span><input id="lv-action" value="${esc(draft.nextAction)}" placeholder="${esc(o.action || 'Vad händer härnäst?')}"></label>` : '';
    const lost = draft.outcome === 'lost'
      ? `<label><span>Varför</span><select id="lv-lost"><option value="">välj</option>${LOST_REASONS.map((x) => `<option${draft.lostReason === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>` : '';
    const won = draft.outcome === 'won' ? '<p class="muted grow">Grattis. Kom ihåg: offerten görs i Drivs CRM och skickas för e-signering. Provisionen tjänas in när tjänsten aktiverats och kommer med lönen den 25:e månaden efter: skriv in datumet under Kommando → Pengar.</p>' : '';
    $('#lv-next').innerHTML = `${dateField}${timeField}${actionField}${pkgSelect}${lost}${won}`;
    $('#lv-mtime')?.addEventListener('input', (e) => { draft.meetingTime = e.target.value; persist(); });
    $('#lv-date')?.addEventListener('input', (e) => { draft.nextDate = e.target.value; persist(); });
    $('#lv-action')?.addEventListener('input', (e) => { draft.nextAction = e.target.value; persist(); });
    $('#lv-pkg')?.addEventListener('change', (e) => { draft.pkg = e.target.value; persist(); });
    $('#lv-lost')?.addEventListener('change', (e) => { draft.lostReason = e.target.value; persist(); });
    $('#lv-summarize').checked = Boolean(draft.summarize);
  }

  // ---------------------------------------------------------------- cards

  function cardHtml(c, kind) {
    const f = c.fields;
    if (kind === 'objection') {
      const heard = draft.heard.includes(c.title);
      return `<article class="lv-cardx obj">
        <h4>${esc(c.title)}</h4>
        <p class="lv-say">${esc(f.svar || '')}</p>
        ${f['följdfråga'] ? `<p class="lv-follow"><span class="label">Följdfråga</span>${esc(f['följdfråga'])}</p>` : ''}
        ${f.tips ? `<p class="lv-tip internal">${esc(f.tips)}</p>` : ''}
        <div class="lv-row"><span class="chip">${esc(f.kategori || '')}</span><span class="chip internal">${esc(f['källa'] || '')}</span>
          <button class="ghost-btn internal" data-heard="${esc(c.title)}" aria-pressed="${heard}">${heard ? 'Noterad ✓' : 'Hörde den'}</button></div>
      </article>`;
    }
    return `<article class="lv-cardx">
      <h4>${esc(c.title)}</h4>
      ${f['säg'] ? `<p class="lv-say">${esc(f['säg'])}</p>` : ''}
      ${f.vad ? `<p class="lv-what">${esc(f.vad)}</p>` : ''}
      ${f.nytta ? `<p class="lv-what"><span class="label">Nytte</span>${esc(f.nytta)}</p>` : ''}
      ${f['lyssna efter'] ? `<p class="lv-what"><span class="label">Lyssna efter</span>${esc(f['lyssna efter'])}</p>` : ''}
      ${f.tips ? `<p class="lv-tip internal">${esc(f.tips)}</p>` : ''}
      ${f['fråga driv'] ? `<p class="lv-ask internal">Fråga Driv: ${esc(f['fråga driv'])}</p>` : ''}
    </article>`;
  }

  function groups() {
    return {
      objections: objections.map((c) => ({ c, kind: 'objection' })),
      produkt: cards.filter((c) => c.fields.typ === 'produkt').map((c) => ({ c, kind: 'card' })),
      'fråga': cards.filter((c) => c.fields.typ === 'fråga').map((c) => ({ c, kind: 'card' })),
      fras: cards.filter((c) => ['fras', 'ord', 'behov'].includes(c.fields.typ)).map((c) => ({ c, kind: 'card' })),
    };
  }

  function renderCards() {
    const g = groups();
    const searching = query.trim().length > 0;
    const shared = document.body.classList.contains('share-safe');
    const tabs = TABS.filter(([k]) => !shared || !SHARE_HIDDEN.includes(k));
    const current = tabs.some(([k]) => k === tab) ? tab : 'produkt';
    $('#lv-tabs').innerHTML = tabs.map(([k, label]) => `<button role="tab" data-lvtab="${k}" aria-selected="${!searching && k === current}">${label} ${g[k].length}</button>`).join('');
    $$('#lv-tabs [data-lvtab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.lvtab; query = ''; $('#lv-search').value = ''; renderCards(); }));
    let list = g[current];
    if (searching) {
      const all = tabs.flatMap(([k]) => g[k]);
      const hits = new Set(searchCards(all.map((x) => x.c), query));
      list = all.filter((x) => hits.has(x.c));
    }
    $('#lv-cards').innerHTML = list.length
      ? list.map((x) => cardHtml(x.c, x.kind)).join('')
      : `<p class="empty">${searching ? 'Inget kort matchar. Prova ett annat ord.' : 'Inga kort här än.'}</p>`;
    $$('#lv-cards [data-heard]').forEach((b) => b.addEventListener('click', () => toggleHeard(b.dataset.heard)));
  }

  function toggleHeard(title) {
    draft.heard = draft.heard.includes(title) ? draft.heard.filter((x) => x !== title) : [...draft.heard, title];
    persist();
    renderHeard();
    renderCards();
  }

  function renderHeard() {
    $('#lv-heard').innerHTML = draft.heard.length
      ? `<span class="label">Invändningar i samtalet</span>${draft.heard.map((h) => `<button class="chip" data-unheard="${esc(h)}" title="Ta bort">${esc(h)} ×</button>`).join('')}`
      : '';
    $$('#lv-heard [data-unheard]').forEach((b) => b.addEventListener('click', () => toggleHeard(b.dataset.unheard)));
  }

  // ---------------------------------------------------------------- dictation

  // ---------------------------------------------------------------- listening

  let listener = null;
  let interim = '';

  /**
   * Transcribe the call from the computer's sound input. Chrome's speech service hears the
   * default input device, so the softphone's sound has to reach it (README: Lyssna på samtal).
   * Only with the customer's yes; the transcript stays in this call's note.
   */
  function listen() {
    if (listener) { stopListening(); return; }
    if (!draft.consent) { d.toast('Fråga kunden först («Før vi starter …» under Fraser) och kryssa i rutan.'); $('#lv-consent').focus(); return; }
    const blocked = d.voiceBlockedReason();
    if (blocked) { d.toast(`${blocked} Öppna Jarvis i Chrome eller Edge för att lyssna.`); return; }
    try { listener = new d.Recognition(); } catch { listener = null; d.toast('Röstinmatning är blockerad här.'); return; }
    listener.lang = 'nb-NO';
    listener.continuous = true;
    listener.interimResults = true;
    listener.onresult = (e) => {
      interim = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const t = e.results[i][0].transcript.trim();
        if (!t) continue;
        if (e.results[i].isFinal) {
          const now = new Date();
          draft.transcript += `${draft.transcript ? '\n' : ''}[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}] ${t}`;
          persist();
        } else interim += `${t} `;
      }
      renderTranscript();
    };
    // Chrome ends a session after a pause; keep listening until Naim stops it.
    listener.onend = () => { if (listener) { try { listener.start(); } catch { stopListening(); } } };
    listener.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { d.toast('Mikrofonen nekades. Tillåt den vid adressfältet.'); stopListening(); }
      else if (!['no-speech', 'aborted'].includes(e.error)) d.toast(`Lyssna: ${e.error}`);
    };
    listener.start();
    if (!draft.running) startTimer();
    $('#lv-listen').textContent = 'Sluta lyssna';
    $('#lv-listen').classList.add('on');
    renderTranscript();
  }

  function stopListening() {
    const l = listener;
    listener = null;
    interim = '';
    try { l?.stop(); } catch { /* already stopped */ }
    $('#lv-listen').textContent = 'Lyssna';
    $('#lv-listen').classList.remove('on');
    renderTranscript();
  }

  function renderTranscript() {
    const box = $('#lv-transcript');
    if (!box) return;
    const lines = draft.transcript.split('\n').filter(Boolean);
    box.innerHTML = lines.length || interim
      ? `${lines.slice(-8).map((l) => `<p>${esc(l)}</p>`).join('')}${interim ? `<p class="muted">${esc(interim)}</p>` : ''}`
      : `<p class="muted">${listener ? 'Lyssnar …' : 'Tryck Lyssna när kunden sagt ja. Softphonens ljud måste nå datorns ljudingång (README: Lyssna på samtal).'}</p>`;
    box.scrollTop = box.scrollHeight;
    // The last few lines decide which answer to show.
    const recent = `${lines.slice(-6).join(' ')} ${interim}`;
    const hits = matchObjections(objections, recent).slice(0, 2);
    $('#lv-suggest').innerHTML = hits.map((c) => `<div class="lv-sug"><span class="label">Kunden: ${esc(c.title)}</span><p class="lv-say">${esc(c.fields.svar || '')}</p>${c.fields['följdfråga'] ? `<small>Följdfråga: ${esc(c.fields['följdfråga'])}</small>` : ''}</div>`).join('');
    let added = false;
    for (const c of hits) if (!draft.heard.includes(c.title)) { draft.heard.push(c.title); added = true; }
    if (added) { persist(); renderHeard(); }
  }

  function dictate() {
    const blocked = d.voiceBlockedReason();
    if (blocked) { d.toast(`${blocked} Öppna Jarvis i Chrome eller Edge för att diktera.`); return; }
    if (rec) { rec.stop(); return; }
    try { rec = new d.Recognition(); } catch { d.toast('Röstinmatning är blockerad här.'); return; }
    rec.lang = d.listenLang();
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        if (!e.results[i].isFinal) continue;
        const ta = $('#lv-notes');
        const add = e.results[i][0].transcript.trim();
        ta.value = `${ta.value}${ta.value && !/\s$/.test(ta.value) ? ' ' : ''}${add}`;
        draft.notes = ta.value;
        persist();
      }
    };
    rec.onend = () => { rec = null; $('#lv-dictate').textContent = 'Diktera'; $('#lv-dictate').classList.remove('on'); };
    rec.onerror = (e) => { if (e.error !== 'aborted' && e.error !== 'no-speech') d.toast(`Diktering: ${e.error}`); };
    rec.start();
    $('#lv-dictate').textContent = 'Stoppa diktering';
    $('#lv-dictate').classList.add('on');
  }

  // ---------------------------------------------------------------- save

  function noteMarkdown(r) {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const qs = cards.filter((c) => c.fields.typ === 'behov');
    const plan = creditPlan(needFromDraft(), business());
    const pk = business().packages || {};
    const o = OUTCOMES[draft.outcome];
    const result = [o.label, draft.nextDate ? `${o.date.toLowerCase()} ${draft.nextDate}` : '', draft.pkg ? `paket ${pk[draft.pkg]?.name || draft.pkg}` : '', draft.lostReason ? `orsak: ${draft.lostReason}` : ''].filter(Boolean).join(' · ');
    const answered = qs.filter((q) => (draft.answers[q.title] || '').trim());
    const figures = [
      ...NUMBER_FIELDS.filter(([k]) => Number(draft.numbers[k]) > 0).map(([k, label]) => `- ${label}: ${draft.numbers[k]}`),
      draft.perDay ? `- Kundfrågor per dag: ${draft.perDay}` : '',
      draft.systems ? `- System: ${draft.systems}` : '',
      plan.credits ? `- Krediter: ${plan.credits} → ${plan.pick.name}${plan.pick.extraCredits ? ` + ${plan.pick.extraCredits} extra` : ''} (${plan.pick.monthly.toLocaleString('sv-SE')} kr/mån exkl. moms)` : '',
    ].filter(Boolean);
    return [
      `# Samtal: ${draft.company} · ${isoLocal(now)} ${hhmm}`,
      '',
      `- Företag: ${draft.company}${r ? ` (${r.id})` : ''}`,
      `- Typ: ${CALL_TYPES[draft.type]}`,
      `- Längd: ${Math.max(1, Math.round(elapsed() / 60000))} min`,
      `- Resultat: ${result}`,
      draft.nextAction ? `- Nästa steg: ${draft.nextAction}` : '',
      '',
      '## Anteckningar',
      draft.notes.trim() || '(inga)',
      '',
      '## Behovsavklaring',
      answered.length ? answered.map((q) => `- ${q.title} ${draft.answers[q.title].trim()}`).join('\n') : '(inte ställda)',
      '',
      '## Siffror',
      ...(figures.length ? figures : ['(inga)']),
      '',
      '## Invändningar som kom upp',
      draft.heard.length ? draft.heard.map((h) => `- ${h}`).join('\n') : '(inga)',
      ...(draft.transcript.trim() ? ['', '## Transkript (AI, kunden informerad)', draft.transcript.trim()] : []),
    ].filter((line, i, all) => !(line === '' && all[i - 1] === '')).join('\n');
  }

  function leadFields(r) {
    const today = isoLocal();
    const f = {};
    const action = draft.nextAction.trim();
    switch (draft.outcome) {
      case 'callback':
        if (!r || ['researched', 'drafted'].includes(r.status)) f.status = 'contacted';
        f.next_action = action || 'Ring igen';
        f.next_date = draft.nextDate || today;
        break;
      case 'meeting':
        f.status = 'booked';
        f.booked_via = 'phone';
        f.next_action = action || `Demomöte${draft.meetingTime ? ` ${draft.meetingTime}` : ''}`;
        if (draft.nextDate) f.next_date = draft.nextDate;
        break;
      case 'demo': f.status = 'demo'; f.next_action = action || 'Skicka offert'; if (draft.nextDate) f.next_date = draft.nextDate; break;
      case 'offer': f.status = 'offer'; f.next_action = action || 'Följ upp offerten'; if (draft.nextDate) f.next_date = draft.nextDate; break;
      case 'won': f.status = 'won'; break;
      case 'lost': f.status = 'lost'; break;
      default:
        if (r && ['researched', 'drafted'].includes(r.status) && draft.type === 'phone') f.status = 'contacted';
        if (action) f.next_action = action;
        if (draft.nextDate) f.next_date = draft.nextDate;
    }
    if (draft.pkg) f.package = draft.pkg;
    if (draft.outcome === 'lost' && draft.lostReason) f.notes = `${r?.notes ? `${r.notes} · ` : ''}förlorad: ${draft.lostReason}`;
    return f;
  }

  async function save() {
    if (!draft.company) { d.toast('Välj eller skriv ett företag först.'); $('#lv-company').focus(); return; }
    if (!draft.notes.trim() && draft.outcome === 'none' && !Object.values(draft.answers).some((x) => String(x).trim())) {
      d.toast('Det finns inget att spara än.');
      return;
    }
    pauseTimer();
    const btn = $('#lv-save');
    btn.disabled = true;
    try {
      let r = lead();
      if (!r) {
        r = await d.addLead({ company: draft.company, channel: draft.type === 'phone' ? 'phone' : 'email' });
        if (r) draft.lead = r.id;
      }
      const text = noteMarkdown(r);
      let saved = null;
      if (!d.isDemo()) saved = await d.api('/api/calls', { company: draft.company, lead: r?.id || '', text, summarize: draft.summarize });
      const fields = leadFields(r);
      let moved = null;
      if (r && Object.keys(fields).length) moved = await d.saveLead(r.id, fields, { quiet: true });
      const started = [saved?.fired?.length ? '/call-summary skriver uppföljningen' : '', moved?.fired?.length ? '/demo-prep och /book-meeting förbereder demon' : ''].filter(Boolean);
      // A booked meeting with a date and a time goes straight into the calendar as a file.
      if (draft.outcome === 'meeting' && draft.nextDate && draft.meetingTime) {
        downloadIcs(`demo-${draft.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`, meetingIcs({
          title: `Demo Driv Kundesenter · ${draft.company}`,
          date: draft.nextDate, time: draft.meetingTime, minutes: 30,
          description: [r?.phone ? `Telefon: ${r.phone}` : '', r?.website ? `Webb: ${r.website}` : '', draft.notes.trim().slice(0, 600)].filter(Boolean).join('\n'),
        }));
        started.push('kalenderfilen är hämtad, öppna den så hamnar mötet i kalendern');
      }
      if (d.isDemo()) {
        d.toast(`Demo: i riktiga Jarvis sparas anteckningen i samtal/ och ${draft.company} flyttas i pipelinen.${started.length ? ` ${started.at(-1)}.` : ''}`);
        if (draft.summarize) d.demoJob('call-summary', `Samtalssammanfattning · ${draft.company}`);
      } else {
        d.toast(`Sparat i ${saved.path}${started.length ? ` · ${started.join(' · ')}` : ''}.`);
      }
      reset();
    } catch (err) {
      d.toast(`Kunde inte spara: ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  }

  function reset() {
    if (listener) stopListening();
    draft = { ...blankDraft(), summarize: draft.summarize };
    d.store.set('live', draft);
    fill();
  }

  // ---------------------------------------------------------------- render

  function renderBar() {
    $$('#view-live [data-type]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === draft.type)));
  }

  function renderCompanyList() {
    $('#lv-companies').innerHTML = leads().filter((r) => !/^Exempelföretag /.test(r.company)).map((r) => `<option value="${esc(r.company)}${r.city ? ` · ${esc(r.city)}` : ''}"></option>`).join('');
  }

  /** Put the draft back into the inputs (after building, a reset or switching company). */
  function fill() {
    $('#lv-company').value = draft.company;
    $('#lv-notes').value = draft.notes;
    for (const [k] of NUMBER_FIELDS) $(`#view-live [data-num="${k}"]`).value = draft.numbers[k] ?? '';
    $('#lv-perday').value = draft.perDay;
    $('#lv-systems').value = draft.systems;
    renderBar();
    renderTimer();
    renderCompany();
    renderQuestions();
    renderPlan();
    renderOutcome();
    renderHeard();
    renderCards();
    $('#lv-consent').checked = Boolean(draft.consent);
    renderTranscript();
  }

  async function loadContent() {
    try {
      const [o, c] = await Promise.all([d.loadText('wiki/objections.md'), d.loadText('wiki/product-cards.md')]);
      objections = parseCards(o);
      cards = parseCards(c);
    } catch (err) {
      d.toast(`Kunde inte läsa korten: ${err.message}`);
    }
  }

  return {
    /** Called when the Live view is shown. */
    async show() {
      // Opening from the pipeline calls show() twice in a row; both wait for the same build.
      ready ||= (async () => {
        build();
        await loadContent();
        fill();
        tick = setInterval(() => { if (draft.running) renderTimer(); }, 1000);
      })();
      await ready;
      renderCompanyList();
      $('#lv-share').checked = document.body.classList.contains('share-safe');
      renderCards();
      setTimeout(() => (draft.company ? $('#lv-notes') : $('#lv-company'))?.focus(), 30);
    },
    /** Called on every HUD refresh: only the parts that come from the pipeline. */
    update() {
      if (!built) return;
      renderCompanyList();
      renderCompany();
    },
    openCompany,
    save,
    focusSearch() { $('#lv-search')?.focus(); },
    get built() { return built; },
  };
}
