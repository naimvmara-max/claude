// Tier 1: answers built from saved data with no model call.
// Shared by the server and the browser demo.

import { goalMath } from './pipeline.js';

const fmtNum = (n) => {
  if (n == null || Number.isNaN(Number(n))) return 'not set';
  const v = Number(n);
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(v) >= 1e4) return `${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return v.toLocaleString('en-US');
};

/** Whole kroner with thousands separators, never abbreviated: money is read exactly. */
const nok = (v) => `${Math.round(Number(v) || 0).toLocaleString('en-US')} NOK`;

export { fmtNum, nok };

const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const pct = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0).replace(/\.0$/, '')}%`;

/** "2 Large, 1 Small" from { S, M, L } counts. */
export function packageMix(byPackage, packages) {
  return ['L', 'M', 'S'].filter((k) => byPackage?.[k]).map((k) => `${byPackage[k]} ${packages?.[k]?.name || k}`).join(', ');
}

/**
 * @param {string} intent  one of the TIER1_INTENTS ids
 * @param {object} state   { owner, directives, schedule, tasks, stats, business, skills, now }
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
      if (!st || !st.leads) return 'No companies in the pipeline yet, so there is nothing to count. Run /lead-research or add one in Command, Pipeline.';
      const mix = packageMix(st.dealsByPackage, st.packages);
      const sek = st.sekPerNok && st.commissionMonth ? ` (about ${Math.round(st.commissionMonth * st.sekPerNok).toLocaleString('en-US')} SEK)` : '';
      const goal = st.goal.target ? ` of your ${st.goal.target}` : '';
      const deals = `This month: ${n(st.dealsMonth, 'deal', 'deals')}${goal}${mix ? ` (${mix})` : ''}, ${nok(st.commissionMonth)} in commission${sek}.`;
      const week = ` This week ${n(st.contactsWeek, 'new contact', 'new contacts')} (last week ${st.contactsPrevWeek}).`;
      const funnel = ` ${n(st.bookedMonth, 'meeting', 'meetings')} booked and ${n(st.demosMonth, 'demo', 'demos')} held this month.`;
      const play = st.inPlay.count ? ` ${n(st.inPlay.count, 'deal is', 'deals are')} in play, worth up to ${nok(st.inPlay.commission)} if they close.` : '';
      const unpaid = st.unpaid ? ` ${nok(st.unpaid)} earned but not paid out yet.` : '';
      const unconfirmed = st.confirmed ? '' : ' The commission amounts are not confirmed in your contract yet.';
      return `${deals}${week}${funnel}${play}${unpaid}${unconfirmed}`;
    }
    case 'pace': {
      const st = state.stats;
      if (!st) return 'No pipeline data yet.';
      const g = goalMath(st, state.business || {});
      if (!g.target) return 'No monthly deal goal set. Put goal_deals_month in system/business.json.';
      if (!g.left) return `You have ${n(g.done, 'deal', 'deals')} this month, so the goal of ${g.target} is reached. Everything from here is extra commission.`;
      if (!g.perContact) return `${n(g.left, 'more deal', 'more deals')} to reach ${g.target}, but one of your conversion rates is zero, so I cannot work out the pace. Check the Pace tab.`;
      const guessed = [g.book, g.show, g.close].filter((r) => r.source === 'guess').length;
      const src = guessed ? ' Some of these rates are starting guesses until you have more of your own data.' : ' These are your own rates.';
      const perDay = g.workdaysLeft ? `, about ${Math.ceil(g.perDay)} a workday for the ${n(g.workdaysLeft, 'workday', 'workdays')} left` : '';
      return `${n(g.left, 'more deal', 'more deals')} to reach ${g.target}. With ${pct(g.book.v)} of contacts booking a meeting, ${pct(g.show.v)} showing up and ${pct(g.close.v)} of demos closing, that takes about ${Math.ceil(g.contactsNeeded).toLocaleString('en-US')} new contacts${perDay}.${src}`;
    }
    case 'followups': {
      const f = state.stats?.followups || [];
      if (!f.length) return 'No follow-ups or call-backs due today.';
      return `${f.length} due: ${f.slice(0, 5).map((x) => `${x.company} (${x.action}${x.overdue ? ', overdue' : ''})`).join('; ')}${f.length > 5 ? `; plus ${f.length - 5} more` : ''}. /follow-ups drafts the emails, /call-list lists the calls.`;
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
