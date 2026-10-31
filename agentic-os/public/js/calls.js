// Ringläge: every call attempt is one line in ops/calls.md (date, time, company, outcome), so
// the pipeline moves with one key press and the best hours to call come from Naim's own calls.
// The log holds company ids and short notes only, no people (GDPR). Shared by the server and
// the browser demo.

import { isoLocal } from './pipeline.js';

/** One key per outcome. `reached` = talked to the right person; it drives the best-times table. */
export const CALL_OUTCOMES = [
  { id: 'noanswer', key: '1', label: 'Inget svar', reached: false },
  { id: 'gatekeeper', key: '2', label: 'Växeln / spärr', reached: false },
  { id: 'wrong', key: '3', label: 'Fel person', reached: false },
  { id: 'callback', key: '4', label: 'Ring tillbaka', reached: true, date: 'Ring tillbaka den' },
  { id: 'meeting', key: '5', label: 'Möte bokat', reached: true, date: 'Mötesdatum' },
  { id: 'talk', key: '6', label: 'Pratar · öppna Live', reached: true },
  { id: 'notnow', key: '7', label: 'Inte intresserad', reached: true },
  { id: 'optout', key: '8', label: 'Vill inte bli kontaktad', reached: true },
];
const BY_ID = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.id, o]));

export const CALLS_HEADER = `# Samtalslogg

Ett försök per rad, skrivet av Ringläget i Jarvis. Bara företag och utfall, inga namn (GDPR).
Utfall: ${CALL_OUTCOMES.map((o) => `\`${o.id}\` ${o.label.toLowerCase()}`).join(', ')}.

| date | time | id | company | outcome | note |
| --- | --- | --- | --- | --- | --- |
`;

const cell = (v) => String(v ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();

export function callLine(a) {
  return `| ${[a.date, a.time, a.id, a.company, a.outcome, a.note].map(cell).join(' | ')} |`;
}

export function parseCalls(md) {
  const rows = [];
  for (const line of String(md || '').split('\n')) {
    if (!/^\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(line)) continue;
    const c = line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((x) => x.trim().replace(/\\\|/g, '|'));
    rows.push({ date: c[0], time: c[1], id: c[2], company: c[3], outcome: c[4], note: c[5] || '' });
  }
  return rows;
}

/** A weekday `n` working days after `iso` (Saturday and Sunday skipped). */
export function addWorkdays(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1;
  }
  return isoLocal(d);
}

/**
 * What one outcome changes on the pipeline row. The status is applied first (it stamps the
 * dates), then these fields win, the same way the HUD and the Bridge update a lead.
 */
export function attemptFields(outcome, row, today, { date = '', time = '', note = '' } = {}) {
  const o = BY_ID[outcome];
  if (!o) throw Object.assign(new Error(`Okänt utfall "${outcome}".`), { status: 400 });
  const f = {};
  // The first contact with this company is this call.
  if (!row.contacted) f.channel = 'phone';
  if (['researched', 'drafted'].includes(row.status)) f.status = 'contacted';
  const addNote = (text) => { f.notes = [row.notes, `${today}: ${text}`].filter(Boolean).join(' · '); };
  switch (outcome) {
    case 'noanswer': f.next_action = 'Ring igen'; f.next_date = addWorkdays(today, 1); break;
    case 'gatekeeper': f.next_action = 'Ring igen: be om den som har ansvar för kundservice'; f.next_date = addWorkdays(today, 2); break;
    case 'wrong': f.next_action = 'Ring rätt person'; f.next_date = addWorkdays(today, 1); break;
    case 'callback': f.next_action = 'Ring tillbaka (de bad om det)'; f.next_date = date || addWorkdays(today, 2); break;
    case 'meeting': f.status = 'booked'; f.booked_via = 'phone'; f.next_action = `Demomöte${time ? ` ${time}` : ''}`; f.next_date = date || ''; break;
    case 'talk': break;
    case 'notnow': f.status = 'lost'; addNote('inte intresserad (samtal)'); break;
    case 'optout': f.status = 'lost'; addNote('opt-out: vill inte bli kontaktad'); f.next_action = ''; f.next_date = ''; break;
    default: break;
  }
  if (note && !f.notes) addNote(note);
  else if (note) f.notes += ` (${note})`;
  return f;
}

/** Calls per hour and weekday, reach rates, today's tally, and the last attempts per company. */
export function callStats(attempts, today = isoLocal()) {
  const hours = Array.from({ length: 10 }, (_, i) => ({ hour: 8 + i, n: 0, reached: 0 }));
  const days = ['mån', 'tis', 'ons', 'tor', 'fre'].map((label) => ({ label, n: 0, reached: 0 }));
  const history = {};
  const tally = { attempts: 0, reached: 0, meetings: 0 };
  const byOutcome = Object.fromEntries(CALL_OUTCOMES.map((o) => [o.id, 0]));
  for (const a of attempts) {
    const o = BY_ID[a.outcome];
    if (!o) continue;
    byOutcome[a.outcome] += 1;
    const h = Number(String(a.time).slice(0, 2));
    const slot = hours.find((x) => x.hour === h);
    if (slot) { slot.n += 1; if (o.reached) slot.reached += 1; }
    const wd = new Date(`${a.date}T12:00:00`).getDay();
    if (wd >= 1 && wd <= 5) { days[wd - 1].n += 1; if (o.reached) days[wd - 1].reached += 1; }
    if (a.date === today) { tally.attempts += 1; if (o.reached) tally.reached += 1; if (a.outcome === 'meeting') tally.meetings += 1; }
    (history[a.id] ||= []).push({ date: a.date, time: a.time, outcome: a.outcome });
  }
  for (const id of Object.keys(history)) history[id] = history[id].sort((x, y) => `${y.date}${y.time}`.localeCompare(`${x.date}${x.time}`)).slice(0, 5);
  const total = attempts.length;
  const rate = (x) => (x.n ? x.reached / x.n : 0);
  // Best hours only once there is enough to say anything: 30 calls, 5 in an hour.
  const best = total >= 30 ? hours.filter((x) => x.n >= 5).sort((a, b) => rate(b) - rate(a)).slice(0, 3).map((x) => x.hour) : [];
  return { total, today: tally, byOutcome, hours, days, best, minForBest: 30, history };
}

const DONE = ['won', 'lost', 'replied', 'booked', 'demo', 'offer'];

/**
 * Today's calls, in order: call-backs and retries that are due, then calls after an email,
 * then new companies with a published number. Anyone already called today waits.
 */
export function callQueue(rows, history = {}, today = isoLocal()) {
  const calledToday = (r) => (history[r.id] || []).some((a) => a.date === today);
  const due = (r) => r.next_date && r.next_date <= today;
  const items = [];
  for (const r of rows) {
    if (!r.phone || calledToday(r) || /opt-out/i.test(r.notes || '')) continue;
    const ring = /^ring/i.test(r.next_action || '');
    if (!['won', 'lost'].includes(r.status) && due(r) && ring) items.push({ r, group: 0, why: r.next_date < today ? 'Ring igen · sen' : 'Ring igen idag' });
    else if (DONE.includes(r.status)) continue;
    else if (r.status === 'contacted' && due(r)) items.push({ r, group: 1, why: r.contacted && (r.channel || 'email') !== 'phone' ? 'Efter mejlet' : 'Uppföljning' });
    else if (['researched', 'drafted'].includes(r.status) && !r.contacted) items.push({ r, group: 2, why: 'Nytt företag' });
  }
  return items
    .sort((a, b) => a.group - b.group || String(a.r.next_date || a.r.added).localeCompare(String(b.r.next_date || b.r.added)) || a.r.id.localeCompare(b.r.id))
    .slice(0, 60);
}
