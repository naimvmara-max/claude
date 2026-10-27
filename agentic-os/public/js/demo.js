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
    { title: 'It sends, calls or spends', then: 'keep it manual' },
  ],
  domains: [{ id: 'productivity', label: 'Productivity' }],
  skills: [{ name: 'plan-today', domain: 'productivity', task: 'Plan my day', does: 'pace + plan', connectors: ['Calendar'], schedule: 'weekdays 07:00', quick: true, label: 'Plan Today', triggers: ['plan my day'] }],
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

// The same targets as vault/system/business.json.
const BUSINESS = {
  role: 'Sales rep, AI customer service for companies in Norway, commission only',
  currency: 'NOK',
  sek_per_nok: 0.95,
  goal_deals_month: 4,
  daily_contacts: 60,
  packages: { S: { name: 'Small', commission: 5000 }, M: { name: 'Medium', commission: 10000 }, L: { name: 'Large', commission: 20000 } },
  default_package: 'M',
  assumptions: { book_rate: 2, show_rate: 80, close_rate: 10 },
  confirmed: false,
  email_language: 'nb',
};

// Example companies, spread over the last 8 weeks so every chart has a shape. Fictional.
const EXAMPLE_LEADS = [
  // [company, contact, industry, city, channel, package, status, addedAgo, contactedAgo, repliedAgo, bookedAgo, demoAgo, closedAgo, paidAgo, nextIn, nextAction, note]
  ['Fjellsport Nett AS', 'Ingrid Haugen', 'online shop', 'Bergen', 'email', 'L', 'won', 30, 28, 26, 25, 20, 6, null, null, 'Hand over to onboarding', 'Was hiring 2 for kundeservice; about 400 order questions a week'],
  ['Solheim Tannklinikk', 'Marte Solheim', 'dental clinic', 'Oslo', 'phone', 'M', 'won', 26, 24, null, 24, 15, 3, null, null, 'Hand over to onboarding', 'Phone only open 08:00 to 15:00'],
  ['Elvebakken Optikk', 'Rune Solberg', 'optician', 'Oslo', 'phone', 'S', 'won', 52, 50, null, 49, 44, 36, 5, null, '', 'First deal; commission paid'],
  ['Nordlys Sykkel', 'Eirik Dahl', 'bike shop', 'Tromsø', 'email', 'M', 'demo', 18, 16, 13, 12, 2, null, null, 0, 'Follow up after the demo', 'Asked whether it works with Shopify'],
  ['Havgløtt Hotell', 'Silje Lunde', 'hotel', 'Ålesund', 'email', 'L', 'booked', 12, 10, 6, 5, null, null, null, 1, 'Demo meeting', 'Booking questions in Norwegian, English and German'],
  ['Kvikk Rør AS', 'Henrik Moe', 'plumbing', 'Stavanger', 'phone', 'S', 'booked', 8, 7, null, 2, null, null, null, 2, 'Demo meeting', 'Misses calls while out on jobs'],
  ['Bryggen Interiør', 'Nora Bakke', 'online shop', 'Bergen', 'email', 'M', 'replied', 9, 7, 1, null, null, null, null, 0, 'Reply and offer demo times', 'positive'],
  ['Frisk Fysioterapi', 'Ola Strand', 'physiotherapy', 'Trondheim', 'email', '', 'replied', 6, 5, 0, null, null, null, null, 0, 'Reply and offer demo times', 'question: what does it cost?'],
  ['Lunde Bilverksted', 'Jonas Vik', 'car workshop', 'Drammen', 'phone', '', 'contacted', 4, 2, null, null, null, null, null, 0, 'Call again', 'No answer twice'],
  ['Polar Kaffebrenneri', 'Ida Hansen', 'online shop', 'Tromsø', 'email', '', 'contacted', 6, 4, null, null, null, null, null, -1, 'Send follow-up 1', ''],
  ['Vestland Eiendom', 'Kari Nilsen', 'property management', 'Bergen', 'email', '', 'contacted', 3, 1, null, null, null, null, null, 2, 'Follow-up 1', ''],
  ['Aker Treningssenter', 'Sander Berg', 'gym', 'Oslo', 'phone', '', 'contacted', 2, 0, null, null, null, null, null, 2, 'Call again', 'Call back after 14:00'],
  ['Mjøsa Dyreklinikk', 'Hanne Lie', 'vet clinic', 'Hamar', 'email', '', 'drafted', 1, null, null, null, null, null, null, 0, 'Send first email', 'FAQ page with 35 questions'],
  ['Sørlandet Fliser', 'Martin Aas', 'online shop', 'Kristiansand', 'email', '', 'drafted', 1, null, null, null, null, null, null, 0, 'Send first email', 'Reviews mention slow replies'],
  ['Byåsen Legesenter', 'Tone Moen', 'medical centre', 'Trondheim', '', '', 'researched', 0, null, null, null, null, null, null, null, 'Draft first email or call', 'Phone queue complaints on Google'],
  ['Røros Ull AS', 'Per Eriksen', 'online shop', 'Røros', '', 'M', 'researched', 0, null, null, null, null, null, null, null, 'Draft first email or call', 'Hiring a kundeservicemedarbeider (FINN)'],
  ['Tidevann Restaurant', 'Lise Holm', 'restaurant', 'Bodø', 'email', '', 'lost', 20, 18, 15, null, null, 15, null, null, '', 'not interested: already has a chatbot'],
];

function exampleLeads(now) {
  const day = (offset) => {
    if (offset == null) return '';
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  // Deals marked as won "this month" stay inside the current month whatever today's date is.
  const inMonth = (offset) => Math.min(offset, now.getDate() - 1);
  const leads = EXAMPLE_LEADS.map((l, i) => {
    const [company, contact, industry, city, channel, pkg, status, added, contacted, replied, booked, demo, closed, paid, nextIn, nextAction, notes] = l;
    const thisMonth = status === 'won' && closed != null && closed < 30;
    const row = Object.fromEntries(COLUMNS.map((c) => [c, '']));
    const slug = company.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/å/g, 'a').replace(/[^a-z]+/g, '');
    return Object.assign(row, {
      id: `L${String(i + 1).padStart(3, '0')}`, company, contact, industry, city, channel, package: pkg, status,
      email: `post@${slug.slice(0, 18)}.example`, phone: channel === 'phone' ? `+47 ${String(40000000 + i * 1234567).replace(/(\d{3})(\d{2})(\d{3})/, '$1 $2 $3')}` : '',
      website: `${slug.slice(0, 18)}.example`,
      added: day(added), contacted: day(contacted), replied: day(replied), booked: day(booked), demo: day(demo),
      closed: day(thisMonth ? inMonth(closed) : closed), paid: day(paid),
      next_date: nextIn == null ? '' : day(-nextIn), next_action: nextAction, notes,
    });
  });
  // Bulk contacts so the weekly charts and the conversion rates have history: 7 full weeks
  // back plus this week so far, on weekdays only. Older ones have played out; the last two
  // weeks are still waiting for an answer.
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekly = [55, 70, 80, 95, 90, 110, 120, 140];
  let n = leads.length;
  weekly.forEach((count, w) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - (7 - w) * 7);
    for (let k = 0; k < count; k += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + (k % 5));
      if (d > today) continue;
      const ago = Math.round((today - d) / 864e5);
      if (w === 7 && ago === 0 && k % 2) continue; // today is only half done
      n += 1;
      const phone = k % 3 === 0;
      const done = ago >= 14;
      const meeting = done && (k === 0 || k === 35);
      const held = done && k === 0;
      const replied = done && !phone && !meeting && k % 13 === 1;
      const row = Object.fromEntries(COLUMNS.map((c) => [c, '']));
      Object.assign(row, {
        id: `L${String(n).padStart(3, '0')}`, company: `Example company ${n}`, channel: phone ? 'phone' : 'email',
        added: day(ago + 2), contacted: iso(d), replied: replied ? day(ago - 3) : '',
        booked: meeting ? day(ago - 1) : '', demo: held ? day(ago - 6) : '',
      });
      if (done) {
        Object.assign(row, {
          status: 'lost',
          closed: day(Math.max(0, ago - (meeting ? 10 : replied ? 3 : 12))),
          notes: held ? 'went quiet after the demo' : meeting ? 'no-show' : replied ? 'not now' : 'no answer after 3 tries',
        });
      } else {
        Object.assign(row, { status: 'contacted', next_date: day(-(5 + (k % 4))), next_action: phone ? 'Call again' : 'Follow-up 2' });
      }
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
  const business = { ...BUSINESS };
  const leads = exampleLeads(now);
  return {
    name: 'JARVIS',
    owner: 'Naim',
    tagline: 'Your sales command center · Norway',
    now: now.toISOString(),
    mode: 'demo',
    engine: 'claude',
    engines: {
      claude: { label: 'Claude Code', core: 'CLAUDE', available: true, version: 'demo', week: { runs: 7, costUsd: 0, pct: 0 } },
      codex: { label: 'Codex', core: 'CODEX', available: true, version: 'demo', week: { runs: 0, costUsd: 0, pct: 0 } },
    },
    business,
    leads,
    stats: computeStats(leads, { business }),
    directives: [
      { text: 'Call 30 online shops in Bergen from the hiring-signal list', done: false, file: 'demo', line: 1 },
      { text: 'Prep the Havgløtt Hotell demo and follow up Nordlys Sykkel', done: false, file: 'demo', line: 2 },
      { text: 'Get the commission terms in writing', done: true, file: 'demo', line: 3 },
    ],
    schedule: [
      { time: '07:00', text: 'Plan the day: pace, follow-ups, demos' },
      { time: '08:00', text: 'Gym' },
      { time: '09:00', text: 'Calls: 30 online shops in Bergen' },
      { time: '11:30', text: 'Emails: send 25 drafted first emails + follow-ups' },
      { time: '13:00', text: 'Call-backs: Lunde Bilverksted, Aker Treningssenter' },
      { time: '14:00', text: 'Follow up the Nordlys Sykkel demo' },
      { time: '15:00', text: 'Demo prep: Havgløtt Hotell (tomorrow 10:00)' },
      { time: '16:00', text: 'Prospecting: companies hiring kundeservice on FINN' },
      { time: '21:30', text: '/close-day' },
    ],
    tasks: [
      { text: 'Ask the manager for the price list and a demo account', done: false, file: 'demo', line: 4 },
      { text: 'Fill in projects/product.md: languages, integrations, prices', done: false, file: 'demo', line: 5 },
      { text: 'Mark Fjellsport and Solheim paid when the payout arrives', done: false, file: 'demo', line: 6 },
      { text: 'Connect Gmail to Claude Code', done: true, file: 'demo', line: 7 },
    ],
    contract: [
      { text: 'Exact commission per package (Small, Medium, Large) in NOK', done: false, file: 'demo', line: 20 },
      { text: 'When commission is paid: when the customer signs, or when the customer has paid', done: false, file: 'demo', line: 21 },
      { text: 'What happens to my commission if a customer cancels early (clawback)', done: false, file: 'demo', line: 22 },
      { text: 'Employment or freelance (in Sweden: F-skatt, holiday pay, pension, who pays social fees)', done: false, file: 'demo', line: 23 },
      { text: 'Base salary after two months: the amount, and how much the commission drops', done: false, file: 'demo', line: 24 },
      { text: 'Written OK to use my own outreach tools and lead lists', done: true, file: 'demo', line: 25 },
    ],
    brief: {
      path: 'demo',
      title: 'Example brief',
      bullets: [
        'Example: 3 online shops in Bergen posted customer service jobs on FINN this week → added to inbox/leads.md for /lead-research. Source: finn.no/job',
        'Example: a Nordic competitor launched Norwegian-language voice answering → ask your manager how ours compares before a prospect asks you.',
        'Idea for today: open calls with the hiring signal: «Jeg så at dere søker en kundeservicemedarbeider. Hvor mange av henvendelsene er spørsmål om ordrestatus?»',
      ],
    },
    outputs: [
      { path: 'demo/call-list', name: 'today', folder: 'call-list', mtime: Date.now() - 2 * 36e5 },
      { path: 'demo/demo-prep', name: 'havglott-hotell', folder: 'demo-prep', mtime: Date.now() - 5 * 36e5 },
      { path: 'demo/lead-research', name: 'nettbutikker-bergen', folder: 'lead-research', mtime: Date.now() - 864e5 },
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
  'demo/call-list': '# Call list (example)\n\nWhat /call-list writes into outputs/call-list/ every weekday at 08:15. Fictional companies.\n\n## 1. Lunde Bilverksted · Jonas Vik · call-back (try 3)\n- Why now: no answer twice; workshops pick up before 09:30\n- Opener: «Hei Jonas, dette er Naim. Jeg ringer om telefonene deres, har du et halvt minutt?»\n- Ask: «Hvor mange samtaler mister dere mens dere står i verkstedet?»\n- Likely objection: «Vi har ikke tid til noe nytt.» → «Derfor ringer jeg: oppsettet tar dere ikke tid, og det svarer når dere ikke kan.»\n\n## 2. Aker Treningssenter · Sander Berg · call back after 14:00\n- Opener: about questions on opening hours and memberships\n\n## 3. Byåsen Legesenter · Tone Moen · first call\n- Observation: Google reviews about long phone queues',
  'demo/demo-prep': '# Demo prep: Havgløtt Hotell (example)\n\n## Their situation\n- 40-room hotel in Ålesund, guests from Norway, Germany and the UK\n- Questions by email and phone: check-in times, parking, breakfast, booking changes\n- Reception is staffed 07:00 to 23:00\n\n## Questions they probably get most\n1. When is check-in and check-out?\n2. Is there parking, and what does it cost?\n3. Can I change my booking?\n\n## Discovery questions\n1. How many emails and calls a day, and how many are the same five questions?\n2. Who answers them today, and what else should that person be doing?\n3. What happens to questions that come in at night?\n\n## Package\n- Large: three languages and a booking system to connect (confirm the integration in projects/product.md)\n\n## Next step to agree\n- An offer by email and a decision date before the summer season',
  'demo/lead-research': '# Leads: online shops in Bergen (example)\n\n## Røros Ull AS\n- Hiring a kundeservicemedarbeider (FINN, posted this week)\n- 25 employees (brreg.no), daglig leder Per Eriksen (proff.no)\n- Opener: the job ad, and how many of the questions are order status\n- Fit 5/5 · package guess: Medium',
};

export function demoFile(path) {
  return DEMO_FILES[path] || '# Example\n\nIn the live OS this opens the report from your vault.';
}

const QUICK = [
  [/booking rate|good rate|conversion|reply rate/i, 'There is no honest universal number. For cold outreach to small companies, a few percent of contacts booking a meeting is common, and many booked meetings never happen. After a few hundred contacts your own rate is the one to trust, and the Pace tab switches to it.'],
  [/chatbot/i, 'Ask what share of questions their chatbot answers without a person. If it is under half, that gap is the conversation. Do not knock their tool; show what ours does with the questions they already get.'],
  [/norsk|norwegian|bokmål|bokmal|language/i, 'Write emails in bokmål and keep them plain. On the phone, Swedish works for most Norwegians if you speak slowly, and being open about being Swedish is fine.'],
  [/price|cost|pris|kostar/i, 'Do not quote a price until projects/product.md marks it as confirmed. Answer with a question: how many customer questions do they get a week? That is what the package depends on.'],
];

export function demoQuick(text) {
  for (const [re, answer] of QUICK) if (re.test(text)) return answer;
  return 'Demo answer. In the live OS this goes to Claude Haiku 5.5 through Claude Code on your subscription and comes back in a few seconds.';
}

const STEPS = {
  default: ['→ Read ops/directives.md', '→ Read ops/pipeline.md'],
  'lead-research': ['→ Read wiki/sales-playbook.md', '→ Read ops/pipeline.md', '→ WebSearch finn.no/job kundeservice Bergen', '→ WebFetch data.brreg.no/enhetsregisteret/api/enheter', '→ WebFetch company website', '→ Edit ops/pipeline.md', '→ Write outputs/lead-research/today.md'],
  'outreach-drafts': ['→ Read projects/product.md', '→ Read wiki/sales-playbook.md', '→ Read ops/pipeline.md', '→ create_draft (Gmail)', '→ Edit ops/pipeline.md', '→ Write outputs/outreach-drafts/today.md'],
  'call-list': ['→ Read wiki/sales-playbook.md', '→ Read wiki/objections.md', '→ Read ops/pipeline.md', '→ Write outputs/call-list/today.md'],
  'demo-prep': ['→ Read projects/product.md', '→ Read ops/pipeline.md', '→ WebFetch company website', '→ WebSearch reviews customer service', '→ Write outputs/demo-prep/company.md'],
  'follow-ups': ['→ Read ops/pipeline.md', '→ search_threads (Gmail)', '→ create_draft (Gmail, reply in thread)', '→ Edit ops/pipeline.md'],
  'inbox-brief': ['→ search_threads unread (Gmail)', '→ Read ops/pipeline.md', '→ Edit ops/pipeline.md', '→ Write outputs/inbox-brief/today.md'],
  'plan-today': ['→ Read ops/directives.md', '→ Read system/business.json', '→ Read ops/pipeline.md', '→ list_events today', '→ Edit daily-notes/today.md'],
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
