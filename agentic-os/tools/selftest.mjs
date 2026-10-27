// Fast checks with no network and no model calls:  npm run check

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify } from '../public/js/classify.js';
import { answerRule } from '../public/js/rules.js';
import { parseSchedule, lastDue } from '../lib/scheduler.js';
import { Vault } from '../lib/vault.js';
import { parsePipeline, renderPipeline, computeStats, applyStatus, goalMath } from '../public/js/pipeline.js';
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
  'what are my priorities?': 'rule:priorities',
  "what's on today": 'rule:schedule',
  'how am I doing?': 'rule:numbers',
  'how much commission have I earned?': 'rule:numbers',
  'hur går det?': 'rule:numbers',
  'am I on pace?': 'rule:pace',
  'how many contacts do I need to hit my goal?': 'rule:pace',
  'who should I follow up with today?': 'rule:followups',
  'explain DMARC in one line': 'quick',
  'how do I answer "we already have a chatbot"?': 'quick',
  'plan my day': 'skill:plan-today',
  'find 10 leads: nettbutikker i Bergen': 'skill:lead-research',
  'write cold emails for the new leads': 'skill:outreach-drafts',
  'skriv mejl till nya leads': 'skill:outreach-drafts',
  'who should I call today?': 'skill:call-list',
  'ringlistan för idag': 'skill:call-list',
  'draft the follow-ups': 'skill:follow-ups',
  'check my inbox': 'skill:inbox-brief',
  'sync my pipeline with gmail': 'skill:sync-pipeline',
  'prep for my demo with Havgløtt Hotell': 'skill:demo-prep',
  'write the offer for Nordlys Sykkel': 'skill:offer',
  'collect the objections from this week': 'skill:objections',
  'have I been paid for Fjellsport?': 'skill:commission-check',
  'research the market for gyms in norway': 'skill:deep-research',
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
  const items = vault.listItems('ops/tasks.md', 'open');
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
  assert.deepEqual(st.followups.map((f) => [f.company, f.action]), [['D', 'Call again']]); // phone: due after 2 days
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
  assert.match(answerRule('numbers', { stats: st, business: BIZ }), /1 deal of your 4 \(1 Large\), 20,000 NOK/);
  assert.match(answerRule('pace', { stats: st, business: BIZ }), /3 more deals to reach 4/);
});

check('tier 1 answers come from saved data', () => {
  const a = answerRule('priorities', { directives: [{ text: 'Ship it', done: false }] });
  assert.match(a, /Ship it/);
});

console.log(`\n${passed} checks passed`);
