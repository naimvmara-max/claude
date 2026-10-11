// Demo mode: the HUD running with no Bridge behind it (the published preview, or a
// browser opened while the server is down). Everything here is example data and
// every simulated run says so.

import { classify } from './classify.js';
import { answerRule } from './rules.js';
import { computeStats, COLUMNS } from './pipeline.js';

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
  if ((m = s.match(/^weekdays (\d{1,2}:\d{2})$/))) return { icon: 'clock', text: `weekdays ${m[1]}` };
  if ((m = s.match(/^weekly (\w{3}) (\d{1,2}:\d{2})$/))) { const d = DAYS.indexOf(m[1]); return { icon: 'clock', text: `${DAYS[d][0].toUpperCase()}${DAYS[d].slice(1)}days ${m[2]}` }; }
  if ((m = s.match(/^monthly (\d{1,2})/))) return { icon: 'clock', text: m[1] === '1' ? '1st of the month' : `day ${m[1]} of the month` };
  if ((m = s.match(/^event (.+)$/))) return { icon: 'bolt', text: m[1].replace(/-/g, ' ') };
  return { icon: 'hand', text: 'manual, you check it' };
}

// Example leads, spread over the last 8 weeks so every chart has a shape. Fictional.
const EXAMPLE_LEADS = [
  // [company, contact, niche, city, status, value, addedAgo, contactedAgo, repliedAgo, callAgo, proposalAgo, closedAgo, nextIn, nextAction, note]
  ['Nordic Dental AB', 'Anna Berg', 'dental clinics', 'Malmö', 'won', 600, 52, 50, 47, 44, 41, 36, null, 'Monthly report', 'Signed 6-month plan'],
  ['Lindqvist Redovisning', 'Erik Lindqvist', 'accounting', 'Lund', 'won', 450, 40, 38, 35, 30, 26, 21, null, 'Onboarding', 'Intro price for a testimonial'],
  ['Bergström Bygg AB', 'Johan Bergström', 'construction', 'Malmö', 'proposal', 700, 30, 28, 24, 18, 4, null, -1, 'Follow up on proposal', 'Wants case study first'],
  ['Solberg Fastighet', 'Maria Solberg', 'real estate', 'Helsingborg', 'call', 550, 22, 20, 15, 1, null, null, 1, 'Call', 'Asked about pricing'],
  ['Kvarnen Café Group', 'Sara Holm', 'hospitality', 'Malmö', 'replied', 400, 16, 14, 2, null, null, null, 0, 'Reply and offer call times', 'positive'],
  ['Öresund Fysio', 'David Ek', 'physiotherapy', 'Malmö', 'replied', 350, 12, 10, 1, null, null, null, 0, 'Reply and offer call times', 'question'],
  ['Hansson Advokatbyrå', 'Lena Hansson', 'law firms', 'Lund', 'contacted', 500, 9, 7, null, null, null, null, 0, 'Send follow-up 2', ''],
  ['Skåne Elteknik', 'Ali Karimi', 'electricians', 'Malmö', 'contacted', 400, 7, 5, null, null, null, null, -2, 'Send follow-up 1', ''],
  ['Vikström Arkitekter', 'Nils Vikström', 'architects', 'Malmö', 'contacted', 600, 6, 4, null, null, null, null, null, '', ''],
  ['Granit Revision', 'Oskar Nyberg', 'accounting', 'Lund', 'contacted', 450, 5, 3, null, null, null, null, null, '', ''],
  ['Lilla Kliniken', 'Emma Persson', 'dental clinics', 'Malmö', 'contacted', 500, 4, 2, null, null, null, null, 1, 'Send follow-up 1', ''],
  ['Ljung Måleri', 'Peter Ljung', 'construction', 'Ystad', 'contacted', 300, 3, 1, null, null, null, null, 2, 'Send follow-up 1', ''],
  ['Nova Tandvård', 'Karin Ali', 'dental clinics', 'Lund', 'contacted', 500, 2, 0, null, null, null, null, 3, 'Send follow-up 1', ''],
  ['Brf Utsikten', 'Jonas Ström', 'real estate', 'Malmö', 'lost', 400, 35, 33, 30, null, null, 30, null, '', 'not interested'],
  ['Ekdahl Konsult', 'Mia Ekdahl', 'consulting', 'Malmö', 'drafted', 450, 1, null, null, null, null, null, 0, 'Send first email', ''],
  ['Strand Optik', 'Henrik Strand', 'retail', 'Malmö', 'drafted', 350, 1, null, null, null, null, null, 0, 'Send first email', ''],
  ['Ahlgren Bilvård', 'Fatima Ahlgren', 'automotive', 'Lund', 'researched', 300, 0, null, null, null, null, null, null, 'Draft first email', 'New second location opened'],
  ['Mårtensson Revision', 'Lars Mårtensson', 'accounting', 'Malmö', 'researched', 450, 0, null, null, null, null, null, null, 'Draft first email', 'Hiring two accountants'],
];

function exampleLeads(now) {
  const day = (offset) => {
    if (offset == null) return '';
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const leads = EXAMPLE_LEADS.map((l, i) => {
    const [company, contact, niche, city, status, value, added, contacted, replied, call, proposal, closed, nextIn, nextAction, notes] = l;
    const row = Object.fromEntries(COLUMNS.map((c) => [c, '']));
    const slug = company.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '');
    return Object.assign(row, {
      id: `L${String(i + 1).padStart(3, '0')}`, company, contact, niche, city, status, value: String(value),
      email: `${contact.split(' ')[0].toLowerCase()}@example.com`, website: `${slug.slice(0, 18)}.example`,
      added: day(added), contacted: day(contacted), replied: day(replied), call: day(call), proposal: day(proposal), closed: day(closed),
      next_date: nextIn == null ? '' : day(-nextIn), next_action: nextAction, notes,
    });
  });
  // Older sends so the weekly charts have history: 6 earlier weeks of first emails, a few replies.
  const weekly = [14, 18, 22, 25, 20, 27];
  let n = leads.length;
  weekly.forEach((count, w) => {
    for (let k = 0; k < count; k += 1) {
      n += 1;
      const ago = 49 - w * 7 - (k % 5);
      const replied = k % 11 === 0;
      const row = Object.fromEntries(COLUMNS.map((c) => [c, '']));
      // No reply after the day-14 breakup means lost; a few said "not now".
      Object.assign(row, {
        id: `L${String(n).padStart(3, '0')}`, company: `Example lead ${n}`, status: 'lost', value: '400',
        added: day(ago + 2), contacted: day(ago), replied: replied ? day(ago - 3) : '', closed: day(Math.max(0, ago - (replied ? 3 : 21))),
        notes: replied ? 'not now' : 'no reply after breakup',
      });
      leads.push(row);
    }
  });
  return leads;
}

export function demoState() {
  const bb = BACKBONE || FALLBACK;
  const now = new Date();
  const skills = bb.skills.map((s) => ({
    description: '',
    label: s.label || s.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    ...s,
    when: when(s.schedule),
  }));
  const business = { currency: 'EUR', goal_mrr: 3000, daily_sends: 20, avg_deal: 500 };
  const leads = exampleLeads(now);
  return {
    name: 'JARVIS',
    owner: 'Naim',
    tagline: 'Your outreach command center',
    now: now.toISOString(),
    mode: 'demo',
    engine: 'claude',
    engines: {
      claude: { label: 'Claude Code', core: 'CLAUDE', available: true, version: 'demo', week: { runs: 7, costUsd: 0, pct: 0 } },
      codex: { label: 'Codex', core: 'CODEX', available: true, version: 'demo', week: { runs: 0, costUsd: 0, pct: 0 } },
    },
    business,
    leads,
    stats: computeStats(leads, { goal: business.goal_mrr, dailyTarget: business.daily_sends, currency: business.currency }),
    directives: [
      { text: 'Send 20 first emails to accounting firms in Lund', done: false, file: 'demo', line: 1 },
      { text: 'Answer both replies and book the calls', done: false, file: 'demo', line: 2 },
      { text: 'Send the Bergström proposal follow-up', done: true, file: 'demo', line: 3 },
    ],
    schedule: [
      { time: '07:00', text: 'Plan the day, review follow-ups due' },
      { time: '08:00', text: 'Gym' },
      { time: '09:30', text: 'Outreach: send 20 drafted emails + follow-ups' },
      { time: '11:00', text: 'Prospecting: research tomorrow\'s leads' },
      { time: '13:00', text: 'Replies: Kvarnen Café, Öresund Fysio' },
      { time: '14:00', text: 'Call: Solberg Fastighet' },
      { time: '16:00', text: 'Deep work: rewrite the first-email template' },
      { time: '21:30', text: '/close-day' },
    ],
    tasks: [
      { text: 'Send today\'s drafted emails and every follow-up that is due', done: false, file: 'demo', line: 4 },
      { text: 'Set up DMARC on the sending domain', done: false, file: 'demo', line: 5 },
      { text: 'Write the case study from Nordic Dental', done: false, file: 'demo', line: 6 },
      { text: 'Connect Gmail to Claude Code', done: true, file: 'demo', line: 7 },
    ],
    brief: {
      path: 'demo',
      title: 'Example brief',
      bullets: [
        'TypeSafe AI released Jev (Sep 15) in early access, a decision model that returns one of your predefined choices instead of text → the same idea as this OS\'s router; it could also sort replies into positive / not now / no. Sources: theregister.com, mindstudio.ai',
        'Claude Haiku 5.5 lists at $0.10 per million input tokens and $0.50 per million output tokens on Anthropic\'s API → classifying every reply costs a fraction of a cent',
        'Today\'s opener: "saw you just opened a second location" works better than any template line. /lead-research collects one real observation per lead for this.',
      ],
    },
    outputs: [
      { path: 'demo/outreach-drafts', name: 'today', folder: 'outreach-drafts', mtime: Date.now() - 3 * 36e5 },
      { path: 'demo/call-prep', name: 'solberg-fastighet', folder: 'call-prep', mtime: Date.now() - 864e5 },
      { path: 'demo/lead-research', name: 'accounting-lund', folder: 'lead-research', mtime: Date.now() - 2 * 864e5 },
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
  'demo/outreach-drafts': '# Outreach drafts (example)\n\nThis is what an /outreach-drafts batch looks like. In the real OS it is written into outputs/outreach-drafts/ and, with Gmail connected, saved as Gmail drafts.\n\n## Ekdahl Konsult · mia@example.com\n**Subject:** your new office\n\nHi Mia,\n\nsaw that Ekdahl Konsult just moved into a bigger office in Malmö, congrats.\n\nMost consultancies at that stage get new clients through referrals only, which makes growth lumpy. I set up cold email that books meetings with the right companies every week.\n\nWorth a quick chat?\n\nNaim\n\n_Not relevant? Reply "no" and I won\'t write again._',
  'demo/call-prep': '# Call prep: Solberg Fastighet (example)\n\n## Their situation\n- 3 offices, growing in Helsingborg\n- New listings come mostly from referrals\n\n## Questions\n1. Where do new property owners find you today?\n2. What is one new management contract worth per year?\n\n## Next step to ask for\n- A 2-week test on one segment',
  'demo/lead-research': '# Leads: accounting firms in Lund (example)\n\n## Mårtensson Revision\n- Hiring two accountants (careers page)\n- Opener: growth through hiring means capacity for new clients\n- Fit 4/5',
};

export function demoFile(path) {
  return DEMO_FILES[path] || '# Example\n\nIn the live OS this opens the report from your vault.';
}

const QUICK = [
  [/reply rate|response rate/i, 'There is no honest universal number: it depends on the list, the offer and deliverability. Low single-digit percentages are common for cold email. Your own rate after a few hundred sends is the number to trust, and the dashboard shows it.'],
  [/subject/i, 'Short, lowercase, and specific to them: two to four words like "your new office" or "question about lund". It should look like a colleague wrote it, not a newsletter.'],
  [/spf|dkim|dmarc|deliverab/i, 'SPF says which servers may send for your domain, DKIM signs each email, DMARC tells receivers what to do if those checks fail. Set all three on a separate sending domain before you send any volume.'],
];

export function demoQuick(text) {
  for (const [re, answer] of QUICK) if (re.test(text)) return answer;
  return 'Demo answer. In the live OS this goes to Claude Haiku 5.5 through Claude Code on your subscription and comes back in a few seconds.';
}

const STEPS = {
  default: ['→ Read ops/directives.md', '→ Read ops/pipeline.md'],
  'lead-research': ['→ Read projects/outreach-business.md', '→ Read ops/pipeline.md', '→ WebSearch accounting firms Lund', '→ WebFetch company website', '→ Edit ops/pipeline.md', '→ Write outputs/lead-research/today.md'],
  'outreach-drafts': ['→ Read wiki/outreach-playbook.md', '→ Read ops/pipeline.md', '→ create_draft (Gmail)', '→ Edit ops/pipeline.md', '→ Write outputs/outreach-drafts/today.md'],
  'follow-ups': ['→ Read ops/pipeline.md', '→ search_threads (Gmail)', '→ create_draft (Gmail, reply in thread)', '→ Edit ops/pipeline.md'],
  'inbox-brief': ['→ search_threads unread (Gmail)', '→ Read ops/pipeline.md', '→ Edit ops/pipeline.md', '→ Write outputs/inbox-brief/today.md'],
  'plan-today': ['→ Read ops/directives.md', '→ Read ops/pipeline.md', '→ list_events today', '→ Edit daily-notes/today.md'],
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
