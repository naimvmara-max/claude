// The sales pipeline: one Markdown table in ops/pipeline.md, one row per company.
// Every number on the dashboard is counted from these rows, so nothing is estimated.
// Commission comes from the package on each won row and the amounts in system/business.json.
// Shared by the server and the browser demo, so it has no imports.

export const COLUMNS = ['id', 'company', 'contact', 'email', 'phone', 'website', 'industry', 'city', 'channel', 'package', 'status', 'added', 'contacted', 'replied', 'booked', 'demo', 'closed', 'paid', 'next_date', 'next_action', 'notes'];

export const STAGES = ['researched', 'drafted', 'contacted', 'replied', 'booked', 'demo', 'won', 'lost'];

export const STAGE_LABELS = {
  researched: 'Researched', drafted: 'Drafted', contacted: 'Contacted', replied: 'Replied',
  booked: 'Meeting booked', demo: 'Demo held', won: 'Won', lost: 'Lost',
};

/** Which date column gets stamped when a company enters a stage. */
export const STAGE_DATE = { contacted: 'contacted', replied: 'replied', booked: 'booked', demo: 'demo', won: 'closed', lost: 'closed' };

export const CHANNELS = ['email', 'phone', 'linkedin', 'other'];
export const PACKAGES = ['S', 'M', 'L'];
const PACKAGE_NAMES = { S: 'Small', M: 'Medium', L: 'Large' };

// Older tables used other names; read them as the new ones.
const COLUMN_ALIASES = { niche: 'industry', call: 'booked' };
const STATUS_ALIASES = { call: 'booked', meeting: 'booked', proposal: 'demo' };

// Contacts, then the employer's own funnel: meeting booked, demo held, deal won.
const FUNNEL = ['researched', 'contacted', 'booked', 'demo', 'won'];

/** The usual next step after a company enters a stage: [action, days from today or null to clear]. */
export const NEXT_STEP = {
  researched: ['Draft first email or call', null],
  drafted: ['Send first email', 0],
  contacted: ['Follow-up 1', 3],
  replied: ['Reply and offer demo times', 0],
  booked: ['Demo meeting', 0],
  demo: ['Follow up after the demo', 2],
  won: ['Hand over to onboarding', 0],
  lost: ['', null],
};

// ------------------------------------------------------------------ Markdown table I/O

function splitRow(line) {
  const cells = [];
  let cur = '';
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '\\' && body[i + 1] === '|') { cur += '|'; i += 1; continue; }
    if (ch === '|') { cells.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/** Parse ops/pipeline.md: the text before the table, the rows, the text after. */
export function parsePipeline(md) {
  const lines = String(md || '').split('\n');
  const start = lines.findIndex((l) => /^\s*\|/.test(l) && /company/i.test(l) && /status/i.test(l));
  if (start < 0) return { before: md || '', after: '', rows: [] };
  const header = splitRow(lines[start]).map((h) => h.toLowerCase());
  let end = start + 1;
  const rows = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) break;
    end = i + 1;
    if (/^\s*\|\s*:?-{3,}/.test(lines[i])) continue;
    const cells = splitRow(lines[i]);
    const row = {};
    COLUMNS.forEach((c) => { row[c] = ''; });
    header.forEach((h, idx) => {
      const key = header.includes(COLUMN_ALIASES[h]) ? h : COLUMN_ALIASES[h] || h;
      if (key && (row[key] === '' || row[key] == null)) row[key] = cells[idx] ?? '';
    });
    row.status = STATUS_ALIASES[row.status] || row.status;
    if (row.company || row.email) rows.push(row);
  }
  return { before: lines.slice(0, start).join('\n'), after: lines.slice(end).join('\n'), rows };
}

const cell = (v) => String(v ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();

export function renderPipeline({ before, after, rows }) {
  const head = `| ${COLUMNS.join(' | ')} |`;
  const sep = `| ${COLUMNS.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${COLUMNS.map((c) => cell(r[c])).join(' | ')} |`);
  return `${String(before).replace(/\s+$/, '')}\n\n${[head, sep, ...body].join('\n')}\n${after ? `\n${String(after).replace(/^\s+/, '')}` : ''}`;
}

export function nextId(rows) {
  const max = rows.reduce((m, r) => Math.max(m, Number(String(r.id).replace(/\D/g, '')) || 0), 0);
  return `L${String(max + 1).padStart(3, '0')}`;
}

/** "Large", "large", "L" -> "L". Anything else -> "". */
export function packageOf(r) {
  const k = String(r?.package || '').trim().toUpperCase().slice(0, 1);
  return PACKAGES.includes(k) ? k : '';
}

/** Empty or "email" counts as email, "call"/"telefon" as phone. */
export function channelOf(r) {
  const c = String(r?.channel || '').trim().toLowerCase();
  if (!c || /^e-?mail|^mejl|^mail/.test(c)) return 'email';
  if (/^(phone|call|tel|ring|samtal)/.test(c)) return 'phone';
  return 'other';
}

/** Move a company to a stage and stamp that stage's date if it is not set yet. */
export function applyStatus(row, status, today) {
  status = STATUS_ALIASES[status] || status;
  if (!STAGES.includes(status)) throw new Error(`Unknown status "${status}".`);
  row.status = status;
  const col = STAGE_DATE[status];
  if (col && !row[col]) row[col] = today;
  // Stamp earlier stages too, so a company moved straight to "booked" still counts as contacted.
  // A cold call that books a meeting never "replied", so phone leads skip that stamp.
  const idx = STAGES.indexOf(status);
  if (status !== 'lost') {
    for (const s of ['contacted', 'replied', 'booked', 'demo']) {
      if (s === 'replied' && channelOf(row) === 'phone') continue;
      if (STAGES.indexOf(s) < idx && !row[STAGE_DATE[s]]) row[STAGE_DATE[s]] = today;
    }
  }
  let [action, days] = NEXT_STEP[status];
  if (status === 'contacted' && channelOf(row) === 'phone') [action, days] = ['Call again', 2];
  row.next_action = action;
  if (days == null) row.next_date = '';
  // A booked meeting keeps the meeting date if one was typed.
  else if (!(status === 'booked' && row.next_date >= today)) {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + days);
    row.next_date = isoLocal(d);
  }
  return row;
}

// ------------------------------------------------------------------ dates

export function isoLocal(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseDay(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function monday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

const DAY = 864e5;

/** Weekdays from today (inclusive) to the end of the month. */
export function workdaysLeft(today) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const month = d.getMonth();
  let n = 0;
  while (d.getMonth() === month) {
    if (d.getDay() !== 0 && d.getDay() !== 6) n += 1;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

// ------------------------------------------------------------------ money

/** Package names and commission per deal from system/business.json. */
export function packageInfo(business = {}) {
  const p = business.packages || {};
  return Object.fromEntries(PACKAGES.map((k) => [k, {
    name: p[k]?.name || PACKAGE_NAMES[k],
    commission: Number(p[k]?.commission) || 0,
  }]));
}

// ------------------------------------------------------------------ stats

/**
 * @param {object[]} rows   parsed pipeline rows
 * @param {{business?: object, today?: string}} opts
 */
export function computeStats(rows, opts = {}) {
  const b = opts.business || {};
  const pk = packageInfo(b);
  const defPkg = PACKAGES.includes(b.default_package) ? b.default_package : 'M';
  const today = parseDay(opts.today) || parseDay(isoLocal());
  const todayStr = isoLocal(today);
  const thisMon = monday(today);
  const weeks = Array.from({ length: 8 }, (_, i) => new Date(thisMon.getTime() - (7 - i) * 7 * DAY));
  const weekIdx = (d) => {
    if (!d) return -1;
    const diff = Math.floor((monday(d) - weeks[0]) / (7 * DAY) + 0.5);
    return diff >= 0 && diff < 8 ? diff : -1;
  };
  const inMonth = (d) => Boolean(d) && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d <= today;

  const contacts = new Array(8).fill(0);
  const booked = new Array(8).fill(0);
  const demos = new Array(8).fill(0);
  const earned = new Array(8).fill(0);
  const channelWeek = { email: 0, phone: 0, other: 0 };
  const dealsByPackage = { S: 0, M: 0, L: 0 };
  const wonThisMonth = [];
  let contactsToday = 0;
  let email30 = 0;
  let replied30 = 0;
  let contacted30 = 0;
  let booked30 = 0;
  let bookedMonth = 0;
  let demosMonth = 0;
  let commissionMonth = 0;
  let unpaid = 0;
  let paidMonth = 0;
  let missingPackage = 0;

  for (const r of rows) {
    const c = parseDay(r.contacted);
    const rep = parseDay(r.replied);
    const bk = parseDay(r.booked);
    const dm = parseDay(r.demo);
    const cl = parseDay(r.closed);
    const pd = parseDay(r.paid);
    const ch = channelOf(r);
    const wi = weekIdx(c);
    if (wi >= 0) contacts[wi] += 1;
    if (wi === 7) channelWeek[ch] += 1;
    if (c && isoLocal(c) === todayStr) contactsToday += 1;
    if (c && c <= today && today - c <= 30 * DAY) {
      contacted30 += 1;
      if (bk) booked30 += 1;
      if (ch === 'email') { email30 += 1; if (rep) replied30 += 1; }
    }
    if (bk) { const i = weekIdx(bk); if (i >= 0) booked[i] += 1; if (inMonth(bk)) bookedMonth += 1; }
    if (dm) { const i = weekIdx(dm); if (i >= 0) demos[i] += 1; if (inMonth(dm)) demosMonth += 1; }
    if (r.status === 'won') {
      const k = packageOf(r);
      const amount = k ? pk[k].commission : 0;
      if (!k) missingPackage += 1;
      const i = weekIdx(cl);
      if (i >= 0) earned[i] += amount;
      if (inMonth(cl)) {
        if (k) dealsByPackage[k] += 1;
        commissionMonth += amount;
        wonThisMonth.push({ id: r.id, company: r.company, package: k, closed: r.closed, commission: amount });
      }
      if (!pd) unpaid += amount;
      else if (inMonth(pd)) paidMonth += amount;
    }
  }
  wonThisMonth.sort((a, b) => a.closed.localeCompare(b.closed));

  const reached = (r, stage) => {
    if (stage === 'researched') return true;
    if (r[STAGE_DATE[stage]]) return stage !== 'won' || r.status === 'won';
    const si = STAGES.indexOf(r.status);
    return r.status !== 'lost' && si >= STAGES.indexOf(stage);
  };
  const funnel = FUNNEL.map((s) => ({ stage: s, label: STAGE_LABELS[s], count: rows.filter((r) => reached(r, s)).length }));
  const f = Object.fromEntries(funnel.map((x) => [x.stage, x.count]));

  const open = rows.filter((r) => !['won', 'lost'].includes(r.status));
  const inPlayRows = open.filter((r) => ['booked', 'demo'].includes(r.status));
  const followups = open
    .map((r) => {
      let due = r.next_date;
      let action = r.next_action;
      if (!due && r.status === 'contacted' && !r.replied && r.contacted) {
        const c = parseDay(r.contacted);
        const phone = channelOf(r) === 'phone';
        if (c) { due = isoLocal(new Date(c.getTime() + (phone ? 2 : 3) * DAY)); action = action || (phone ? 'Call again' : 'Follow-up 1'); }
      }
      return due && due <= todayStr ? { id: r.id, company: r.company, contact: r.contact, email: r.email, phone: r.phone, status: r.status, due, action: action || 'Follow up', overdue: due < todayStr } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.due.localeCompare(b.due));

  const labels = weeks.map((w) => isoLocal(w));
  const series = (arr) => labels.map((t, i) => ({ t, v: arr[i] }));
  const dealsMonth = wonThisMonth.length;
  const target = Number(b.goal_deals_month) || 0;

  return {
    currency: b.currency || 'NOK',
    sekPerNok: Number(b.sek_per_nok) || 0,
    packages: pk,
    defaultPackage: defPkg,
    confirmed: Boolean(b.confirmed),
    today: todayStr,
    leads: rows.length,
    contactsToday,
    dailyTarget: Number(b.daily_contacts) || 0,
    contactsWeek: contacts[7],
    contactsPrevWeek: contacts[6],
    channelWeek,
    contactsHistory: series(contacts),
    replyRate: email30 ? replied30 / email30 : null,
    email30,
    replied30,
    bookRate30: contacted30 ? booked30 / contacted30 : null,
    contacted30,
    booked30,
    bookedMonth,
    bookedHistory: series(booked),
    demosMonth,
    demosHistory: series(demos),
    dealsMonth,
    dealsByPackage,
    wonThisMonth,
    commissionMonth,
    commissionHistory: series(earned),
    unpaid,
    paidMonth,
    missingPackage,
    inPlay: { count: inPlayRows.length, commission: inPlayRows.reduce((a, r) => a + pk[packageOf(r) || defPkg].commission, 0) },
    won: rows.filter((r) => r.status === 'won').length,
    funnel,
    rates: {
      book: f.contacted ? f.booked / f.contacted : null,
      show: f.booked ? f.demo / f.booked : null,
      close: f.demo ? f.won / f.demo : null,
      sample: { contacted: f.contacted, booked: f.booked, demo: f.demo },
    },
    followups,
    goal: { target, value: dealsMonth, pct: target ? Math.min(100, Math.round((dealsMonth / target) * 100)) : 0 },
  };
}

// ------------------------------------------------------------------ goal math

/** How much of your own data a rate needs before it replaces the starting guess. */
export const MIN_SAMPLE = { book: 100, show: 5, close: 5 };

/**
 * Work backwards from the monthly deal goal: deals -> demos -> meetings -> contacts.
 * Uses your own conversion rates once there is enough data, the guesses in
 * business.json until then, and anything typed in the Pace tab over both.
 * @param {object} st         computeStats() result
 * @param {object} business   system/business.json
 * @param {{goal?: number, book?: number, show?: number, close?: number, mix?: {S:number,M:number,L:number}}} o  overrides, rates in percent
 */
export function goalMath(st, business = {}, o = {}) {
  const a = business.assumptions || {};
  const own = st.rates || {};
  const s = own.sample || {};
  const rate = (key, ownVal, enough, guessPct) => {
    if (o[key] != null && o[key] !== '') return { v: Number(o[key]) / 100, source: 'typed' };
    if (ownVal != null && enough) return { v: ownVal, source: 'yours' };
    return { v: (Number(guessPct) || 0) / 100, source: 'guess' };
  };
  const book = rate('book', own.book, s.contacted >= MIN_SAMPLE.book, a.book_rate ?? 2);
  const show = rate('show', own.show, s.booked >= MIN_SAMPLE.show, a.show_rate ?? 80);
  const close = rate('close', own.close, s.demo >= MIN_SAMPLE.close, a.close_rate ?? 10);

  const pk = st.packages || packageInfo(business);
  const mix = o.mix && PACKAGES.some((k) => Number(o.mix[k]) > 0) ? o.mix : null;
  const mixSum = mix ? PACKAGES.reduce((x, k) => x + (Number(mix[k]) || 0), 0) : 0;
  const avgCommission = mix
    ? PACKAGES.reduce((x, k) => x + (Number(mix[k]) || 0) * pk[k].commission, 0) / mixSum
    : pk[st.defaultPackage || 'M'].commission;

  const target = o.goal != null && o.goal !== '' ? Math.max(0, Number(o.goal) || 0) : st.goal.target;
  const done = st.goal.value;
  const left = Math.max(0, target - done);
  const perContact = book.v * show.v * close.v;
  const today = new Date(`${st.today}T12:00:00`);
  const days = workdaysLeft(today);
  const contactsNeeded = perContact ? left / perContact : null;

  return {
    book, show, close,
    target, done, left,
    perContact,
    demosNeeded: close.v ? left / close.v : null,
    meetingsNeeded: show.v && close.v ? left / (show.v * close.v) : null,
    contactsNeeded,
    workdaysLeft: days,
    perDay: contactsNeeded != null && days ? contactsNeeded / days : null,
    avgCommission,
    commissionAtGoal: target * avgCommission,
    commissionLeft: left * avgCommission,
    // A month of contacts at the guessed rates, for the "what does N contacts give me" view.
    dealsFrom: (contacts) => contacts * perContact,
  };
}
