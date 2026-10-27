// Automations: a skill that has worked five times in a row gets a schedule in
// system/backbone.json. The scheduler only runs while the Bridge is running.
// Anything marked "manual" never runs on its own.

import { localDate } from './vault.js';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const CATCH_UP_MS = 3 * 60 * 60 * 1000; // a missed run still fires if it is under 3 hours late

export function parseSchedule(spec) {
  const s = String(spec || 'manual').trim().toLowerCase();
  let m;
  if ((m = s.match(/^daily (\d{1,2}):(\d{2})$/))) return { kind: 'daily', h: +m[1], min: +m[2] };
  if ((m = s.match(/^weekdays (\d{1,2}):(\d{2})$/))) return { kind: 'weekdays', h: +m[1], min: +m[2] };
  if ((m = s.match(/^weekly (sun|mon|tue|wed|thu|fri|sat) (\d{1,2}):(\d{2})$/))) return { kind: 'weekly', day: DAYS.indexOf(m[1]), h: +m[2], min: +m[3] };
  if ((m = s.match(/^monthly (\d{1,2}) (\d{1,2}):(\d{2})$/))) return { kind: 'monthly', date: +m[1], h: +m[2], min: +m[3] };
  if ((m = s.match(/^event ([a-z0-9-]+)$/))) return { kind: 'event', event: m[1] };
  return { kind: 'manual' };
}

/** The most recent moment this schedule was due, or null if it is not due today. */
export function lastDue(sched, now = new Date()) {
  if (!['daily', 'weekdays', 'weekly', 'monthly'].includes(sched.kind)) return null;
  const due = new Date(now);
  due.setHours(sched.h, sched.min, 0, 0);
  if (sched.kind === 'weekly' && now.getDay() !== sched.day) return null;
  if (sched.kind === 'weekdays' && (now.getDay() === 0 || now.getDay() === 6)) return null;
  if (sched.kind === 'monthly' && now.getDate() !== sched.date) return null;
  return due <= now ? due : null;
}

const SV_DAYS = ['söndagar', 'måndagar', 'tisdagar', 'onsdagar', 'torsdagar', 'fredagar', 'lördagar'];
const SV_EVENTS = { 'meeting-booked': 'när ett möte bokas' };

/** A schedule in plain Swedish for the HUD. */
export function describe(spec) {
  const s = parseSchedule(spec);
  const hm = (x) => `${String(x.h).padStart(2, '0')}:${String(x.min).padStart(2, '0')}`;
  switch (s.kind) {
    case 'daily': return { icon: 'clock', text: `dagligen ${hm(s)}` };
    case 'weekdays': return { icon: 'clock', text: `vardagar ${hm(s)}` };
    case 'weekly': return { icon: 'clock', text: `${SV_DAYS[s.day]} ${hm(s)}` };
    case 'monthly': return { icon: 'clock', text: `den ${s.date} varje månad` };
    case 'event': return { icon: 'bolt', text: SV_EVENTS[s.event] || s.event.replace(/-/g, ' ') };
    default: return { icon: 'hand', text: 'manuell, du bestämmer' };
  }
}

export class Scheduler {
  constructor({ vault, runner, getSkills, engine = () => 'claude', tickSeconds = 30, log = console.log }) {
    Object.assign(this, { vault, runner, getSkills, engine, tickSeconds, log });
    this.timer = null;
  }

  state() {
    return this.vault.readJson('system/automation-state.json', {});
  }

  start() {
    this.tick();
    this.timer = setInterval(() => this.tick(), this.tickSeconds * 1000);
  }

  stop() {
    clearInterval(this.timer);
  }

  tick(now = new Date()) {
    const state = this.state();
    let changed = false;
    for (const skill of this.getSkills()) {
      const sched = parseSchedule(skill.schedule);
      const due = lastDue(sched, now);
      if (!due) continue;
      const last = state[skill.name] ? new Date(state[skill.name]) : null;
      if (last && last >= due) continue;
      if (now - due > CATCH_UP_MS) continue;
      state[skill.name] = now.toISOString();
      changed = true;
      try {
        this.runner.runSkill(skill.name, { engine: this.engine(), source: `schedule ${skill.schedule}` });
        this.log(`[scheduler] ${localDate(now)} ran /${skill.name} (${skill.schedule})`);
      } catch (err) {
        this.log(`[scheduler] could not run /${skill.name}: ${err.message}`);
      }
    }
    if (changed) this.vault.writeJson('system/automation-state.json', state);
  }

  /** Fire every skill wired to an event, e.g. POST /api/trigger/video-live. */
  trigger(event, input = '') {
    const fired = [];
    for (const skill of this.getSkills()) {
      const sched = parseSchedule(skill.schedule);
      if (sched.kind === 'event' && sched.event === event) {
        fired.push(this.runner.runSkill(skill.name, { engine: this.engine(), input, source: `event ${event}` }));
      }
    }
    return fired;
  }
}
