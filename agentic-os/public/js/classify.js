// The router's decision layer: one message in, one of a fixed list of choices out.
// It never writes free text. It scores every predefined choice, turns the scores
// into probabilities, and the Bridge acts on the winner.
//
// Shared by the server (Node) and the browser demo, so it has no imports.
//
// Choices:
//   Tier 1  rules + saved data, no AI, instant   ("what are my priorities?")
//   Tier 2  quick answer from a small, fast model ("what is a good booking rate?")
//   Tier 3  real work: a skill runs in Claude Code or Codex, report lands in the vault
//
// A forced choice can be confidently wrong when nothing fits, so when the winner is
// below `minConfidence` the router falls back to Tier 2, the cheapest tier that can
// still answer, and says it was unsure.

export const TIER1_INTENTS = [
  {
    id: 'priorities',
    label: 'Dagens fokus',
    terms: ['priorities', 'priority', 'directives', 'focus on', 'most important', 'what should i work on', 'what should i do', 'top 3', 'top three', 'prioriteringar', 'fokus', 'dagens fokus', 'vad ska jag göra', 'vad ska jag fokusera på', 'vad är viktigast'],
  },
  {
    id: 'schedule',
    label: 'Dagens schema',
    terms: ['schedule', 'calendar', 'agenda', 'meetings today', "what's on today", 'whats on today', 'what do i have today', 'next event', 'appointments', 'schema', 'schemat', 'kalender', 'kalendern', 'vad har jag idag', 'vad händer idag', 'dagens schema'],
  },
  {
    id: 'tasks',
    label: 'Öppna uppgifter',
    terms: ['tasks', 'task list', 'to do', 'todo', 'to-do', 'checklist', 'open loops', 'uppgifter', 'mina uppgifter', 'att göra', 'att göra-lista'],
  },
  {
    id: 'numbers',
    label: 'Säljsiffror',
    terms: ['my numbers', 'my stats', 'stats', 'how am i doing', 'commission', 'how much have i earned', 'how many deals', 'deals this month', 'meetings booked', 'how many meetings', 'how many demos', 'reply rate', 'booking rate', 'contacts this week', 'how many leads', 'provision', 'mina siffror', 'siffrorna', 'hur går det', 'hur ligger jag till', 'hur mycket har jag tjänat', 'hur många affärer', 'hur många möten', 'hur många demos', 'bokade möten', 'affärer denna månad'],
  },
  {
    id: 'payout',
    label: 'Utbetalningar',
    terms: ['när får jag betalt', 'när får jag provisionen', 'när kommer provisionen', 'när kommer pengarna', 'utbetalning', 'utbetalningen', 'utbetalningar', 'nästa utbetalning', 'pengar på väg', 'nästa lön', 'förskott', 'förskottet', 'återkrav', 'when do i get paid', 'next payout', 'payout'],
  },
  {
    id: 'pace',
    label: 'Takt mot målet',
    terms: ['on pace', 'on track', 'pace', 'behind', 'to hit my goal', 'reach my goal', 'hit the goal', 'how many calls do i need', 'how many contacts do i need', 'how many emails do i need', 'how many calls', 'how many contacts', 'what do i need', 'i fas', 'takt', 'takten', 'hur många samtal', 'hur många kontakter', 'hur många mejl', 'nå målet', 'klara målet', 'ligger jag efter'],
  },
  {
    id: 'channels',
    label: 'Mejl mot samtal',
    terms: ['vilken kanal', 'kanaler', 'kanalerna', 'mejl eller samtal', 'samtal eller mejl', 'mejl mot samtal', 'funkar mejlen', 'fungerar mejlen', 'ger mejlen', 'which channel', 'channels', 'email vs phone', 'email or phone'],
  },
  {
    id: 'followups',
    label: 'Uppföljningar idag',
    terms: ['who should i follow up', 'who do i follow up', 'who to follow up', 'follow-ups due', 'follow ups due', 'followups due', 'due today', 'who is due', 'vem ska jag följa upp', 'vilka ska jag följa upp', 'vilka ska följas upp', 'vem ska jag ringa tillbaka', 'återuppringningar'],
  },
  {
    id: 'time',
    label: 'Tid och datum',
    terms: ['what time', 'the time', 'what day', "today's date", 'todays date', 'what date', 'vad är klockan', 'vilket datum', 'vilken dag är det'],
  },
  {
    id: 'skills',
    label: 'Lista skills',
    terms: ['list skills', 'what skills', 'which skills', 'what can you do', 'commands', 'show skills', 'vad kan du göra', 'vilka skills', 'vad kan du'],
  },
];

const QUESTION_STARTS = ['what', 'why', 'how', 'who', 'when', 'where', 'is', 'are', 'can', 'could', 'should', 'does', 'do', 'explain', 'define', 'summarize', 'summarise', 'tell me', 'give me', 'quick', 'vad', 'varför', 'hur', 'vem', 'vilka', 'vilken', 'när', 'var', 'kan', 'ska', 'bör', 'är', 'har', 'förklara', 'berätta'];
const WORK_VERBS = ['make', 'write', 'draft', 'plan', 'run', 'research', 'build', 'create', 'find', 'turn', 'prepare', 'prep', 'generate', 'analyze', 'analyse', 'audit', 'review', 'clean', 'pull', 'update', 'refresh', 'track', 'sync', 'check', 'chase', 'send', 'skriv', 'hitta', 'gör', 'förbered', 'planera', 'kolla', 'uppdatera', 'synka', 'leta', 'ta fram', 'samla', 'städa', 'researcha', 'undersök'];

function norm(text) {
  return ` ${String(text || '').toLowerCase().replace(/[^\p{L}\p{N}'\s/-]/gu, ' ').replace(/\s+/g, ' ').trim()} `;
}

function hits(t, terms) {
  const found = [];
  for (const term of terms || []) {
    const needle = term.toLowerCase();
    // Whole-word match for single words, substring match for phrases.
    const ok = needle.includes(' ') ? t.includes(needle) : t.includes(` ${needle} `) || t.includes(` ${needle}s `);
    if (ok) found.push(term);
  }
  // "lead", "leads" and "new leads" in one message are one signal, not three.
  return found.filter((f) => !found.some((g) => g !== f && g.toLowerCase().includes(f.toLowerCase())));
}

function softmax(values, temperature = 1.8) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp((v - max) * temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * @param {string} text   what the user said or typed
 * @param {{skills?: Array<{name:string,label?:string,triggers?:string[]}>, minConfidence?: number}} opts
 */
export function classify(text, opts = {}) {
  const t = norm(text);
  const words = t.trim().split(' ').filter(Boolean);
  const skills = opts.skills || [];
  const minConfidence = opts.minConfidence ?? 0.45;

  const firstWord = words[0] || '';
  const firstTwo = words.slice(0, 2).join(' ');
  const isQuestion = QUESTION_STARTS.includes(firstWord) || QUESTION_STARTS.includes(firstTwo) || /\?\s*$/.test(String(text));
  const workVerbs = hits(t, WORK_VERBS);

  const choices = [];

  for (const intent of TIER1_INTENTS) {
    const found = hits(t, intent.terms);
    // Rules only fire on short, direct asks. "Write an email about my numbers" is work.
    let score = found.length ? 3 + found.length * 0.8 : 0;
    if (found.length && workVerbs.length) score *= 0.3;
    if (found.length && words.length > 14) score -= 1;
    choices.push({ id: `rule:${intent.id}`, tier: 1, label: intent.label, score, matched: found });
  }

  // Tier 2 always competes, with a small base so it wins when nothing else fits.
  let quick = 1.0;
  if (isQuestion) quick += 1.0;
  if (words.length <= 12) quick += 0.3;
  if (workVerbs.length && !isQuestion) quick -= 0.6;
  choices.push({ id: 'quick', tier: 2, label: 'Snabbt svar', score: quick, matched: isQuestion ? ['fråga'] : [] });

  for (const skill of skills) {
    const found = hits(t, skill.triggers || []);
    const named = t.includes(`/${skill.name}`) || t.includes(` ${skill.name.replace(/-/g, ' ')} `);
    let score = found.length ? 1.4 + found.length * 1.1 : 0;
    if (found.length && workVerbs.length) score += 0.9;
    // The thing named first is usually the thing being asked for: "call list for the new leads".
    if (found.length) score += 0.6 * (1 - Math.min(...found.map((f) => t.indexOf(f.toLowerCase()))) / t.length);
    if (named) score += 4;
    choices.push({ id: `skill:${skill.name}`, tier: 3, label: `/${skill.name}`, score, matched: named ? [`/${skill.name}`, ...found] : found });
  }

  const probs = softmax(choices.map((c) => c.score));
  choices.forEach((c, i) => { c.p = probs[i]; });
  choices.sort((a, b) => b.p - a.p);

  let pick = choices[0];
  const unsure = pick.p < minConfidence;
  if (unsure && pick.id !== 'quick') pick = choices.find((c) => c.id === 'quick');

  const reason = pick.matched && pick.matched.length
    ? `träffade ${pick.matched.slice(0, 3).map((m) => `"${m}"`).join(', ')}`
    : unsure ? `inget val över ${Math.round(minConfidence * 100)} %, tar den billigaste nivån som kan svara` : 'närmast';

  return {
    text: String(text || ''),
    pick: { id: pick.id, tier: pick.tier, label: pick.label, p: pick.p },
    unsure,
    reason,
    choices: choices.map(({ id, tier, label, p }) => ({ id, tier, label, p })),
  };
}
