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
  'how many followers do I have': 'rule:vitals',
  'explain CPM in one line': 'quick',
  'plan my day': 'skill:plan-today',
  "turn yesterday's hoodie video into posts for instagram": 'skill:content-cascade',
  'write 10 hooks for a hoodie drop': 'skill:hook-lab',
  'plan a winter drop with two pieces': 'skill:drop-plan',
  'is heated gloves worth dropshipping': 'skill:product-research',
  'research the streetwear market in sweden': 'skill:deep-research',
  'check my inbox': 'skill:inbox-brief',
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

check('tier 1 answers come from saved data', () => {
  const a = answerRule('priorities', { directives: [{ text: 'Ship it', done: false }] });
  assert.match(a, /Ship it/);
});

console.log(`\n${passed} checks passed`);
