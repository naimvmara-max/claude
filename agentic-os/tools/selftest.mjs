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
import { parsePipeline, renderPipeline, computeStats, applyStatus } from '../public/js/pipeline.js';
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
  "what's my reply rate": 'rule:numbers',
  'who should I follow up with today?': 'rule:followups',
  'explain DMARC in one line': 'quick',
  'plan my day': 'skill:plan-today',
  'find 10 leads: accounting firms in Malmö': 'skill:lead-research',
  'write cold emails for the new leads': 'skill:outreach-drafts',
  'draft the follow-ups': 'skill:follow-ups',
  'check my inbox': 'skill:inbox-brief',
  'sync my pipeline with gmail': 'skill:sync-pipeline',
  'prep for my call with Nordic Dental': 'skill:call-prep',
  'write a proposal for Solberg': 'skill:proposal',
  'research the market for bookkeeping software in sweden': 'skill:deep-research',
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

check('stats are counted from the rows', () => {
  const today = '2026-10-14'; // a Wednesday
  const rows = [
    { id: 'L1', company: 'A', status: 'contacted', contacted: '2026-10-13' },
    { id: 'L2', company: 'B', status: 'replied', contacted: '2026-10-12', replied: '2026-10-13' },
    { id: 'L3', company: 'C', status: 'won', contacted: '2026-09-20', replied: '2026-09-22', call: '2026-10-02', closed: '2026-10-05', value: '500' },
    { id: 'L4', company: 'D', status: 'contacted', contacted: '2026-10-09' },
  ];
  const st = computeStats(rows, { goal: 2000, today });
  assert.equal(st.sentWeek, 2);
  assert.equal(st.sentPrevWeek, 1);
  assert.equal(st.mrr, 500);
  assert.equal(st.goal.pct, 25);
  assert.equal(st.callsMonth, 1);
  assert.equal(st.replyRate, 2 / 4);
  assert.deepEqual(st.followups.map((f) => f.company), ['D']); // contacted 5 days ago, no reply, no next_date
});

check('moving a lead to call stamps the earlier stages', () => {
  const row = applyStatus({ status: 'researched' }, 'call', '2026-10-14');
  assert.equal(row.call, '2026-10-14');
  assert.equal(row.contacted, '2026-10-14');
});

check('tier 1 answers come from saved data', () => {
  const a = answerRule('priorities', { directives: [{ text: 'Ship it', done: false }] });
  assert.match(a, /Ship it/);
});

console.log(`\n${passed} checks passed`);
