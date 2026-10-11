// The outreach pipeline: one Markdown table in ops/pipeline.md, one row per lead.
// Every number on the dashboard is counted from these rows, so nothing is estimated.
// Shared by the server and the browser demo, so it has no imports.

export const COLUMNS = ['id', 'company', 'contact', 'email', 'website', 'niche', 'city', 'status', 'value', 'added', 'contacted', 'replied', 'call', 'proposal', 'closed', 'next_date', 'next_action', 'notes'];

export const STAGES = ['researched', 'drafted', 'contacted', 'replied', 'call', 'proposal', 'won', 'lost'];

export const STAGE_LABELS = {
  researched: 'Researched', drafted: 'Drafted', contacted: 'Contacted', replied: 'Replied',
  call: 'Call booked', proposal: 'Proposal', won: 'Won', lost: 'Lost',
};

/** Which date column gets stamped when a lead enters a stage. */
export const STAGE_DATE = { contacted: 'contacted', replied: 'replied', call: 'call', proposal: 'proposal', won: 'closed', lost: 'closed' };

const FUNNEL = ['researched', 'contacted', 'replied', 'call', 'proposal', 'won'];

/** The usual next step after a lead enters a stage: [action, days from today or null to clear]. */
export const NEXT_STEP = {
  researched: ['Draft first email', null],
  drafted: ['Send first email', 0],
  contacted: ['Follow-up 1', 3],
  replied: ['Reply and offer call times', 0],
  call: ['Call', 0],
  proposal: ['Follow up on proposal', 3],
  won: ['Onboard client', 0],
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
    header.forEach((h, idx) => { if (h) row[h] = cells[idx] ?? ''; });
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

/** Move a lead to a stage and stamp that stage's date if it is not set yet. */
export function applyStatus(row, status, today) {
  if (!STAGES.includes(status)) throw new Error(`Unknown status "${status}".`);
  row.status = status;
  const col = STAGE_DATE[status];
  if (col && !row[col]) row[col] = today;
  // stamp earlier stages too, so a lead moved straight to "call" still counts as contacted and replied
  const idx = STAGES.indexOf(status);
  if (status !== 'lost') {
    for (const s of ['contacted', 'replied', 'call', 'proposal']) {
      if (STAGES.indexOf(s) < idx && !row[STAGE_DATE[s]]) row[STAGE_DATE[s]] = today;
    }
  }
  const [action, days] = NEXT_STEP[status];
  row.next_action = action;
  if (days == null) row.next_date = '';
  else if (!(status === 'call' && row.next_date >= today)) {
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

// ------------------------------------------------------------------ stats

/**
 * @param {object[]} rows   parsed pipeline rows
 * @param {{goal?: number, dailyTarget?: number, currency?: string, today?: string}} opts
 */
export function computeStats(rows, opts = {}) {
  const today = parseDay(opts.today) || parseDay(isoLocal());
  const todayStr = isoLocal(today);
  const thisMon = monday(today);
  const weeks = Array.from({ length: 8 }, (_, i) => new Date(thisMon.getTime() - (7 - i) * 7 * DAY));
  const weekIdx = (d) => {
    if (!d) return -1;
    const diff = Math.floor((monday(d) - weeks[0]) / (7 * DAY) + 0.5);
    return diff >= 0 && diff < 8 ? diff : -1;
  };
  const num = (v) => Number(String(v || '').replace(/[^\d.]/g, '')) || 0;

  const sent = new Array(8).fill(0);
  const repliedOfSent = new Array(8).fill(0);
  const calls = new Array(8).fill(0);
  const wonByWeek = new Array(8).fill(0);
  let sentToday = 0;
  let contacted30 = 0;
  let replied30 = 0;
  let callsMonth = 0;
  let mrrBefore = 0;

  for (const r of rows) {
    const c = parseDay(r.contacted);
    const rep = parseDay(r.replied);
    const call = parseDay(r.call);
    const closed = parseDay(r.closed);
    const wi = weekIdx(c);
    if (wi >= 0) { sent[wi] += 1; if (rep) repliedOfSent[wi] += 1; }
    if (c && isoLocal(c) === todayStr) sentToday += 1;
    if (c && today - c <= 30 * DAY && c <= today) { contacted30 += 1; if (rep) replied30 += 1; }
    if (call) {
      const ci = weekIdx(call);
      if (ci >= 0) calls[ci] += 1;
      if (call.getFullYear() === today.getFullYear() && call.getMonth() === today.getMonth()) callsMonth += 1;
    }
    if (r.status === 'won') {
      const v = num(r.value);
      const ki = weekIdx(closed);
      if (ki >= 0) wonByWeek[ki] += v; else mrrBefore += v;
    }
  }

  const mrrHistory = [];
  let running = mrrBefore;
  for (let i = 0; i < 8; i += 1) { running += wonByWeek[i]; mrrHistory.push(running); }

  const reached = (r, stage) => {
    if (stage === 'researched') return true;
    if (r[STAGE_DATE[stage]]) return stage !== 'won' || r.status === 'won';
    const si = STAGES.indexOf(r.status);
    return r.status !== 'lost' && si >= STAGES.indexOf(stage);
  };

  const open = rows.filter((r) => !['won', 'lost'].includes(r.status));
  const followups = open
    .map((r) => {
      let due = r.next_date;
      let action = r.next_action;
      if (!due && r.status === 'contacted' && !r.replied && r.contacted) {
        const c = parseDay(r.contacted);
        if (c) { due = isoLocal(new Date(c.getTime() + 3 * DAY)); action = action || 'Follow-up 1'; }
      }
      return due && due <= todayStr ? { id: r.id, company: r.company, contact: r.contact, email: r.email, status: r.status, due, action: action || 'Follow up', overdue: due < todayStr } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.due.localeCompare(b.due));

  const mrr = rows.filter((r) => r.status === 'won').reduce((a, r) => a + num(r.value), 0);
  const goal = Number(opts.goal) || 0;
  const labels = weeks.map((w) => isoLocal(w));

  return {
    currency: opts.currency || 'EUR',
    today: todayStr,
    leads: rows.length,
    sentToday,
    dailyTarget: Number(opts.dailyTarget) || 0,
    sentWeek: sent[7],
    sentPrevWeek: sent[6],
    sentHistory: labels.map((t, i) => ({ t, v: sent[i] })),
    replyRate: contacted30 ? replied30 / contacted30 : null,
    contacted30,
    replied30,
    replyHistory: labels.map((t, i) => ({ t, v: sent[i] ? Math.round((repliedOfSent[i] / sent[i]) * 100) : 0 })),
    callsMonth,
    callsHistory: labels.map((t, i) => ({ t, v: calls[i] })),
    proposalsOpen: rows.filter((r) => r.status === 'proposal').length,
    won: rows.filter((r) => r.status === 'won').length,
    mrr,
    mrrHistory: labels.map((t, i) => ({ t, v: mrrHistory[i] })),
    pipelineValue: rows.filter((r) => ['replied', 'call', 'proposal'].includes(r.status)).reduce((a, r) => a + num(r.value), 0),
    funnel: FUNNEL.map((s) => ({ stage: s, label: STAGE_LABELS[s], count: rows.filter((r) => reached(r, s)).length })),
    followups,
    goal: { target: goal, value: mrr, pct: goal ? Math.min(100, Math.round((mrr / goal) * 100)) : 0 },
  };
}
