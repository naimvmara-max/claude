// Fast checks with no network and no model calls:  npm run check

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify } from '../public/js/classify.js';
import { answerRule } from '../public/js/rules.js';
import { parseSchedule, lastDue, describe } from '../lib/scheduler.js';
import { H, Vault } from '../lib/vault.js';
import { parsePipeline, renderPipeline, computeStats, applyStatus, goalMath, creditPlan } from '../public/js/pipeline.js';
import { loadSkills } from '../lib/skills.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vault = new Vault(path.join(root, 'vault'));
const { skills } = loadSkills(vault);
let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`  ok  ${name}`); };

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
  'har jag fått betalt för Fjellsport?': 'skill:commission-check',
  'undersök marknaden för treningssentre i norge': 'skill:deep-research',
  'hej': 'quick',
  // English still works.
  'how am I doing?': 'rule:numbers',
  'am I on pace?': 'rule:pace',
  'find 10 leads: nettbutikker i Bergen': 'skill:lead-research',
  'prep for my demo with Havgløtt Hotell': 'skill:demo-prep',
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

check('offers are a stage, and late commission is flagged', () => {
  const row = applyStatus({ status: 'demo', demo: '2026-10-10' }, 'offer', '2026-10-11');
  assert.equal(row.offer, '2026-10-11');
  assert.equal(row.next_action, 'Följ upp offerten');
  assert.equal(applyStatus({ status: 'demo' }, 'proposal', '2026-10-11').status, 'offer'); // old name
  const st = computeStats([
    { id: 'L1', company: 'A', status: 'won', package: 'M', closed: '2026-08-20' }, // due with September salary: late
    { id: 'L2', company: 'B', status: 'won', package: 'S', closed: '2026-09-20' }, // due with October salary
    { id: 'L3', company: 'C', status: 'won', package: 'L', closed: '2026-10-05' }, // due next month
  ], { business: DRIV, today: '2026-10-14' });
  assert.equal(st.overdueUnpaid, 10000);
  assert.equal(st.unpaid, 35000);
  assert.equal(st.payoutNextMonth, 20000);
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
});

check('tier 1 answers come from saved data', () => {
  const a = answerRule('priorities', { directives: [{ text: 'Ship it', done: false }] });
  assert.match(a, /Ship it/);
});

console.log(`\n${passed} checks passed`);
