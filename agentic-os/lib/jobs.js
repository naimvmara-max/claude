// Tier 3: real work. Each job is a headless Claude Code (or Codex) run inside the
// vault. Output streams to the HUD's terminal drawer and the final answer is saved
// back into the vault, so the next request can read it.

import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { localDate, localTime, slugify } from './vault.js';

const MAX_PARALLEL = 3;
const MAX_LOG = 600;

/**
 * Environment for an engine run. Claude Code bills an API key instead of your Claude
 * subscription whenever ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) is set, which shows up
 * as "Credit balance is too low". With billing "subscription" (the default) those are
 * removed so the run uses your logged-in plan.
 */
export function engineEnv(eng) {
  const env = { ...process.env };
  if ((eng.billing || 'subscription') === 'subscription') {
    delete env.ANTHROPIC_API_KEY;
    delete env.ANTHROPIC_AUTH_TOKEN;
  }
  return env;
}

/**
 * Arguments for an engine run. The prompt goes through stdin by default, so nothing
 * you type ever passes through the Windows shell.
 */
export function engineArgs(eng, prompt) {
  const args = [...eng.args];
  if (eng.model) args.push('--model', eng.model);
  return args.map((a) => (a === '{prompt}' ? prompt : a));
}

const HINTS = [
  {
    test: /credit balance|insufficient credit|billing|purchase credits|out of credits/i,
    lines: [
      'FIX: Claude Code is billing API credits instead of your subscription.',
      '1. In a terminal run: claude   then type /status and check the login method.',
      '2. If it says API key or Console: type /logout, run claude again and pick "Claude account with subscription".',
      '3. Remove ANTHROPIC_API_KEY from your environment variables if you set one, then restart the Bridge.',
      '4. In claude, type /model and pick a model without "1M" if it shows one; 1M-context models can need extra usage.',
    ],
  },
  {
    test: /has not been trusted|trust dialog/i,
    lines: ['FIX: open a terminal in the vault folder, run claude, choose "Yes, proceed", then type /exit. Runs can then use the vault\'s allowed tools.'],
  },
  {
    test: /not logged in|please run \/login|invalid api key|authentication/i,
    lines: ['FIX: run claude in a terminal and log in with your Claude account, then try again.'],
  },
];

export function probe(bin) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok, version = '') => { if (!done) { done = true; resolve({ ok, version }); } };
    try {
      const isWin = process.platform === 'win32';
      const child = spawn(bin, ['--version'], { shell: isWin, stdio: ['ignore', 'pipe', 'ignore'] });
      let out = '';
      child.stdout.on('data', (d) => { out += d; });
      child.on('error', () => finish(false));
      child.on('close', (code) => finish(code === 0, out.trim().split('\n')[0] || ''));
      setTimeout(() => { child.kill(); finish(false); }, 8000);
    } catch { finish(false); }
  });
}

export class JobRunner extends EventEmitter {
  constructor({ vault, engines }) {
    super();
    this.vault = vault;
    this.engines = engines;
    this.jobs = new Map();
    this.queue = [];
    this.available = {};
  }

  async detect() {
    for (const [id, eng] of Object.entries(this.engines)) {
      this.available[id] = await probe(eng.bin);
    }
    return this.available;
  }

  list() {
    return [...this.jobs.values()]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 30)
      .map(({ child, log, hinted, ...rest }) => ({ ...rest, lines: log.length }));
  }

  get(id) {
    const j = this.jobs.get(id);
    if (!j) return null;
    const { child, hinted, ...rest } = j;
    return rest;
  }

  skillPrompt(skill, input, source) {
    const now = new Date();
    return [
      `You are running the "${skill}" skill for Naim's Agentic OS.`,
      `Read .claude/skills/${skill}/SKILL.md and follow it exactly. The vault rules are in CLAUDE.md.`,
      `Today is ${localDate(now)}, local time ${localTime(now)}. Trigger: ${source}.`,
      `Input from Naim: ${input ? input : '(none, this is a scheduled run)'}`,
      'Save the deliverable where the skill says. Finish with a summary of at most three lines.',
    ].join('\n');
  }

  runSkill(skill, { engine = 'claude', input = '', source = 'manual' } = {}) {
    return this.start({ engine, skill, title: `/${skill}`, prompt: this.skillPrompt(skill, input, source), source });
  }

  runPrompt(prompt, { engine = 'claude', source = 'terminal' } = {}) {
    const title = prompt.replace(/\s+/g, ' ').slice(0, 60);
    return this.start({ engine, skill: null, title, prompt, source });
  }

  start({ engine, skill, title, prompt, source }) {
    const eng = this.engines[engine];
    if (!eng) throw new Error(`Unknown engine "${engine}".`);
    if (this.available[engine] && !this.available[engine].ok) {
      throw new Error(`${eng.label} is not installed or not on PATH. Install it, then restart the Bridge.`);
    }
    const id = `j${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const job = { id, engine, skill, title, source, prompt, status: 'queued', startedAt: Date.now(), endedAt: null, costUsd: null, result: '', savedTo: null, log: [], child: null };
    this.jobs.set(id, job);
    this.emit('job', { type: 'queued', job: this.get(id) });
    this.queue.push(id);
    this.pump();
    return this.get(id);
  }

  running() {
    return [...this.jobs.values()].filter((j) => j.status === 'running').length;
  }

  pump() {
    while (this.running() < MAX_PARALLEL && this.queue.length) {
      const id = this.queue.shift();
      const job = this.jobs.get(id);
      if (job && job.status === 'queued') this.exec(job);
    }
  }

  push(job, kind, text) {
    if (kind === 'err' || kind === 'out') this.hint(job, text);
    const entry = { t: Date.now(), kind, text: String(text).slice(0, 4000) };
    job.log.push(entry);
    if (job.log.length > MAX_LOG) job.log.splice(0, job.log.length - MAX_LOG);
    this.emit('job', { type: 'log', id: job.id, entry });
  }

  /** When an error has a known fix, print the fix once under it. */
  hint(job, text) {
    job.hinted ||= new Set();
    HINTS.forEach((h, i) => {
      if (job.hinted.has(i) || !h.test.test(String(text))) return;
      job.hinted.add(i);
      setTimeout(() => h.lines.forEach((line) => this.push(job, 'hint', line)), 0);
    });
  }

  exec(job) {
    const eng = this.engines[job.engine];
    const viaStdin = (eng.promptVia || 'stdin') === 'stdin';
    const child = spawn(eng.bin, engineArgs(eng, job.prompt), {
      cwd: this.vault.root,
      env: engineEnv(eng),
      // Windows needs the shell to find claude.cmd. The arguments are fixed config,
      // and the prompt travels through stdin, so nothing typed reaches the shell.
      shell: process.platform === 'win32',
      stdio: [viaStdin ? 'pipe' : 'ignore', 'pipe', 'pipe'],
    });
    if (viaStdin) {
      child.stdin.on('error', () => {});
      child.stdin.end(job.prompt);
    }
    job.child = child;
    job.status = 'running';
    this.emit('job', { type: 'start', job: this.get(job.id) });
    this.push(job, 'sys', `$ ${eng.bin} ${job.skill ? `(skill ${job.skill})` : '(prompt)'} · cwd vault/`);

    const streamJson = eng.args.includes('stream-json');
    let buf = '';
    child.stdout.on('data', (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        if (streamJson) this.claudeEvent(job, line);
        else this.push(job, 'out', line);
      }
    });
    child.stderr.on('data', (chunk) => {
      for (const line of String(chunk).split('\n')) if (line.trim()) this.push(job, 'err', line.trim());
    });
    child.on('error', (err) => {
      this.push(job, 'err', err.message);
      this.finish(job, 'failed');
    });
    child.on('close', (code) => {
      if (buf.trim()) streamJson ? this.claudeEvent(job, buf.trim()) : this.push(job, 'out', buf.trim());
      this.finish(job, code === 0 ? 'done' : 'failed');
    });
  }

  /** Turn Claude Code's stream-json events into readable terminal lines. */
  claudeEvent(job, line) {
    let ev;
    try { ev = JSON.parse(line); } catch { this.push(job, 'out', line); return; }
    if (ev.type === 'system' && ev.subtype === 'init') {
      this.push(job, 'sys', `session ${String(ev.session_id || '').slice(0, 8)} · model ${ev.model || 'default'}`);
    } else if (ev.type === 'assistant' && ev.message?.content) {
      for (const block of ev.message.content) {
        if (block.type === 'text' && block.text.trim()) this.push(job, 'out', block.text.trim());
        if (block.type === 'tool_use') {
          const input = block.input || {};
          const hint = input.file_path || input.path || input.pattern || input.query || input.url || input.command || input.skill || '';
          this.push(job, 'tool', `→ ${block.name}${hint ? ` ${String(hint).slice(0, 120)}` : ''}`);
        }
      }
    } else if (ev.type === 'user' && Array.isArray(ev.message?.content)) {
      for (const block of ev.message.content) {
        if (block.type === 'tool_result' && block.is_error) this.push(job, 'err', `tool error: ${JSON.stringify(block.content).slice(0, 200)}`);
      }
    } else if (ev.type === 'result') {
      job.result = ev.result || '';
      if (ev.is_error && ev.result) this.push(job, 'err', ev.result);
      job.costUsd = typeof ev.total_cost_usd === 'number' ? ev.total_cost_usd : null;
      this.push(job, ev.is_error ? 'err' : 'sys', `${ev.is_error ? 'failed' : 'finished'} · ${ev.num_turns ?? '?'} turns · ${Math.round((ev.duration_ms || 0) / 1000)}s${job.costUsd != null ? ` · $${job.costUsd.toFixed(3)}` : ''}`);
      job.isError = Boolean(ev.is_error); // status flips in finish(), once the process has exited
    }
  }

  finish(job, status) {
    if (job.endedAt) return;
    if (job.status !== 'stopped') job.status = job.isError ? 'failed' : status;
    job.endedAt = Date.now();
    if (!job.result) job.result = job.log.filter((e) => e.kind === 'out').slice(-40).map((e) => e.text).join('\n');
    try {
      const d = new Date(job.startedAt);
      const rel = `outputs/runs/${localDate(d)}-${localTime(d).replace(':', '')}-${slugify(job.skill || job.title)}.md`;
      const body = [
        '---',
        `engine: ${job.engine}`,
        `skill: ${job.skill || 'none'}`,
        `source: ${job.source}`,
        `status: ${job.status}`,
        `cost_usd: ${job.costUsd ?? 'unknown'}`,
        `started: ${new Date(job.startedAt).toISOString()}`,
        '---',
        '',
        `# ${job.title}`,
        '',
        job.result || '_No output._',
        '',
      ].join('\n');
      job.savedTo = this.vault.write(rel, body);
      this.recordUsage(job);
    } catch (err) {
      this.push(job, 'err', `could not save run: ${err.message}`);
    }
    job.child = null;
    this.emit('job', { type: 'end', job: this.get(job.id) });
    this.pump();
  }

  stop(id) {
    const job = this.jobs.get(id);
    if (!job) throw new Error('No such job.');
    if (job.status === 'queued') { job.status = 'stopped'; this.finish(job, 'stopped'); return; }
    if (job.child) { job.status = 'stopped'; job.child.kill('SIGTERM'); this.push(job, 'sys', 'stopped by you'); this.finish(job, 'stopped'); }
  }

  recordUsage(job) {
    const u = this.vault.readJson('system/usage.json', { runs: [] });
    u.runs.push({ t: new Date(job.startedAt).toISOString(), engine: job.engine, skill: job.skill, status: job.status, cost: job.costUsd });
    u.runs = u.runs.slice(-500);
    this.vault.writeJson('system/usage.json', u);
  }

  /** This week's runs per engine, counted from Monday 00:00 local time. */
  weekUsage() {
    const u = this.vault.readJson('system/usage.json', { runs: [] });
    const now = new Date();
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const out = {};
    for (const id of Object.keys(this.engines)) out[id] = { runs: 0, costUsd: 0 };
    for (const r of u.runs) {
      if (new Date(r.t) < monday || !out[r.engine]) continue;
      out[r.engine].runs += 1;
      out[r.engine].costUsd += r.cost || 0;
    }
    return out;
  }
}
