// The router's decision layer: one message in, one of a fixed list of choices out.
// It never writes free text. It scores every predefined choice, turns the scores
// into probabilities, and the Bridge acts on the winner.
//
// Shared by the server (Node) and the browser demo, so it has no imports.
//
// Choices:
//   Tier 1  rules + saved data, no AI, instant   ("what are my priorities?")
//   Tier 2  quick answer from a small, fast model ("explain CPM in one line")
//   Tier 3  real work: a skill runs in Claude Code or Codex, report lands in the vault
//
// A forced choice can be confidently wrong when nothing fits, so when the winner is
// below `minConfidence` the router falls back to Tier 2, the cheapest tier that can
// still answer, and says it was unsure.

export const TIER1_INTENTS = [
  {
    id: 'priorities',
    label: 'Top priorities',
    terms: ['priorities', 'priority', 'directives', 'focus on', 'most important', 'what should i work on', 'what should i do', 'top 3', 'top three'],
  },
  {
    id: 'schedule',
    label: "Today's schedule",
    terms: ['schedule', 'calendar', 'agenda', 'meetings', "what's on today", 'whats on today', 'what do i have today', 'next event', 'appointments'],
  },
  {
    id: 'tasks',
    label: 'Open tasks',
    terms: ['tasks', 'task list', 'to do', 'todo', 'to-do', 'checklist', 'open loops'],
  },
  {
    id: 'vitals',
    label: 'Channel numbers',
    terms: ['followers', 'subscribers', 'my stats', 'my numbers', 'how many', 'views', 'revenue', 'my metrics', 'audience size', 'orders'],
  },
  {
    id: 'time',
    label: 'Time and date',
    terms: ['what time', 'the time', 'what day', "today's date", 'todays date', 'what date'],
  },
  {
    id: 'skills',
    label: 'List skills',
    terms: ['list skills', 'what skills', 'which skills', 'what can you do', 'commands', 'show skills'],
  },
];

const QUESTION_STARTS = ['what', 'why', 'how', 'who', 'when', 'where', 'is', 'are', 'can', 'could', 'should', 'does', 'do', 'explain', 'define', 'summarize', 'summarise', 'tell me', 'give me', 'quick'];
const WORK_VERBS = ['make', 'write', 'draft', 'plan', 'run', 'research', 'build', 'create', 'find', 'turn', 'repurpose', 'prepare', 'generate', 'analyze', 'analyse', 'audit', 'review', 'clean', 'pull', 'update', 'refresh', 'track', 'design', 'script'];

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
  return found;
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
    // Rules only fire on short, direct asks. "Write a post about my followers" is work.
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
  choices.push({ id: 'quick', tier: 2, label: 'Quick answer', score: quick, matched: isQuestion ? ['question'] : [] });

  for (const skill of skills) {
    const found = hits(t, skill.triggers || []);
    const named = t.includes(`/${skill.name}`) || t.includes(` ${skill.name.replace(/-/g, ' ')} `);
    let score = found.length ? 1.4 + found.length * 1.1 : 0;
    if (found.length && workVerbs.length) score += 0.9;
    // The thing named first is usually the thing being asked for: "hooks for a hoodie drop".
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
    ? `matched ${pick.matched.slice(0, 3).map((m) => `"${m}"`).join(', ')}`
    : unsure ? `no choice above ${Math.round(minConfidence * 100)}%, using the cheapest tier that can answer` : 'closest fit';

  return {
    text: String(text || ''),
    pick: { id: pick.id, tier: pick.tier, label: pick.label, p: pick.p },
    unsure,
    reason,
    choices: choices.map(({ id, tier, label, p }) => ({ id, tier, label, p })),
  };
}
