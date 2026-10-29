// Demo mode: the HUD running with no Bridge behind it (the published preview, or a
// browser opened while the server is down). Everything here is example data and
// every simulated run says so.

import { classify } from './classify.js';
import { answerRule } from './rules.js';
import { computeStats, COLUMNS } from './pipeline.js';

// tools/build-demo.mjs replaces this with system/backbone.json.
const BACKBONE = /*__BACKBONE__*/ null;

// tools/build-demo.mjs replaces this with the Live view's cards: wiki/objections.md and
// wiki/product-cards.md, so the preview shows the same answers as the vault.
const TEXTS = /*__TEXTS__*/ null;

const FALLBACK = {
  rules: [
    { title: 'Gjort det för hand två gånger', then: 'gör det till en skill' },
    { title: 'Skillen fungerar 5 gånger i rad', then: 'automatisera den' },
    { title: 'Den skickar, ringer eller kostar', then: 'behåll den manuell' },
  ],
  domains: [{ id: 'productivity', label: 'Dagen' }],
  skills: [{ name: 'plan-today', domain: 'productivity', task: 'Planera dagen', does: 'takt + plan', connectors: ['Kalender'], schedule: 'weekdays 07:00', quick: true, label: 'Planera dagen', triggers: ['planera dagen'] }],
};

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SV_DAYS = ['söndagar', 'måndagar', 'tisdagar', 'onsdagar', 'torsdagar', 'fredagar', 'lördagar'];
const SV_EVENTS = { 'meeting-booked': 'när ett möte bokas', 'call-saved': 'när du sparar ett samtal' };
function when(spec) {
  const s = String(spec || 'manual');
  let m;
  if ((m = s.match(/^daily (\d{1,2}:\d{2})$/))) return { icon: 'clock', text: `dagligen ${m[1]}` };
  if ((m = s.match(/^weekdays (\d{1,2}:\d{2})$/))) return { icon: 'clock', text: `vardagar ${m[1]}` };
  if ((m = s.match(/^weekly (\w{3}) (\d{1,2}:\d{2})$/))) return { icon: 'clock', text: `${SV_DAYS[DAYS.indexOf(m[1])]} ${m[2]}` };
  if ((m = s.match(/^monthly (\d{1,2})/))) return { icon: 'clock', text: `den ${m[1]} varje månad` };
  if ((m = s.match(/^event (.+)$/))) return { icon: 'bolt', text: SV_EVENTS[m[1]] || m[1].replace(/-/g, ' ') };
  return { icon: 'hand', text: 'manuell, du bestämmer' };
}

// The same targets as vault/system/business.json (Driv Kundesenter, October 2026).
const BUSINESS = {
  role: 'Säljare, Driv Kundesenter (AI-kundtjänst) till företag i Norge',
  employer: 'Driv Mobil AS',
  product: 'Driv Kundesenter',
  currency: 'NOK',
  sek_per_nok: 0.95,
  goal_deals_month: 4,
  daily_contacts: 60,
  packages: {
    S: { name: 'Small', price: 4695, credits: 5, commission: 5000, tagline: 'For de første agentene', example: 'f.eks. 2 agenter, 1 kø, 1 webchat og 1 AI-agent' },
    M: { name: 'Medium', price: 7595, credits: 15, commission: 10000, tagline: 'For et etablert kundeserviceteam (anbefalt)', example: 'f.eks. 8 agenter, 2 køer, 1 webchat, 1 e-post og 1 AI-agent' },
    L: { name: 'Large', price: 13595, credits: 30, commission: 20000, tagline: 'For større team og flere kanaler', example: 'f.eks. 20 agenter, 3 køer, 2 webchatter, 1 e-post og 2 AI-agenter' },
  },
  credit_costs: { agent: 1, queue: 1, webchat: 1, ai_agent: 1, email_channel: 2 },
  extra_credit_price: 299,
  default_package: 'M',
  typical_mix: { S: 55, M: 35, L: 10 },
  assumptions: { book_rate: 2, show_rate: 80, close_rate: 10 },
  confirmed: true,
  confirmed_by: 'provisionsbladet från Driv, okt 2026',
  email_language: 'nb',
  // The preview's example companies are made up, so it shows contact persons. A real vault
  // starts in 'company-only' (system/business.json → privacy).
  privacy: { mode: 'full' },
};

// Example companies, spread over the last 8 weeks so every chart has a shape. Fictional.
const EXAMPLE_LEADS = [
  // [company, contact, industry, city, channel, package, status, addedAgo, contactedAgo, repliedAgo, bookedAgo, demoAgo, offerAgo, closedAgo, paidAgo, nextIn, nextAction, note]
  ['Fjellsport Nett AS', 'Ingrid Haugen', 'nettbutikk', 'Bergen', 'email', 'L', 'won', 30, 28, 26, 25, 20, 18, 6, null, null, 'Lämna över till onboarding', 'Sökte 2 till kundtjänst; ca 400 orderfrågor i veckan'],
  ['Solheim Tannklinikk', 'Marte Solheim', 'tannklinikk', 'Oslo', 'phone', 'M', 'won', 26, 24, null, 24, 15, 13, 3, null, null, 'Lämna över till onboarding', 'Telefonen öppen bara 08–15'],
  ['Elvebakken Optikk', 'Rune Solberg', 'optiker', 'Oslo', 'phone', 'S', 'won', 52, 50, null, 49, 44, 42, 36, 5, null, '', 'Första affären; provisionen utbetald'],
  ['Nordlys Sykkel', 'Eirik Dahl', 'sykkelbutikk', 'Tromsø', 'email', 'M', 'offer', 18, 16, 13, 12, 3, 2, null, null, 0, 'Följ upp offerten', 'Undrade om Shopify (fråga Driv)'],
  ['Havgløtt Hotell', 'Silje Lunde', 'hotell', 'Ålesund', 'email', 'M', 'booked', 12, 10, 6, 5, null, null, null, null, 1, 'Demomöte', 'Bokningsfrågor på norska, engelska och tyska'],
  ['Kvikk Rør AS', 'Henrik Moe', 'rørlegger', 'Stavanger', 'phone', 'S', 'booked', 8, 7, null, 2, null, null, null, null, 2, 'Demomöte', 'Missar samtal när de är ute på jobb'],
  ['Bryggen Interiør', 'Nora Bakke', 'nettbutikk', 'Bergen', 'email', 'M', 'replied', 9, 7, 1, null, null, null, null, null, 0, 'Svara och föreslå demotider', 'positivt'],
  ['Frisk Fysioterapi', 'Ola Strand', 'fysioterapi', 'Trondheim', 'email', '', 'replied', 6, 5, 0, null, null, null, null, null, 0, 'Svara och föreslå demotider', 'fråga: vad kostar det?'],
  ['Lunde Bilverksted', 'Jonas Vik', 'bilverksted', 'Drammen', 'phone', '', 'contacted', 4, 2, null, null, null, null, null, null, 0, 'Ring igen', 'Inget svar två gånger'],
  ['Polar Kaffebrenneri', 'Ida Hansen', 'nettbutikk', 'Tromsø', 'email', '', 'contacted', 6, 4, null, null, null, null, null, null, -1, 'Skicka uppföljning 1', ''],
  ['Vestland Eiendom', 'Kari Nilsen', 'eiendomsforvaltning', 'Bergen', 'email', '', 'contacted', 3, 1, null, null, null, null, null, null, 2, 'Uppföljning 1', ''],
  ['Aker Treningssenter', 'Sander Berg', 'treningssenter', 'Oslo', 'phone', '', 'contacted', 2, 0, null, null, null, null, null, null, 2, 'Ring igen', 'Ring tillbaka efter 14:00'],
  ['Mjøsa Dyreklinikk', 'Hanne Lie', 'dyreklinikk', 'Hamar', 'email', '', 'drafted', 1, null, null, null, null, null, null, null, 0, 'Skicka första mejlet', 'FAQ med 35 frågor, bara kontaktformulär'],
  ['Sørlandet Fliser', 'Martin Aas', 'nettbutikk', 'Kristiansand', 'email', '', 'drafted', 1, null, null, null, null, null, null, null, 0, 'Skicka första mejlet', 'Recensioner om långsamma svar'],
  ['Byåsen Legesenter', 'Tone Moen', 'legesenter', 'Trondheim', '', '', 'researched', 0, null, null, null, null, null, null, null, null, 'Skriv första mejlet eller ring', 'Klagomål på telefonkön på Google'],
  ['Røros Ull AS', 'Per Eriksen', 'nettbutikk', 'Røros', '', 'M', 'researched', 0, null, null, null, null, null, null, null, null, 'Skriv första mejlet eller ring', 'Söker kundeservicemedarbeider (FINN)'],
  ['Tidevann Restaurant', 'Lise Holm', 'restaurant', 'Bodø', 'email', '', 'lost', 20, 18, 15, null, null, null, 15, null, null, '', 'inte intresserade: har redan en chatbot'],
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
    const [company, contact, industry, city, channel, pkg, status, added, contacted, replied, booked, demo, offer, closed, paid, nextIn, nextAction, notes] = l;
    const thisMonth = status === 'won' && closed != null && closed < 30;
    const row = Object.fromEntries(COLUMNS.map((c) => [c, '']));
    const slug = company.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/å/g, 'a').replace(/[^a-z]+/g, '');
    return Object.assign(row, {
      id: `L${String(i + 1).padStart(3, '0')}`, company, contact, industry, city, channel, package: pkg, status,
      email: `post@${slug.slice(0, 18)}.example`, phone: channel === 'phone' ? `+47 ${String(40000000 + i * 1234567).replace(/(\d{3})(\d{2})(\d{3})/, '$1 $2 $3')}` : '',
      website: `${slug.slice(0, 18)}.example`,
      added: day(added), contacted: day(contacted), replied: day(replied), booked: day(booked), demo: day(demo), offer: day(offer),
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
      const offered = held && w % 2 === 0;
      const replied = done && !phone && !meeting && k % 13 === 1;
      const row = Object.fromEntries(COLUMNS.map((c) => [c, '']));
      Object.assign(row, {
        id: `L${String(n).padStart(3, '0')}`, company: `Exempelföretag ${n}`, channel: phone ? 'phone' : 'email',
        added: day(ago + 2), contacted: iso(d), replied: replied ? day(ago - 3) : '',
        booked: meeting ? day(ago - 1) : '', demo: held ? day(ago - 6) : '', offer: offered ? day(ago - 7) : '',
      });
      if (done) {
        Object.assign(row, {
          status: 'lost',
          closed: day(Math.max(0, ago - (meeting ? 10 : replied ? 3 : 12))),
          notes: offered ? 'tackade nej till offerten' : held ? 'tystnade efter demon' : meeting ? 'dök inte upp' : replied ? 'inte nu' : 'inget svar efter 3 försök',
        });
      } else {
        Object.assign(row, { status: 'contacted', next_date: day(-(5 + (k % 4))), next_action: phone ? 'Ring igen' : 'Uppföljning 2' });
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
    tagline: 'Din säljcentral · Driv Kundesenter',
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
      { text: 'Ring 30 nätbutiker i Bergen från listan med rekryteringssignaler', done: false, file: 'demo', line: 1 },
      { text: 'Förbered demon med Havgløtt Hotell och följ upp offerten till Nordlys Sykkel', done: false, file: 'demo', line: 2 },
      { text: 'Fråga chefen om bindningstiden (12 eller 24/36 månader)', done: true, file: 'demo', line: 3 },
    ],
    schedule: [
      { time: '07:00', text: 'Planera dagen: takt, uppföljningar, demos' },
      { time: '08:00', text: 'Gym' },
      { time: '09:00', text: 'Samtal: 30 nätbutiker i Bergen' },
      { time: '11:30', text: 'Mejl: skicka 25 utkast + uppföljningar' },
      { time: '13:00', text: 'Återuppringningar: Lunde Bilverksted, Aker Treningssenter' },
      { time: '14:00', text: 'Följ upp offerten till Nordlys Sykkel' },
      { time: '15:00', text: 'Demoförberedelse: Havgløtt Hotell (i morgon 10:00)' },
      { time: '16:00', text: 'Prospektering: företag som söker kundtjänstpersonal på FINN' },
      { time: '21:30', text: '/close-day' },
    ],
    tasks: [
      { text: 'Fråga chefen vilket CRM vi använder och be om en demo-miljö', done: false, file: 'demo', line: 4 },
      { text: 'Fråga vad en extra kredit kostar: 299 kr per månad eller en gång?', done: false, file: 'demo', line: 5 },
      { text: 'Markera Fjellsport och Solheim som utbetalda när lönen kommer', done: false, file: 'demo', line: 6 },
      { text: 'Koppla Gmail till Claude Code', done: true, file: 'demo', line: 7 },
    ],
    contract: [
      { text: 'Provision per paket i kronor (står i provisionsbladet)', done: true, file: 'demo', line: 20 },
      { text: 'När provisionen betalas ut (med lönen månaden efter signering)', done: true, file: 'demo', line: 21 },
      { text: 'Vad som händer med provisionen om kunden säger upp avtalet tidigt eller inte betalar', done: false, file: 'demo', line: 22 },
      { text: 'Bindningstiden: 12 månader (provisionsbladet) eller 24/36 månader (säljguiden)?', done: false, file: 'demo', line: 23 },
      { text: 'Anställning eller frilans, och i vilket land (skatt, semesterersättning, pension)', done: false, file: 'demo', line: 24 },
      { text: 'Grundlön efter två månader: belopp och om provisionen ändras', done: false, file: 'demo', line: 25 },
      { text: 'Skriftligt OK på att använda egna outreach-verktyg och egna leadlistor', done: false, file: 'demo', line: 26 },
    ],
    brief: {
      path: 'demo',
      title: 'Example brief',
      bullets: [
        'Exempel: 3 nätbutiker i Bergen har lagt ut kundtjänstjobb på FINN den här veckan → tillagda i inbox/leads.md för /lead-research. Källa: finn.no/job',
        'Exempel: en nordisk konkurrent lanserade AI-svar på norska i telefon → fråga chefen hur Driv står sig innan en kund frågar dig.',
        'Idé för idag: öppna samtalen med Drivs fråga «Hva skjer med spørsmål som kommer etter stengetid?» och lyssna efter «de besvares neste dag».',
      ],
    },
    outputs: [
      { path: 'demo/call-list', name: 'idag', folder: 'call-list', mtime: Date.now() - 2 * 36e5 },
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
  'demo/call-list': '# Ringlista (exempel)\n\nSå här ser /call-list ut i outputs/call-list/ varje vardag 08:15. Påhittade företag.\n\n## 1. Lunde Bilverksted · Jonas Vik · återuppringning (försök 3)\n- Varför nu: inget svar två gånger; verkstäder svarar före 09:30\n- Öppning: «Hei Jonas, dette er Naim fra Driv. Jeg ringer om telefonene deres, har du et halvt minutt?»\n- Drivs fråga: «Hva skjer med spørsmål som kommer etter stengetid?»\n- Trolig invändning: «Vi har ikke så mange henvendelser.» → «Start med Small. AI-agenten tar kveld og helg, så ingen venter.»\n\n## 2. Aker Treningssenter · Sander Berg · ring tillbaka efter 14:00\n- Öppning: om frågor om öppettider och medlemskap\n\n## 3. Byåsen Legesenter · Tone Moen · första samtalet\n- Observation: recensioner på Google om lång telefonkö',
  'demo/demo-prep': '# Demoförberedelse: Havgløtt Hotell (exempel)\n\n## Deras läge\n- Hotell med 40 rum i Ålesund, gäster från Norge, Tyskland och Storbritannien\n- Frågor via mejl och telefon: incheckning, parkering, frukost, ändrade bokningar\n- Receptionen bemannad 07:00–23:00\n\n## Frågorna de troligen får mest\n1. När är incheckning och utcheckning? (AI-agenten)\n2. Finns det parkering och vad kostar den? (AI-agenten)\n3. Kan jag ändra min bokning? (kollega, med sammanfattning)\n\n## Drivs sex frågor\n- «Hva skjer med spørsmål som kommer etter stengetid?» Väntat svar: de besvaras på morgonen.\n- «Hvor mange jobber med kundeservice?» Styr paketet.\n\n## Paket\n- Första uppskattning: 6 agenter, 2 köer, 1 webbchatt, 1 e-post, 2 AI-agenter = 13 krediter → Medium (15)\n\n## Nästa steg att komma överens om\n- Offert för e-signering och ett beslutsdatum före sommarsäsongen',
  'demo/lead-research': '# Leads: nätbutiker i Bergen (exempel)\n\n## Røros Ull AS\n- Söker en kundeservicemedarbeider (FINN, publicerad den här veckan)\n- 25 anställda (brreg.no), daglig leder Per Eriksen (proff.no)\n- Drivs målgrupp: nettbutikk og handel\n- Öppning: jobbannonsen, och hur många av frågorna som gäller orderstatus\n- Passar 5/5 · paketgissning: Medium',
};

export function demoFile(path) {
  return DEMO_FILES[path] || '# Exempel\n\nI riktiga Jarvis öppnas rapporten från ditt valv här.';
}

/** A vault note built into the demo (the Live view's cards). */
export function demoText(path) {
  if (!TEXTS?.[path]) throw new Error(`${path} finns inte i demon`);
  return TEXTS[path];
}

const QUICK = [
  [/bokningsgrad|konvertering|svarsfrekvens|booking rate|reply rate/i, 'Det finns ingen ärlig universell siffra. För kalla kontakter till små företag är det vanligt att några procent bokar möte, och en del bokade möten blir aldrig av. Efter några hundra kontakter är din egen siffra den som gäller, och fliken Takt byter till den.'],
  [/outlook/i, 'Drivs svar: fråga «Hvordan vet dere i dag at alle kunder har fått svar?» Låt dem själva komma fram till att en delad inkorg inte visar det. Sedan visar du ärendehanteringen.'],
  [/chatbot/i, 'Fråga hur stor andel av frågorna deras chatbot svarar på utan en person, och vad som händer med resten. Om det hamnar i en inkorg utan ansvarig är det där Driv Kundesenter gör skillnad: varje chatt blir ett ärende med ansvarig och SLA.'],
  [/dyr|pris|kostar|price|cost/i, 'Drivs svar på «det er for dyrt»: räkna tillsammans hur många timmar i veckan som går till likadana frågor. Listpris: Small 4 695, Medium 7 595, Large 13 595 kr i månaden exkl. moms. Lova aldrig rabatt, den bestäms med ledningen innan offerten skickas.'],
  [/bindning|binding/i, 'Det är oklart än: provisionsbladet säger 12 månader och sedan löpande, säljguiden säger 24 eller 36 månader. Fråga chefen innan du lovar kunden något.'],
  [/norsk|norwegian|bokmål|bokmal|språk/i, 'Skriv mejlen på bokmål och håll dem enkla. I telefon förstår de flesta norrmän svenska om du pratar lugnt, och det är helt okej att säga att du är svensk.'],
];

export function demoQuick(text) {
  for (const [re, answer] of QUICK) if (re.test(text)) return answer;
  return 'Demosvar. I riktiga Jarvis går frågan till Claude Haiku 5.5 via Claude Code på ditt abonnemang och svaret kommer på några sekunder.';
}

const STEPS = {
  default: ['→ Read ops/directives.md', '→ Read ops/pipeline.md'],
  'lead-research': ['→ Read wiki/sales-playbook.md', '→ Read ops/pipeline.md', '→ WebSearch finn.no/job kundeservice Bergen', '→ WebFetch data.brreg.no/enhetsregisteret/api/enheter', '→ WebFetch company website', '→ Edit ops/pipeline.md', '→ Write outputs/lead-research/idag.md'],
  'outreach-drafts': ['→ Read projects/product.md', '→ Read wiki/sales-playbook.md', '→ Read ops/pipeline.md', '→ create_draft (Gmail)', '→ Edit ops/pipeline.md', '→ Write outputs/outreach-drafts/idag.md'],
  'call-list': ['→ Read wiki/sales-playbook.md', '→ Read wiki/objections.md', '→ Read ops/pipeline.md', '→ Write outputs/call-list/idag.md'],
  'demo-prep': ['→ Read projects/product.md', '→ Read ops/pipeline.md', '→ WebFetch company website', '→ WebSearch reviews kundeservice', '→ Write outputs/demo-prep/foretag.md'],
  offer: ['→ Read projects/product.md', '→ Read inbox/demo-foretag.md', '→ create_draft (Gmail, reply in thread)', '→ Edit ops/pipeline.md'],
  'follow-ups': ['→ Read ops/pipeline.md', '→ search_threads (Gmail)', '→ create_draft (Gmail, reply in thread)', '→ Edit ops/pipeline.md'],
  'inbox-brief': ['→ search_threads unread (Gmail)', '→ Read ops/pipeline.md', '→ Edit ops/pipeline.md', '→ Write outputs/inbox-brief/idag.md'],
  'call-summary': ['→ Read samtal/idag-foretag.md', '→ Read ops/pipeline.md', '→ Read projects/product.md', '→ Read wiki/objections.md', '→ Write outputs/call-summary/foretag.md', '→ create_draft (Gmail, till adressen kunden gav)', '→ Edit ops/pipeline.md'],
  'plan-today': ['→ Read ops/directives.md', '→ Read system/business.json', '→ Read ops/pipeline.md', '→ list_events today', '→ Edit daily-notes/idag.md'],
};

export const demoStopped = new Set();

/** A simulated Tier 3 run that streams believable steps and says it is a demo. */
export function demoRun(job, emit) {
  const steps = [
    { kind: 'sys', text: `$ claude (skill ${job.skill || 'prompt'}) · cwd vault/  [DEMO, inget körs på riktigt]` },
    { kind: 'sys', text: 'session 4f2a91c0 · model default' },
    { kind: 'tool', text: `→ Read .claude/skills/${job.skill || 'none'}/SKILL.md` },
    ...(STEPS[job.skill] || STEPS.default).map((t) => ({ kind: 'tool', text: t })),
    { kind: 'out', text: 'Klart. Rapporten är sparad i valvet.' },
    { kind: 'sys', text: 'klar · 6 varv · 41 s · demo' },
    { kind: 'sys', text: 'Det här var en demokörning. Starta Bridge lokalt (Start Jarvis.bat) för riktiga körningar.' },
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
    if (f) { r.pick = { ...f }; r.reason = 'du valde den här vägen'; r.unsure = false; }
  }
  const { pick } = r;
  if (pick.tier === 1) return { route: r, tier: 1, answer: answerRule(pick.id.slice(5), state) };
  if (pick.tier === 2) return { route: r, tier: 2, answer: demoQuick(text), backend: 'demo' };
  const skill = pick.id.slice(6);
  return { route: r, tier: 3, skill, answer: `Jag fixar det. Kör /${skill} i ${state.engines[state.engine].label}. I demon spelas körningen upp i terminalen nedanför.` };
}
