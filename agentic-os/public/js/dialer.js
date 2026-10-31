// The Ring view: today's call list one company at a time. Call, press one key for what happened
// (1 no answer … 8 do not contact), and the pipeline moves, the attempt is logged in
// ops/calls.md and the next company comes up. "Pratar" opens the Live view for the real
// conversation. No commission and no people's names on this screen.

import { parseCards } from './cards.js';
import { CALL_OUTCOMES, callQueue } from './calls.js';
import { STAGE_LABELS, svDate } from './pipeline.js';
import { meetingIcs, downloadIcs } from './ics.js';

const OUTCOME_LABEL = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.id, o.label]));

/**
 * @param {object} d  $, $$, esc, store, toast, getState, isDemo, loadText, logAttempt(id, outcome, {note, date}), openLive(id)
 */
export function createDialer(d) {
  const { $, $$, esc } = d;
  let built = false;
  let ready = null;
  let phrases = [];
  let current = d.store.get('dialer', '');
  let busy = false;

  const state = () => d.getState() || {};
  const calls = () => state().calls || { history: {}, today: { attempts: 0, reached: 0, meetings: 0 }, hours: [], total: 0, best: [], minForBest: 30 };
  const queue = () => callQueue(state().leads || [], calls().history, state().stats?.today);
  const phrase = (title) => phrases.find((c) => c.title.toLowerCase().startsWith(title.toLowerCase()));

  function build() {
    $('#view-dialer').innerHTML = `
      <div class="dialer">
        <div class="glass dl-bar" id="dl-bar"></div>
        <div class="dl-grid">
          <section class="glass dl-card" id="dl-current" aria-live="polite"></section>
          <aside class="dl-side">
            <div class="glass dl-queue"><span class="label">Kön idag</span><ol id="dl-queue"></ol></div>
            <div class="glass dl-best" id="dl-best"></div>
          </aside>
        </div>
      </div>`;
    built = true;
  }

  function renderBar() {
    const c = calls().today;
    const target = state().stats?.dailyTarget || 0;
    $('#dl-bar').innerHTML = `
      <div class="dl-stat"><b>${c.attempts}</b><span>samtal idag</span></div>
      <div class="dl-stat"><b>${c.reached}</b><span>nådde rätt person</span></div>
      <div class="dl-stat"><b>${c.meetings}</b><span>möten bokade</span></div>
      <div class="dl-stat"><b>${queue().length}</b><span>kvar i kön</span></div>
      <p class="muted">Tryck <kbd>1</kbd>–<kbd>8</kbd> för utfallet, <kbd>→</kbd> för att hoppa över.${target ? ` Dagsmål: ${target} kontakter (mejl + samtal).` : ''}</p>`;
  }

  function renderCurrent() {
    const q = queue();
    const box = $('#dl-current');
    if (!q.length) {
      box.innerHTML = `<span class="label">Ringläge</span><h3 class="dl-co">Kön är tom</h3>
        <p class="muted">Inga företag med telefonnummer att ringa idag. Hitta nya under Kommando → Pipeline → Hitta företag, eller kör /call-list.</p>`;
      return;
    }
    let idx = q.findIndex((x) => x.r.id === current);
    if (idx < 0) { idx = 0; current = q[0].r.id; d.store.set('dialer', current); }
    const { r, why } = q[idx];
    const hist = calls().history[r.id] || [];
    const afterEmail = why === 'Efter mejlet';
    const opener = phrase(afterEmail ? 'Etter e-posten' : 'Åpning') || null;
    const say = (c) => (c ? `<div class="dl-say"><span class="label">${esc(c.title)}</span><p>${esc(c.fields['säg'] || '')}</p>${c.fields.tips ? `<small>${esc(c.fields.tips)}</small>` : ''}</div>` : '');
    const site = r.website ? `<a href="${esc(/^https?:/.test(r.website) ? r.website : `https://${r.website}`)}" target="_blank" rel="noopener">${esc(r.website.replace(/^https?:\/\//, ''))}</a>` : '';
    box.innerHTML = `
      <div class="dl-top"><span class="label">Samtal ${idx + 1} av ${q.length}</span><span class="chip">${esc(why)}</span><span class="chip">${esc(STAGE_LABELS[r.status] || r.status)}</span></div>
      <h3 class="dl-co">${esc(r.company)}</h3>
      <p class="muted">${esc([r.industry, r.city].filter(Boolean).join(' · '))}${site ? ` · ${site}` : ''}</p>
      <a class="dl-phone" href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">Ring ${esc(r.phone)}</a>
      ${hist.length ? `<p class="dl-hist">Tidigare: ${hist.map((h) => `${esc(OUTCOME_LABEL[h.outcome] || h.outcome).toLowerCase()} ${esc(svDate(h.date))} ${esc(h.time)}`).join(' · ')}</p>` : ''}
      ${r.notes ? `<p class="dl-obs">${esc(r.notes)}</p>` : ''}
      ${say(opener)}
      <div class="dl-phrases">${say(phrase('Växeln'))}${say(phrase('Telefonsvarer'))}</div>
      <div class="dl-outcomes">${CALL_OUTCOMES.map((o) => `<button data-outcome="${o.id}"><kbd>${o.key}</kbd>${esc(o.label)}</button>`).join('')}</div>
      <div class="dl-extra">
        <label>Datum (ring tillbaka / möte)<input type="date" id="dl-date"></label>
        <label>Tid (möte)<input type="time" id="dl-time" step="900"></label>
        <label class="grow">Kort anteckning (roll, inte namn)<input id="dl-note" maxlength="200" placeholder="t.ex. ring efter 14, daglig leder på semester"></label>
        <button class="ghost-btn" id="dl-skip">Hoppa över →</button>
      </div>`;
    $$('#dl-current [data-outcome]').forEach((b) => b.addEventListener('click', () => log(b.dataset.outcome)));
    $('#dl-skip').addEventListener('click', skip);
  }

  function renderQueue() {
    const q = queue();
    $('#dl-queue').innerHTML = q.length
      ? q.slice(0, 14).map(({ r, why }) => `<li><button class="${r.id === current ? 'on' : ''}" data-pick="${esc(r.id)}"><span>${esc(r.company)}</span><small>${esc(why)}</small></button></li>`).join('')
        + (q.length > 14 ? `<li class="muted">+ ${q.length - 14} till</li>` : '')
      : '<li class="muted">Tomt</li>';
    $$('#dl-queue [data-pick]').forEach((b) => b.addEventListener('click', () => { current = b.dataset.pick; d.store.set('dialer', current); render(); }));
  }

  function renderBest() {
    const c = calls();
    const hours = (c.hours || []).filter((h) => h.n);
    const max = Math.max(1, ...hours.map((h) => h.n));
    $('#dl-best').innerHTML = `<span class="label">Bästa tider att ringa · dina samtal${d.isDemo() ? ' · exempel' : ''}</span>
      ${c.total < c.minForBest
        ? `<p class="muted">Behöver minst ${c.minForBest} samtal för att säga något (har ${c.total}). Till dess: prova tidig förmiddag och efter lunch, och jämför.</p>`
        : `<p class="muted">Bäst hittills: ${c.best.length ? c.best.map((h) => `${h}–${h + 1}`).join(', ') : 'för få samtal per timme än'}. Andel där du nådde rätt person.</p>`}
      <div class="dl-hours">${hours.map((h) => `<div title="${h.reached} av ${h.n} nådda"><span>${h.hour}</span><i style="--w:${Math.round((h.n / max) * 100)}%;--r:${Math.round((h.reached / h.n) * 100)}%"></i><small>${Math.round((h.reached / h.n) * 100)} % · ${h.n}</small></div>`).join('') || '<p class="muted">Inga samtal loggade än.</p>'}</div>`;
  }

  function render() {
    if (!built) return;
    renderBar();
    renderCurrent();
    renderQueue();
    renderBest();
  }

  function skip() {
    const q = queue();
    if (!q.length) return;
    const i = q.findIndex((x) => x.r.id === current);
    current = q[(i + 1) % q.length].r.id;
    d.store.set('dialer', current);
    render();
  }

  async function log(outcome) {
    if (busy || !current) return;
    const o = CALL_OUTCOMES.find((x) => x.id === outcome);
    const date = $('#dl-date')?.value || '';
    const time = $('#dl-time')?.value || '';
    const note = $('#dl-note')?.value.trim() || '';
    const q = queue();
    const i = q.findIndex((x) => x.r.id === current);
    const id = current;
    const company = q[i]?.r.company || '';
    // The next company comes up straight away; the one just called leaves today's queue.
    current = q[i + 1]?.r.id || q[0]?.r.id || '';
    busy = true;
    try {
      const res = await d.logAttempt(id, outcome, { date, time, note });
      d.store.set('dialer', current);
      // A booked meeting with a date and a time goes into the calendar as a file.
      const ics = outcome === 'meeting' && date && time;
      if (ics) downloadIcs(`demo-${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`, meetingIcs({ title: `Demo Driv Kundesenter · ${company}`, date, time, minutes: 30, description: note }));
      d.toast(`${o.label} · ${company}${res?.fired?.length ? ' · /demo-prep förbereder demon' : ''}${ics ? ' · kalenderfilen är hämtad: öppna den' : ''}`);
      if (outcome === 'talk') d.openLive(id);
    } catch (err) {
      current = id;
      d.toast(`Kunde inte spara: ${err.message}`);
    } finally {
      busy = false;
      render();
    }
  }

  return {
    async show() {
      ready ||= (async () => {
        build();
        try { phrases = parseCards(await d.loadText('wiki/product-cards.md')).filter((c) => c.fields.typ === 'fras'); } catch { phrases = []; }
      })();
      await ready;
      render();
    },
    update: render,
    /** Keys while the Ring view is open. Returns true when it handled the key. */
    key(e) {
      if (!built || e.ctrlKey || e.metaKey || e.altKey) return false;
      const o = CALL_OUTCOMES.find((x) => x.key === e.key);
      if (o) { e.preventDefault(); log(o.id); return true; }
      if (e.key === 'ArrowRight') { e.preventDefault(); skip(); return true; }
      return false;
    },
  };
}
