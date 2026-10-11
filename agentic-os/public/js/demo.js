// Demo mode: the HUD running with no Bridge behind it (the published preview, or a
// browser opened while the server is down). Everything here is example data and
// every simulated run says so.

import { classify } from './classify.js';
import { answerRule } from './rules.js';

// tools/build-demo.mjs replaces this with system/backbone.json.
const BACKBONE = /*__BACKBONE__*/ null;

const FALLBACK = {
  rules: [
    { title: 'Done it by hand twice', then: 'make it a skill' },
    { title: 'Skill works 5 times in a row', then: 'automate it' },
    { title: 'It sends, spends or publishes', then: 'keep it manual' },
  ],
  domains: [{ id: 'productivity', label: 'Productivity' }],
  skills: [{ name: 'plan-today', domain: 'productivity', task: 'Plan my day', does: 'calendar + plan', connectors: ['Calendar'], schedule: 'daily 07:00', quick: true, label: 'Plan Today', triggers: ['plan my day'] }],
};

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
function when(spec) {
  const s = String(spec || 'manual');
  let m;
  if ((m = s.match(/^daily (\d{1,2}:\d{2})$/))) return { icon: 'clock', text: `daily ${m[1]}` };
  if ((m = s.match(/^weekly (\w{3}) (\d{1,2}:\d{2})$/))) { const d = DAYS.indexOf(m[1]); return { icon: 'clock', text: `${DAYS[d][0].toUpperCase()}${DAYS[d].slice(1)}days ${m[2]}` }; }
  if ((m = s.match(/^monthly (\d{1,2})/))) return { icon: 'clock', text: m[1] === '1' ? '1st of the month' : `day ${m[1]} of the month` };
  if ((m = s.match(/^event (.+)$/))) return { icon: 'bolt', text: m[1].replace(/-/g, ' ') };
  return { icon: 'hand', text: 'manual, you check it' };
}

export function demoState() {
  const bb = BACKBONE || FALLBACK;
  const now = new Date();
  const day = (offset) => { const d = new Date(now); d.setDate(d.getDate() - offset); return d.toISOString().slice(0, 10); };
  const hist = (vals) => vals.map((v, i) => ({ t: day((vals.length - 1 - i) * 7), v }));
  const skills = bb.skills.map((s) => ({
    description: '',
    label: s.label || s.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    ...s,
    when: when(s.schedule),
  }));
  return {
    name: 'JARVIS',
    owner: 'Naim',
    tagline: 'Your command center, reimagined',
    now: now.toISOString(),
    mode: 'demo',
    engine: 'claude',
    engines: {
      claude: { label: 'Claude Code', core: 'CLAUDE', available: true, version: 'demo', week: { runs: 7, costUsd: 3.2, pct: 8 } },
      codex: { label: 'Codex', core: 'CODEX', available: true, version: 'demo', week: { runs: 2, costUsd: 0, pct: 24 } },
    },
    budgetUsd: 40,
    vitals: {
      example: true,
      metrics: {
        tiktok: { label: 'TikTok followers', short: 'TikTok', value: 1240, unit: '/wk', history: hist([610, 702, 880, 1015, 1240]) },
        instagram: { label: 'Instagram followers', short: 'Instagram', value: 860, unit: '/wk', history: hist([702, 731, 770, 812, 860]) },
        revenue: { label: 'Store revenue (30 days)', short: 'Revenue 30d', value: 0, prefix: '€', unit: '/30d', history: hist([0, 0, 0, 0, 0]) },
        latest: { label: 'Latest video views', short: 'Latest video', value: 4300, unit: '/day', history: [0, 1900, 3100, 3800, 4300].map((v, i) => ({ t: day(4 - i), v })) },
      },
      latest_post: { platform: 'TikTok', title: 'Designing a hoodie with AI in 60 seconds', views: 4300, likes: 312, comments: 27, posted: day(3) },
    },
    directives: [
      { text: 'Send 10 personalised outreach messages to local brands', done: false, file: 'demo', line: 1 },
      { text: 'Finish the brand name shortlist and check handles', done: false, file: 'demo', line: 2 },
      { text: 'Film and post day 12 of the build-in-public series', done: true, file: 'demo', line: 3 },
    ],
    schedule: [
      { time: '07:00', text: 'Plan the day, review directives' },
      { time: '08:00', text: 'Gym' },
      { time: '09:30', text: 'Deep work: one-page offer for local brands' },
      { time: '12:30', text: 'Film: AI hoodie mockups vs. real sample' },
      { time: '14:00', text: 'Edit and schedule today\'s post' },
      { time: '16:00', text: 'Outreach: 10 messages' },
      { time: '17:30', text: 'Reply to every comment and DM' },
      { time: '21:30', text: '/close-day' },
    ],
    tasks: [
      { text: 'Post today\'s video and log it', done: false, file: 'demo', line: 4 },
      { text: 'Write the one-page offer', done: false, file: 'demo', line: 5 },
      { text: 'Build a list of 50 local brands', done: false, file: 'demo', line: 6 },
      { text: '3 test mockups in Higgsfield', done: false, file: 'demo', line: 7 },
      { text: 'Install Claude Code and run the OS once', done: true, file: 'demo', line: 8 },
    ],
    brief: {
      path: 'demo',
      title: 'Example brief',
      bullets: [
        'TypeSafe AI released Jev (Sep 15) in early access, a decision model that returns one of your predefined choices instead of text → the same idea as this OS\'s router. Sources: theregister.com, mindstudio.ai',
        'Vercel added Jev to its AI Gateway the day after launch, according to secondary coverage → routers like Tier sorting are getting cheap enough to run on every message',
        'Claude Haiku 5.5 lists at $0.10 per million input tokens and $0.50 per million output tokens on Anthropic\'s API → a Tier 2 answer costs a fraction of a cent',
        'Today\'s angle: "I built Jarvis to run my clothing brand" — film the HUD and the skill backbone',
      ],
    },
    outputs: [
      { path: 'demo/drop-plan', name: '2026-10-09-winter-capsule', folder: 'drop-plan', mtime: Date.now() - 2 * 864e5 },
      { path: 'demo/lead-research', name: '2026-10-10', folder: 'lead-research', mtime: Date.now() - 864e5 },
      { path: 'demo/hook-lab', name: '2026-10-11-ai-hoodie', folder: 'hook-lab', mtime: Date.now() - 3 * 36e5 },
    ],
    todayNote: `daily-notes/${now.toISOString().slice(0, 10)}.md`,
    skills,
    domains: bb.domains,
    rules: bb.rules,
    automations: {},
    jobs: [],
  };
}

const DEMO_FILES = {
  'demo/drop-plan': '# Drop plan: winter capsule (example)\n\nThis is what a /drop-plan report looks like. In the real OS it is written by Claude Code into outputs/drop-plan/.\n\n## Concept\n- "Night Shift": heavyweight black hoodie, bone tee, one beanie\n\n## Unit economics (estimate)\n| Piece | Cost | Price | Margin |\n| --- | --- | --- | --- |\n| Hoodie (POD) | €31 | €59 | €28 (47%) |\n\n## Go / no-go\n- 150 waitlist sign-ups before ordering samples',
  'demo/lead-research': '# Leads 2026-10-10 (example)\n\n## Café Nord\n- Last Reel 9 weeks ago, strong photos, no video\n- Idea: a 20-second "first coffee of the day" series\n- Opener: "Your latte art photos are the best on your street. Have you tried them as 15-second Reels?"\n- Fit 4/5',
  'demo/hook-lab': '# Hooks: AI hoodie (example)\n\n1. I designed this hoodie with AI in 4 prompts\n2. Prompt vs. real sample. Did it survive?\n3. POV: you\'re 24 and building a clothing brand with AI\n4. I lost €120 on my first sample. Here\'s why',
};

export function demoFile(path) {
  return DEMO_FILES[path] || '# Example\n\nIn the live OS this opens the report from your vault.';
}

const QUICK = [
  [/cpm/i, 'CPM is cost per thousand impressions: what you pay for 1,000 ad views. Lower is cheaper reach, but it says nothing about whether anyone bought.'],
  [/caption|hashtag/i, 'Lead with the hook, add one line of value, end with a question. Three to five niche hashtags beat thirty generic ones. For bigger batches use /hook-lab.'],
  [/price|pricing/i, 'Start from cost: blank, print, shipping and fees, then aim for at least a 45 to 50 percent margin. If that price feels too high for your audience, change the blank, not the margin. /drop-plan does the full maths.'],
];

export function demoQuick(text) {
  for (const [re, answer] of QUICK) if (re.test(text)) return answer;
  return 'Demo answer. In the live OS this goes to Claude Haiku 5.5 through the API, or to Claude Code with --model haiku, and comes back in a second or two.';
}

const STEPS = {
  default: ['→ Read ops/directives.md', '→ Read daily-notes/today.md'],
  'plan-today': ['→ Read ops/directives.md', '→ Read system/routine.md', '→ list_events today', '→ Edit daily-notes/today.md'],
  'morning-intel': ['→ Read outputs/morning-intel/ (yesterday)', '→ WebSearch AI tools news last 24h', '→ WebSearch TikTok Instagram update', '→ WebFetch source', '→ Write outputs/morning-intel/today.md'],
  'content-cascade': ['→ Read wiki/brand-bible.md', '→ Read wiki/content-playbook.md', '→ Write content/cascades/today-ai-hoodie.md', '→ Edit content/posting-log.md'],
  'drop-plan': ['→ Read wiki/brand-bible.md', '→ WebSearch heavyweight hoodie blank price EU', '→ WebFetch supplier page', '→ Write outputs/drop-plan/today-winter-capsule.md'],
};

export const demoStopped = new Set();

/** A simulated Tier 3 run that streams believable steps and says it is a demo. */
export function demoRun(job, emit) {
  const steps = [
    { kind: 'sys', text: `$ claude (skill ${job.skill || 'prompt'}) · cwd vault/  [DEMO, nothing runs]` },
    { kind: 'sys', text: 'session 4f2a91c0 · model default' },
    { kind: 'tool', text: `→ Read .claude/skills/${job.skill || 'none'}/SKILL.md` },
    ...(STEPS[job.skill] || STEPS.default).map((t) => ({ kind: 'tool', text: t })),
    { kind: 'out', text: 'Done. The report is saved in the vault.' },
    { kind: 'sys', text: 'finished · 6 turns · 41s · demo' },
    { kind: 'sys', text: 'This was a demo run. Start the Bridge locally (npm start) for real runs.' },
  ];
  let i = 0;
  const tick = () => {
    if (demoStopped.has(job.id)) return;
    if (i < steps.length) {
      emit({ type: 'log', id: job.id, entry: { t: Date.now(), ...steps[i] } });
      i += 1;
      setTimeout(tick, 380 + Math.random() * 520);
    } else {
      emit({ type: 'end', job: { ...job, status: 'done', endedAt: Date.now(), savedTo: null } });
    }
  };
  setTimeout(tick, 250);
}

export function demoAsk(text, state, force) {
  const r = classify(text, { skills: state.skills, minConfidence: 0.45 });
  r.classifier = 'local';
  if (force) {
    const f = r.choices.find((c) => c.id === force);
    if (f) { r.pick = { ...f }; r.reason = 'you picked this route'; r.unsure = false; }
  }
  const { pick } = r;
  if (pick.tier === 1) return { route: r, tier: 1, answer: answerRule(pick.id.slice(5), state) };
  if (pick.tier === 2) return { route: r, tier: 2, answer: demoQuick(text), backend: 'demo' };
  const skill = pick.id.slice(6);
  return { route: r, tier: 3, skill, answer: `On it. Running /${skill} in ${state.engines[state.engine].label}. In the demo the run is simulated in the terminal below.` };
}
