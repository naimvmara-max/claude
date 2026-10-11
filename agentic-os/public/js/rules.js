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
 * @param {object} state   { owner, directives, schedule, tasks, stats, skills, now }
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
    case 'numbers': {
      const st = state.stats;
      if (!st || !st.leads) return 'No leads in the pipeline yet, so there is nothing to count. Run /lead-research or add a lead in Command, Pipeline.';
      const cur = st.currency === 'EUR' ? '€' : `${st.currency} `;
      const rate = st.replyRate == null ? 'no emails in the last 30 days' : `${Math.round(st.replyRate * 100)}% (${st.replied30} of ${st.contacted30})`;
      const goal = st.goal.target ? ` That is ${st.goal.pct}% of your ${cur}${fmtNum(st.goal.target)} goal.` : '';
      return `This week you sent ${st.sentWeek} first emails (last week ${st.sentPrevWeek}). Reply rate over 30 days: ${rate}. ${st.callsMonth} calls booked this month, ${st.proposalsOpen} proposals open, ${st.won} clients. MRR ${cur}${fmtNum(st.mrr)}.${goal}`;
    }
    case 'followups': {
      const f = state.stats?.followups || [];
      if (!f.length) return 'No follow-ups due today.';
      return `${f.length} due: ${f.slice(0, 5).map((x) => `${x.company} (${x.action}${x.overdue ? ', overdue' : ''})`).join('; ')}${f.length > 5 ? `; plus ${f.length - 5} more` : ''}. /follow-ups drafts them.`;
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
