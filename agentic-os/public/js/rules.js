// Tier 1: answers built from saved data with no model call. Swedish, because Jarvis
// reads them aloud to Naim.
// Shared by the server and the browser demo.

import { goalMath } from './pipeline.js';

/** Swedish number style: 30 000 (a normal space keeps it readable aloud and in any font). */
const sv = (v, digits = 0) => Number(v).toLocaleString('sv-SE', { maximumFractionDigits: digits }).replace(/ | /g, ' ');

const fmtNum = (n) => {
  if (n == null || Number.isNaN(Number(n))) return 'inte satt';
  return sv(Math.round(Number(n)));
};

/** Whole kroner, never abbreviated: money is read exactly. */
const nok = (v) => `${sv(Math.round(Number(v) || 0))} NOK`;

export { fmtNum, nok, sv };

const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const pct = (v) => `${sv(v * 100, v < 0.1 ? 1 : 0)} %`;

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
      if (!d.length) return 'Inget fokus satt för idag. Kör /plan-today eller skriv tre rader under "## Fokus" i dagens anteckning.';
      return `Dagens fokus: ${d.map((x, i) => `${i + 1}. ${x.text}`).join(' ')}`;
    }
    case 'schedule': {
      const s = state.schedule || [];
      if (!s.length) return 'Inget på dagens schema ännu. /plan-today hämtar det från din kalender.';
      const hhmm = now.toTimeString().slice(0, 5);
      const next = s.find((e) => e.time >= hhmm);
      const list = s.map((e) => `${e.time} ${e.text}`).join('. ');
      return next ? `Nästa klockan ${next.time}: ${next.text}. Hela dagen: ${list}.` : `Dagens block är klara. Dagen var: ${list}.`;
    }
    case 'tasks': {
      const open = (state.tasks || []).filter((t) => !t.done);
      if (!open.length) return 'Inga öppna uppgifter. Antingen är du klar eller så är inget nedskrivet.';
      return `${open.length} öppna: ${open.slice(0, 5).map((t) => t.text).join('; ')}${open.length > 5 ? `; och ${open.length - 5} till` : ''}.`;
    }
    case 'numbers': {
      const st = state.stats;
      if (!st || !st.leads) return 'Inga företag i pipelinen ännu, så det finns inget att räkna. Kör /lead-research eller lägg till ett i Kommando, Pipeline.';
      const mix = packageMix(st.dealsByPackage, st.packages);
      const sek = st.sekPerNok && st.commissionMonth ? ` (ungefär ${sv(Math.round(st.commissionMonth * st.sekPerNok))} SEK)` : '';
      const goal = st.goal.target ? ` av ${st.goal.target}` : '';
      const deals = `Den här månaden: ${n(st.dealsMonth, 'affär', 'affärer')}${goal}${mix ? ` (${mix})` : ''}, ${nok(st.commissionMonth)} i provision${sek}.`;
      const week = ` Den här veckan ${n(st.contactsWeek, 'ny kontakt', 'nya kontakter')} (förra veckan ${st.contactsPrevWeek}).`;
      const funnel = ` ${n(st.bookedMonth, 'möte', 'möten')} ${st.bookedMonth === 1 ? 'bokat' : 'bokade'}, ${n(st.demosMonth, 'demo', 'demos')} ${st.demosMonth === 1 ? 'hållen' : 'hållna'} och ${n(st.offersOpen || 0, 'offert', 'offerter')} ute.`;
      const play = st.inPlay.count ? ` ${n(st.inPlay.count, 'affär', 'affärer')} pågår, ${st.inPlay.count === 1 ? 'värd' : 'värda'} upp till ${nok(st.inPlay.commission)} om ${st.inPlay.count === 1 ? 'den stänger' : 'de stänger'}.` : '';
      const payout = st.payoutNextMonth ? ` ${nok(st.payoutNextMonth)} kommer med lönen nästa månad.` : '';
      const late = st.overdueUnpaid ? ` ${nok(st.overdueUnpaid)} borde redan ha betalats ut: kolla med Driv.` : '';
      const unconfirmed = st.confirmed ? '' : ' Provisionsbeloppen är inte bekräftade ännu.';
      return `${deals}${week}${funnel}${play}${payout}${late}${unconfirmed}`;
    }
    case 'pace': {
      const st = state.stats;
      if (!st) return 'Ingen pipeline-data ännu.';
      const g = goalMath(st, state.business || {});
      if (!g.target) return 'Inget månadsmål satt. Skriv goal_deals_month i system/business.json.';
      if (!g.left) return `Du har ${n(g.done, 'affär', 'affärer')} den här månaden, så målet på ${g.target} är nått. Allt härifrån är extra provision.`;
      if (!g.perContact) return `${n(g.left, 'affär', 'affärer')} kvar till ${g.target}, men en av dina konverteringar är noll, så jag kan inte räkna ut takten. Titta i fliken Takt.`;
      const guessed = [g.book, g.show, g.close].filter((r) => r.source === 'guess').length;
      const src = guessed ? ' En del av siffrorna är startgissningar tills du har mer egen data.' : ' Det är dina egna siffror.';
      const perDay = g.workdaysLeft ? `, ungefär ${Math.ceil(g.perDay)} per arbetsdag de ${n(g.workdaysLeft, 'arbetsdag', 'arbetsdagar')} som är kvar` : '';
      return `${n(g.left, 'affär', 'affärer')} kvar till ${g.target}. När ${pct(g.book.v)} av kontakterna bokar möte, ${pct(g.show.v)} dyker upp och ${pct(g.close.v)} av demona stänger, krävs ungefär ${sv(Math.ceil(g.contactsNeeded))} nya kontakter${perDay}.${src}`;
    }
    case 'followups': {
      const f = state.stats?.followups || [];
      if (!f.length) return 'Inga uppföljningar eller återuppringningar idag.';
      return `${f.length} att göra: ${f.slice(0, 5).map((x) => `${x.company} (${x.action}${x.overdue ? ', försenad' : ''})`).join('; ')}${f.length > 5 ? `; och ${f.length - 5} till` : ''}. /follow-ups skriver mejlen, /call-list listar samtalen.`;
    }
    case 'time':
      return `Klockan är ${now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}, ${now.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}.`;
    case 'skills': {
      const s = state.skills || [];
      return `${s.length} skills laddade: ${s.map((x) => `/${x.name}`).join(', ')}.`;
    }
    default:
      return 'Ingen regel för det ännu.';
  }
}
