// Fast checks with no network and no model calls:  npm run check

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify } from '../public/js/classify.js';
import { answerRule } from '../public/js/rules.js';
import { parseSchedule, lastDue, describe } from '../lib/scheduler.js';
import { H, Vault, slugify } from '../lib/vault.js';
import { parsePipeline, renderPipeline, computeStats, applyStatus, goalMath, creditPlan, isGenericEmail, scrubPersonal, privacyMode, payoutDate, clawbackUntil } from '../public/js/pipeline.js';
import { blockReason } from './guard.mjs';
import { normalizeEnhet, brregUrl, searchBrreg, readPage, assertPublicUrl, checkSite } from '../lib/leads.js';
import { attemptFields, parseCalls, callLine, callQueue, callStats, addWorkdays } from '../public/js/calls.js';
import { loadSkills } from '../lib/skills.js';
import { parseCards, searchCards } from '../public/js/cards.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vault = new Vault(path.join(root, 'vault'));
const { skills } = loadSkills(vault);
let passed = 0;
const pending = [];
const check = (name, fn) => {
  const ok = () => { passed += 1; console.log(`  ok  ${name}`); };
  const r = fn();
  if (r && typeof r.then === 'function') pending.push(r.then(ok)); else ok();
};

check('every skill in the backbone has a SKILL.md', () => {
  const bb = vault.readJson('system/backbone.json');
  for (const s of bb.skills) assert.ok(skills.find((x) => x.name === s.name), `missing .claude/skills/${s.name}/SKILL.md`);
});

const routes = {
  // Swedish first: the HUD and Jarvis are Swedish now.
  'vad är dagens fokus?': 'rule:priorities',
  'vad har jag idag?': 'rule:schedule',
  'hur går det?': 'rule:numbers',
  'hur mycket provision har jag tjänat?': 'rule:numbers',
  'ligger jag i fas?': 'rule:pace',
  'hur många samtal behöver jag för att nå målet?': 'rule:pace',
  'vem ska jag följa upp idag?': 'rule:followups',
  'vilken kanal funkar bäst?': 'rule:channels',
  'ger mejlen något?': 'rule:channels',
  'vad svarar jag på «vi klarer oss med Outlook»?': 'quick',
  'planera dagen': 'skill:plan-today',
  'hitta 10 företag: nettbutikker i Bergen': 'skill:lead-research',
  'skriv mejl till nya leads': 'skill:outreach-drafts',
  'bygg veckans kampanj': 'skill:campaign',
  'gör kampanjen till instantly': 'skill:campaign',
  'vem ska jag ringa idag?': 'skill:call-list',
  'ringlistan för idag': 'skill:call-list',
  'skriv uppföljningar': 'skill:follow-ups',
  'kolla inkorgen': 'skill:inbox-brief',
  'synka pipelinen med gmail': 'skill:sync-pipeline',
  'förbered demon med Havgløtt Hotell': 'skill:demo-prep',
  'skriv offerten till Nordlys Sykkel': 'skill:offer',
  'samla invändningarna från veckan': 'skill:objections',
  'sammanfatta samtalet med Fjellsport': 'skill:call-summary',
  'skriv veckorapporten till chefen': 'skill:chef-rapport',
  'hur gick veckan?': 'skill:weekly-review',
  'har jag fått betalt för Fjellsport?': 'skill:commission-check',
  'när får jag betalt?': 'rule:payout',
  'när kommer förskottet?': 'rule:payout',
  'undersök marknaden för treningssentre i norge': 'skill:deep-research',
  'hej': 'quick',
  // English still works.
  'how am I doing?': 'rule:numbers',
  'am I on pace?': 'rule:pace',
  'find 10 leads: nettbutikker i Bergen': 'skill:lead-research',
  'prep for my demo with Havgløtt Hotell': 'skill:demo-prep',
  'summarize the call with Fjellsport': 'skill:call-summary',
  'hello': 'quick',
};
for (const [text, want] of Object.entries(routes)) {
  check(`routes "${text}" -> ${want}`, () => assert.equal(classify(text, { skills }).pick.id, want));
}

check('probabilities sum to 1', () => {
  const r = classify('plan my day', { skills });
  assert.ok(Math.abs(r.choices.reduce((a, c) => a + c.p, 0) - 1) < 1e-9);
});

check('schedules parse', () => {
  assert.deepEqual(parseSchedule('daily 06:30'), { kind: 'daily', h: 6, min: 30 });
  assert.equal(parseSchedule('weekly sun 18:00').day, 0);
  assert.equal(parseSchedule('event video-live').event, 'video-live');
  assert.equal(parseSchedule('manual').kind, 'manual');
});

check('daily schedule is due after its time, not before', () => {
  const s = parseSchedule('daily 07:00');
  assert.equal(lastDue(s, new Date('2026-10-12T06:59:00')), null);
  assert.ok(lastDue(s, new Date('2026-10-12T07:01:00')));
});

check('weekly schedule only fires on its day', () => {
  const s = parseSchedule('weekly sun 18:00');
  assert.ok(lastDue(s, new Date('2026-10-11T18:30:00'))); // a Sunday
  assert.equal(lastDue(s, new Date('2026-10-12T18:30:00')), null);
});

check('vault reads checkboxes with line numbers', () => {
  const items = vault.listItems('ops/tasks.md', H.open);
  assert.ok(items.length >= 3);
  assert.equal(typeof items[0].line, 'number');
});

check('vault refuses paths outside itself', () => {
  assert.throws(() => vault.resolve('../server.js'));
});

check('daily note is created from the template', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aos-'));
  fs.cpSync(path.join(root, 'vault/system'), path.join(tmp, 'system'), { recursive: true });
  fs.cpSync(path.join(root, 'vault/ops'), path.join(tmp, 'ops'), { recursive: true });
  const v = new Vault(tmp);
  assert.equal(v.ensureToday(), true);
  assert.equal(v.directives().length, 3);
  assert.ok(v.schedule().length >= 5);
  fs.rmSync(tmp, { recursive: true, force: true });
});

check('weekdays schedule skips the weekend', () => {
  const s = parseSchedule('weekdays 08:30');
  assert.equal(lastDue(s, new Date('2026-10-11T09:00:00')), null); // Sunday
  assert.ok(lastDue(s, new Date('2026-10-12T09:00:00'))); // Monday
});

check('pipeline table round-trips, including pipes in notes', () => {
  const md = vault.read('ops/pipeline.md');
  const doc = parsePipeline(md);
  const n = doc.rows.length;
  doc.rows.push({ id: 'L999', company: 'Test | AB', status: 'researched', email: 'a@b.se' });
  const again = parsePipeline(renderPipeline(doc));
  assert.equal(again.rows.length, n + 1);
  assert.equal(again.rows.at(-1).company, 'Test | AB');
  assert.match(again.before, /# Pipeline/);
});

const BIZ = { goal_deals_month: 4, daily_contacts: 60, default_package: 'M', packages: { S: { commission: 5000 }, M: { commission: 10000 }, L: { commission: 20000 } } };
const ROWS = [
  { id: 'L1', company: 'A', status: 'contacted', contacted: '2026-10-13' },
  { id: 'L2', company: 'B', status: 'replied', contacted: '2026-10-12', replied: '2026-10-13' },
  { id: 'L3', company: 'C', status: 'won', channel: 'phone', package: 'Large', contacted: '2026-09-20', booked: '2026-09-25', demo: '2026-10-02', closed: '2026-10-05' },
  { id: 'L4', company: 'D', status: 'contacted', channel: 'phone', contacted: '2026-10-09' },
  { id: 'L5', company: 'E', status: 'booked', channel: 'phone', contacted: '2026-10-01', booked: '2026-10-06' },
];

check('stats are counted from the rows', () => {
  const st = computeStats(ROWS, { business: BIZ, today: '2026-10-14' }); // a Wednesday
  assert.equal(st.contactsWeek, 2);
  assert.equal(st.contactsPrevWeek, 1);
  assert.equal(st.commissionMonth, 20000);
  assert.equal(st.dealsMonth, 1);
  assert.equal(st.goal.pct, 25);
  assert.equal(st.bookedMonth, 1);
  assert.equal(st.demosMonth, 1);
  assert.equal(st.replyRate, 1 / 2); // email only
  assert.equal(st.bookRate30, 2 / 5);
  assert.equal(st.unpaid, 20000);
  assert.deepEqual(st.inPlay, { count: 1, commission: 10000 }); // no package yet: the default
  assert.deepEqual(st.followups.map((f) => [f.company, f.action]), [['D', 'Ring igen']]); // phone: due after 2 days
  assert.deepEqual([st.rates.book, st.rates.show, st.rates.close], [2 / 5, 1 / 2, 1]);
});

check('goal math works back from deals to contacts, on guesses until there is data', () => {
  const st = computeStats(ROWS, { business: BIZ, today: '2026-10-14' });
  const g = goalMath(st, { ...BIZ, assumptions: { book_rate: 2, show_rate: 80, close_rate: 10 } });
  assert.equal(g.book.source, 'guess');
  assert.equal(g.left, 3);
  assert.equal(Math.round(g.contactsNeeded), 1875);
  assert.equal(g.workdaysLeft, 13);
  const typed = goalMath(st, BIZ, { book: 5, show: 100, close: 20 });
  assert.equal(typed.book.source, 'typed');
  assert.equal(Math.round(typed.contactsNeeded), 300);
});

check('moving a company to booked stamps the earlier stages, phone skips replied', () => {
  const mail = applyStatus({ status: 'researched' }, 'booked', '2026-10-14');
  assert.equal(mail.booked, '2026-10-14');
  assert.equal(mail.contacted, '2026-10-14');
  assert.equal(mail.replied, '2026-10-14');
  const call = applyStatus({ status: 'researched', channel: 'phone' }, 'booked', '2026-10-14');
  assert.equal(call.replied, undefined);
  assert.equal(applyStatus({ status: 'contacted' }, 'call', '2026-10-14').status, 'booked'); // old name
});

check('old pipeline tables still read', () => {
  const doc = parsePipeline('| id | company | niche | status | call |\n| --- | --- | --- | --- | --- |\n| L1 | A | dental | call | 2026-10-01 |');
  assert.equal(doc.rows[0].industry, 'dental');
  assert.equal(doc.rows[0].booked, '2026-10-01');
  assert.equal(doc.rows[0].status, 'booked');
});

check('pace and numbers answers come from the pipeline', () => {
  const st = computeStats(ROWS, { business: BIZ, today: '2026-10-14' });
  assert.match(answerRule('numbers', { stats: st, business: BIZ }), /1 affär av 4 \(1 Large\), 20 000 NOK/);
  assert.match(answerRule('pace', { stats: st, business: BIZ }), /3 affärer kvar till 4/);
});

const DRIV = JSON.parse(fs.readFileSync(path.join(root, 'vault/system/business.json'), 'utf8'));

check('credits pick the smallest Driv package that covers the need', () => {
  assert.equal(creditPlan({ agent: 2, queue: 1, webchat: 1, ai_agent: 1 }, DRIV).pick.key, 'S'); // Driv's Small example: 5
  const m = creditPlan({ agent: 8, queue: 2, webchat: 1, email_channel: 1, ai_agent: 1 }, DRIV); // Medium example: 14
  assert.equal(m.credits, 14);
  assert.equal(m.pick.key, 'M');
  assert.equal(creditPlan({ agent: 20, queue: 3, webchat: 2, email_channel: 1, ai_agent: 2 }, DRIV).pick.key, 'L'); // 29
  const big = creditPlan({ agent: 30, queue: 3 }, DRIV);
  assert.equal(big.pick.key, 'L');
  assert.equal(big.pick.extraCredits, 3);
  assert.equal(big.pick.monthly, 13595 + 3 * 299);
});

check("goal money uses Driv's typical month (4 deals = 33 000)", () => {
  const st = computeStats([], { business: DRIV, today: '2026-10-14' });
  const g = goalMath(st, DRIV);
  assert.equal(g.avgCommission, 8250);
  assert.equal(g.commissionAtGoal, 33000);
});

check('offers are a stage, and commission is paid the month after activation', () => {
  const row = applyStatus({ status: 'demo', demo: '2026-10-10' }, 'offer', '2026-10-11');
  assert.equal(row.offer, '2026-10-11');
  assert.equal(row.next_action, 'Följ upp offerten');
  assert.equal(applyStatus({ status: 'demo' }, 'proposal', '2026-10-11').status, 'offer'); // old name
  assert.equal(payoutDate('2026-11-20', DRIV), '2026-12-25');
  assert.equal(payoutDate('2026-12-03', DRIV), '2027-01-25');
  assert.equal(clawbackUntil('2026-11-20', DRIV), '2027-05-20');
  const st = computeStats([
    { id: 'L1', company: 'A', status: 'won', package: 'M', closed: '2026-08-20', activated: '2026-08-28' }, // due 25 Sep: late
    { id: 'L2', company: 'B', status: 'won', package: 'S', closed: '2026-09-20', activated: '2026-10-02' }, // due 25 Nov
    { id: 'L3', company: 'C', status: 'won', package: 'L', closed: '2026-10-05' }, // signed, not activated: no date yet
    { id: 'L4', company: 'D', status: 'won', package: 'S', closed: '2026-07-01', activated: '2026-07-10', paid: '2026-08-25' }, // paid, still clawable
  ], { business: DRIV, today: '2026-10-14' });
  assert.equal(st.commissionCurrency, 'SEK');
  assert.equal(st.sekPerNok, 0); // no conversion: commission is already SEK
  assert.equal(st.overdueUnpaid, 10000);
  assert.equal(st.unpaid, 35000);
  assert.deepEqual(st.nextPayout, { date: '2026-11-25', amount: 5000 });
  assert.equal(st.awaitingActivation.amount, 20000);
  assert.deepEqual(st.forecast.map((m) => m.amount), [0, 5000, 0]);
  assert.equal(st.clawback.count, 3); // L1, L2 and L4 were activated within 6 months
});

check('meetings are counted by the channel that booked them', () => {
  const st = computeStats([
    { id: 'L1', company: 'A', channel: 'email', status: 'booked', contacted: '2026-10-01', replied: '2026-10-03', booked: '2026-10-04' },
    { id: 'L2', company: 'B', channel: 'email', status: 'won', package: 'S', contacted: '2026-10-01', booked: '2026-10-06', closed: '2026-10-12' },
    { id: 'L3', company: 'C', channel: 'phone', status: 'booked', contacted: '2026-10-02', booked: '2026-10-02' },
    { id: 'L4', company: 'D', channel: 'email', status: 'booked', booked_via: 'phone', contacted: '2026-10-05', booked: '2026-10-07' },
  ], { business: DRIV, today: '2026-10-14' });
  assert.equal(st.channels.email.contactsMonth, 3);
  assert.equal(st.channels.call.contactsMonth, 1);
  assert.equal(st.channels.email.meetingsMonth, 1); // L1 replied
  assert.equal(st.channels.followcall.meetingsMonth, 2); // L2 no reply, L4 set by hand
  assert.equal(st.channels.call.meetingsMonth, 1);
  assert.equal(st.channels.followcall.commissionMonth, 5000);
  const row = applyStatus({ status: 'contacted', channel: 'email', booked_via: 'phone' }, 'booked', '2026-10-14');
  assert.equal(row.replied, undefined); // booked by phone: no fake reply
});

check('schedules read in Swedish', () => {
  assert.equal(describe('weekdays 08:30').text, 'vardagar 08:30');
  assert.equal(describe('event meeting-booked').text, 'när ett möte bokas');
  assert.equal(describe('event call-saved').text, 'när du sparar ett samtal');
});

check('Live view cards parse from the vault', () => {
  const objections = parseCards(vault.read('wiki/objections.md'));
  assert.equal(objections.length, 18);
  for (const c of objections) {
    assert.match(c.title, /^«.+»$/, c.title);
    for (const k of ['svar', 'kategori', 'källa']) assert.ok(c.fields[k], `${c.title} has no ${k}`);
  }
  const cards = parseCards(vault.read('wiki/product-cards.md'));
  for (const c of cards) assert.ok(['produkt', 'fråga', 'behov', 'fras', 'ord'].includes(c.fields.typ), `${c.title}: Typ ${c.fields.typ}`);
  assert.equal(cards.filter((c) => c.fields.typ === 'behov').length, 6);
  assert.ok(searchCards(objections, 'outlook').length >= 1);
  assert.ok(searchCards(cards, 'kreditt').some((c) => c.title === 'Kreditter forklart'));
});

check('call notes are saved per company and day, and listed back', () => {
  assert.equal(slugify('Havgløtt Hotell AS'), 'havglott-hotell-as');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aos-'));
  const v = new Vault(tmp);
  const first = v.saveCall('Havgløtt Hotell AS', '# Samtal 1');
  const again = v.saveCall('Havgløtt Hotell AS', '# Samtal 2');
  assert.equal(first, again);
  assert.match(v.read(first), /# Samtal 1\n\n---\n\n# Samtal 2/);
  v.saveCall('Annet AS', '# x');
  assert.deepEqual(v.calls('Havgløtt Hotell AS').map((c) => c.path), [first]);
  fs.rmSync(tmp, { recursive: true, force: true });
});

check('GDPR mode keeps company data and drops people', () => {
  assert.equal(privacyMode({}), 'company-only');
  assert.equal(privacyMode({ privacy: { mode: 'full' } }), 'full');
  assert.ok(isGenericEmail('post@fjellsport.no') && isGenericEmail('Kundeservice@firma.no'));
  assert.ok(!isGenericEmail('kari.nordmann@firma.no') && !isGenericEmail('post@'));
  const { fields, dropped } = scrubPersonal({ company: 'X AS', contact: 'Kari', email: 'kari@x.no', phone: '22 00 00 00' }, {});
  assert.deepEqual([fields.contact, fields.email, fields.phone], ['', '', '22 00 00 00']);
  assert.equal(dropped.length, 2);
  assert.equal(scrubPersonal({ contact: 'Kari' }, { privacy: { mode: 'full' } }).fields.contact, 'Kari');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aos-'));
  fs.cpSync(path.join(root, 'vault/system'), path.join(tmp, 'system'), { recursive: true });
  fs.cpSync(path.join(root, 'vault/ops'), path.join(tmp, 'ops'), { recursive: true });
  const v = new Vault(tmp);
  const added = v.addLead({ company: 'Test AS', contact: 'Ola', email: 'ola@test.no' });
  assert.equal(added.row.contact, '');
  assert.equal(added.row.email, '');
  assert.equal(v.updateLead(added.row.id, { email: 'post@test.no' }).row.email, 'post@test.no');
  fs.rmSync(tmp, { recursive: true, force: true });
});

check('the commit guard blocks customer data, not templates', () => {
  const empty = vault.read('ops/pipeline.md');
  assert.equal(parsePipeline(empty).rows.length, 0, 'the committed pipeline must be an empty template');
  assert.equal(blockReason('vault/ops/pipeline.md', () => empty), null);
  assert.ok(blockReason('vault/ops/pipeline.md', () => `${empty.trimEnd()}\n| L001 | Test AS |  |  |  |  |  |  | phone |  | researched |  |  |  |  |  |  |  |  |  |  |  |  |`));
  assert.ok(blockReason('vault/samtal/2026-10-29-test.md', () => ''));
  assert.ok(blockReason('vault/outputs/call-summary/x.md', () => ''));
  assert.equal(blockReason('vault/samtal/README.md', () => ''), null);
  assert.equal(blockReason('public/js/app.js', () => ''), null);
});

check('the payout answer follows the contract', () => {
  const st = computeStats([
    { id: 'L1', company: 'A', status: 'won', package: 'M', closed: '2026-11-10', activated: '2026-11-20' },
    { id: 'L2', company: 'B', status: 'won', package: 'S', closed: '2026-11-25' },
  ], { business: DRIV, today: '2026-11-28' });
  const a = answerRule('payout', { stats: st });
  assert.match(a, /10 000 SEK med lönen 25 december/);
  assert.match(a, /5 000 SEK för 1 affär väntar på aktivering/);
  assert.match(answerRule('payout', { stats: computeStats([], { business: DRIV, today: '2026-11-02' }) }), /förskott/);
});

// The register's JSON shape (Enhetsregisteret API), trimmed to the fields Jarvis reads.
const ENHETER = { _embedded: { enheter: [
  { organisasjonsnummer: '911111111', navn: 'FJORDKYST NETTBUTIKK AS', organisasjonsform: { kode: 'AS' }, naeringskode1: { kode: '47.910', beskrivelse: 'Detaljhandel via Internett' }, antallAnsatte: 14, hjemmeside: 'www.fjordkyst.no', epostadresse: 'post@fjordkyst.no', telefon: '55 00 00 01', forretningsadresse: { poststed: 'BERGEN', kommune: 'BERGEN' } },
  { organisasjonsnummer: '922222222', navn: 'Kari Nordmann', organisasjonsform: { kode: 'ENK' }, naeringskode1: { kode: '47.910' }, epostadresse: 'kari@nordmann.no' },
  { organisasjonsnummer: '933333333', navn: 'Gammel AS', organisasjonsform: { kode: 'AS' }, konkurs: true },
  { organisasjonsnummer: '944444444', navn: 'Vågen Sport AS', organisasjonsform: { kode: 'AS' }, epostadresse: 'ola.hansen@vagen.no', hjemmeside: 'https://vagen.no/' },
] }, page: { totalElements: 4, number: 0, totalPages: 1 } };

check('register search keeps companies, drops ENK, bankrupt and named addresses', async () => {
  const u = new URL(brregUrl({ industry: '47.910', municipality: '4601', min: 3, max: 200 }));
  assert.equal(u.searchParams.get('naeringskode'), '47.910');
  assert.equal(u.searchParams.get('kommunenummer'), '4601');
  assert.ok(!u.searchParams.get('organisasjonsform').includes('ENK'));
  const n = normalizeEnhet(ENHETER._embedded.enheter[0]);
  assert.deepEqual([n.name, n.city, n.website, n.email, n.employees], ['FJORDKYST NETTBUTIKK AS', 'Bergen', 'www.fjordkyst.no', 'post@fjordkyst.no', 14]);
  const r = await searchBrreg({ industry: '47.910' }, { existing: new Set(), fetchImpl: async () => ({ ok: true, json: async () => ENHETER }) });
  assert.deepEqual(r.results.map((x) => x.orgnr), ['911111111', '944444444']);
  assert.equal(r.results[1].email, ''); // ola.hansen@ is a person: never kept
  assert.deepEqual(r.skipped, { enk: 1, closed: 1, existing: 0, namedEmail: 1 });
});

check('website check finds chat widgets and generic mailboxes, and refuses the local network', async () => {
  const page = readPage('<script src="https://code.tidio.co/abc.js"></script><a href="mailto:post@x.no">post@x.no</a> kari@x.no <a href="/kontakt-oss">Kontakt oss</a>', 'https://x.no/');
  assert.deepEqual(page.chat, ['Tidio']);
  assert.deepEqual(page.generic, ['post@x.no']);
  assert.equal(page.contact, 'https://x.no/kontakt-oss');
  const lookup = async (host) => [{ address: host === 'intern.example' ? '192.168.1.10' : '93.184.216.34' }];
  await assert.rejects(assertPublicUrl('http://127.0.0.1:3217/api/state', lookup));
  await assert.rejects(assertPublicUrl('intern.example', lookup));
  await assert.rejects(assertPublicUrl('ftp://x.no', lookup));
  const pages = { 'https://x.no/': '<form><input type="email"></form><p>kontakt@x.no</p>' };
  const fetchImpl = async (u) => ({ ok: true, status: 200, headers: new Map(), text: async () => pages[String(u)] || '' });
  const site = await checkSite('x.no', { fetchImpl, lookup });
  assert.equal(site.hasChat, false);
  assert.match(site.observation, /Ingen chatt.*kontaktformulär.*kontakt@x\.no/);
});

check('one key per call outcome moves the pipeline and is logged', () => {
  assert.equal(addWorkdays('2026-11-06', 1), '2026-11-09'); // Friday -> Monday
  const fresh = { id: 'L1', company: 'A AS', status: 'researched', channel: 'email', notes: '' };
  assert.deepEqual(attemptFields('noanswer', fresh, '2026-11-06'), { channel: 'phone', status: 'contacted', next_action: 'Ring igen', next_date: '2026-11-09' });
  const meet = attemptFields('meeting', { ...fresh, status: 'contacted', contacted: '2026-11-02' }, '2026-11-06', { date: '2026-11-12' });
  assert.deepEqual([meet.status, meet.booked_via, meet.next_date, meet.channel], ['booked', 'phone', '2026-11-12', undefined]);
  assert.match(attemptFields('optout', fresh, '2026-11-06').notes, /opt-out/);
  const line = callLine({ date: '2026-11-06', time: '09:14', id: 'L1', company: 'A | B AS', outcome: 'noanswer', note: '' });
  assert.equal(parseCalls(`# x\n${line}`)[0].company, 'A | B AS');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aos-'));
  fs.cpSync(path.join(root, 'vault/system'), path.join(tmp, 'system'), { recursive: true });
  fs.cpSync(path.join(root, 'vault/ops'), path.join(tmp, 'ops'), { recursive: true });
  const v = new Vault(tmp);
  const { row } = v.addLead({ company: 'Ring AS', phone: '22 00 00 00' });
  const res = v.logAttempt({ id: row.id, outcome: 'gatekeeper' });
  assert.equal(res.row.status, 'contacted');
  assert.equal(res.row.channel, 'phone');
  assert.equal(v.attempts().length, 1);
  assert.equal(v.callSummary().today.attempts, 1);
  fs.rmSync(tmp, { recursive: true, force: true });
});

check('the call queue puts due call-backs first and waits after a call today', () => {
  const rows = [
    { id: 'L1', company: 'New', status: 'researched', phone: '1', added: '2026-11-01' },
    { id: 'L2', company: 'Back', status: 'contacted', phone: '2', contacted: '2026-11-03', channel: 'phone', next_date: '2026-11-05', next_action: 'Ring igen' },
    { id: 'L3', company: 'Mail', status: 'contacted', phone: '3', contacted: '2026-11-02', channel: 'email', next_date: '2026-11-06', next_action: 'Uppföljning 1' },
    { id: 'L4', company: 'NoPhone', status: 'researched', phone: '' },
    { id: 'L5', company: 'Done', status: 'lost', phone: '5' },
    { id: 'L6', company: 'Today', status: 'researched', phone: '6' },
    { id: 'L7', company: 'Stop', status: 'contacted', phone: '7', next_date: '2026-11-05', next_action: 'Ring igen', notes: 'opt-out' },
  ];
  const q = callQueue(rows, { L6: [{ date: '2026-11-06', time: '09:00', outcome: 'noanswer' }] }, '2026-11-06');
  assert.deepEqual(q.map((x) => x.r.id), ['L2', 'L3', 'L1']);
  assert.equal(q[1].why, 'Efter mejlet');
  const many = Array.from({ length: 40 }, (_, i) => ({ date: '2026-11-05', time: i % 2 ? '09:10' : '12:10', id: 'L1', outcome: i % 2 ? 'callback' : 'noanswer' }));
  const st = callStats(many, '2026-11-06');
  assert.equal(st.total, 40);
  assert.equal(st.best[0], 9);
});

check('tier 1 answers come from saved data', () => {
  const a = answerRule('priorities', { directives: [{ text: 'Ship it', done: false }] });
  assert.match(a, /Ship it/);
});

await Promise.all(pending);
console.log(`\n${passed} checks passed`);
