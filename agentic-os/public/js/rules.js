// Tier 1: answers built from saved data with no model call.
// Shared by the server and the browser demo.

const fmtNum = (n) => {
  if (n == null || Number.isNaN(Number(n))) return 'not set';
  const v = Number(n);
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(v) >= 1e4) return `${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return v.toLocaleString('en-US');
};

export { fmtNum };

/**
 * @param {string} intent  one of the TIER1_INTENTS ids
 * @param {object} state   { owner, directives, schedule, tasks, vitals, skills, now }
 */
export function answerRule(intent, state) {
  const now = state.now ? new Date(state.now) : new Date();
  switch (intent) {
    case 'priorities': {
      const d = (state.directives || []).filter((x) => !x.done);
      if (!d.length) return 'No directives set for today. Run /plan-today or add three lines under "## Directives" in today\'s note.';
      return `Your top ${d.length === 1 ? 'priority' : d.length} today: ${d.map((x, i) => `${i + 1}. ${x.text}`).join(' ')}`;
    }
    case 'schedule': {
      const s = state.schedule || [];
      if (!s.length) return 'Nothing on today\'s schedule yet. /plan-today pulls it from your calendar.';
      const hhmm = now.toTimeString().slice(0, 5);
      const next = s.find((e) => e.time >= hhmm);
      const list = s.map((e) => `${e.time} ${e.text}`).join('. ');
      return next ? `Next up at ${next.time}: ${next.text}. Full day: ${list}.` : `Your scheduled blocks are done for today. The day was: ${list}.`;
    }
    case 'tasks': {
      const open = (state.tasks || []).filter((t) => !t.done);
      if (!open.length) return 'No open tasks. Either you are done or nothing is written down.';
      return `${open.length} open: ${open.slice(0, 5).map((t) => t.text).join('; ')}${open.length > 5 ? `; plus ${open.length - 5} more` : ''}.`;
    }
    case 'vitals': {
      const v = state.vitals?.metrics || {};
      const parts = Object.values(v).map((m) => `${m.label} ${m.prefix || ''}${fmtNum(m.value)}`);
      if (!parts.length) return 'No numbers saved yet. Run /pull-metrics or edit system/vitals.json.';
      const tag = state.vitals?.example ? ' These are example numbers until you run /pull-metrics.' : '';
      return `${parts.join(', ')}.${tag}`;
    }
    case 'time':
      return `It is ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} on ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}.`;
    case 'skills': {
      const s = state.skills || [];
      return `${s.length} skills loaded: ${s.map((x) => `/${x.name}`).join(', ')}.`;
    }
    default:
      return 'No rule for that yet.';
  }
}
