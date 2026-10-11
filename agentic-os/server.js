// THE BRIDGE: one brain for both front doors (the HUD in the browser and the
// Obsidian plugin). It takes every request, routes it to a tier, runs the work,
// and reads and records everything in the vault.
//
//   node server.js        then open http://127.0.0.1:3217
//
// No dependencies are required. `npm install` adds the optional Anthropic SDK for
// faster Tier 2 answers.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Vault, localDate } from './lib/vault.js';
import { loadSkills } from './lib/skills.js';
import { JobRunner } from './lib/jobs.js';
import { Scheduler, describe } from './lib/scheduler.js';
import { quickAnswer, modelClassify } from './lib/quick.js';
import { classify, TIER1_INTENTS } from './public/js/classify.js';
import { answerRule } from './public/js/rules.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'config.json'), 'utf8'));
const PORT = Number(process.env.PORT || cfg.port);
const HOST = cfg.host || '127.0.0.1';
const PUBLIC = path.join(here, 'public');

const vault = new Vault(path.resolve(here, cfg.vault));
const runner = new JobRunner({ vault, engines: cfg.engines });
let catalog = loadSkills(vault);
let activeEngine = 'claude';

const scheduler = new Scheduler({
  vault,
  runner,
  getSkills: () => catalog.skills,
  engine: () => activeEngine,
  tickSeconds: cfg.scheduler?.tickSeconds || 30,
});

// ---------------------------------------------------------------- live events

const clients = new Set();
function broadcast(type, data) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}
runner.on('job', (ev) => broadcast('job', ev));

let stateTimer = null;
function stateChanged() {
  clearTimeout(stateTimer);
  stateTimer = setTimeout(() => {
    catalog = loadSkills(vault);
    broadcast('state', { at: Date.now() });
  }, 400);
}
try {
  fs.watch(vault.root, { recursive: true }, (_e, file) => {
    if (!file || String(file).includes('.obsidian') || String(file).startsWith(`system${path.sep}log`)) return;
    stateChanged();
  });
} catch {
  // Recursive watch is unavailable on some Linux setups; the HUD also polls.
}

// ---------------------------------------------------------------- state

function state() {
  vault.ensureToday();
  const usage = runner.weekUsage();
  const budget = cfg.usage?.weeklyBudgetUsd || 40;
  return {
    name: cfg.name,
    owner: cfg.owner,
    tagline: cfg.tagline,
    now: new Date().toISOString(),
    mode: 'live',
    engine: activeEngine,
    engines: Object.fromEntries(Object.entries(cfg.engines).map(([id, e]) => [id, {
      label: e.label,
      core: e.core,
      available: runner.available[id]?.ok ?? null,
      version: runner.available[id]?.version || '',
      week: { ...usage[id], pct: Math.min(100, Math.round(((usage[id]?.costUsd || 0) / budget) * 100)) },
    }])),
    budgetUsd: budget,
    vitals: vault.vitals(),
    directives: vault.directives(),
    schedule: vault.schedule(),
    tasks: vault.tasks(),
    brief: vault.brief(),
    outputs: vault.outputs(12),
    todayNote: vault.todayNotePath(),
    skills: catalog.skills.map((s) => ({ ...s, when: describe(s.schedule) })),
    domains: catalog.domains,
    rules: catalog.rules,
    automations: scheduler.state(),
    jobs: runner.list(),
  };
}

function ctxForModel() {
  return {
    name: cfg.name,
    owner: cfg.owner,
    date: new Date().toDateString(),
    directives: vault.directives().map((d) => d.text).join('; '),
    skills: catalog.skills.map((s) => `/${s.name}`).join(', '),
    cwd: vault.root,
  };
}

// ---------------------------------------------------------------- the router

async function route(text) {
  const local = classify(text, { skills: catalog.skills, minConfidence: cfg.router.minConfidence });
  if (cfg.router.classifier !== 'haiku') return { ...local, classifier: 'local' };
  const choices = [
    ...TIER1_INTENTS.map((i) => ({ id: `rule:${i.id}`, hint: `answer from saved data: ${i.label}` })),
    { id: 'quick', hint: 'a short factual or advice answer, no files or research needed' },
    ...catalog.skills.map((s) => ({ id: `skill:${s.name}`, hint: `${s.task}: ${s.description.slice(0, 140)}` })),
  ];
  const picked = await modelClassify(text, choices, cfg);
  if (!picked) return { ...local, classifier: 'local (model unavailable)' };
  const label = (id) => local.choices.find((c) => c.id === id)?.label || id;
  const tier = (id) => (id.startsWith('rule:') ? 1 : id === 'quick' ? 2 : 3);
  const conf = Math.max(0, Math.min(1, Number(picked.confidence) || 0));
  const unsure = conf < cfg.router.minConfidence;
  const pickId = unsure ? 'quick' : picked.choice;
  return {
    text,
    classifier: 'haiku',
    unsure,
    reason: unsure ? 'model was unsure, using the cheapest tier' : 'model pick',
    pick: { id: pickId, tier: tier(pickId), label: label(pickId), p: unsure ? 1 - conf : conf },
    choices: [
      { id: picked.choice, tier: tier(picked.choice), label: label(picked.choice), p: conf },
      { id: picked.runner_up, tier: tier(picked.runner_up), label: label(picked.runner_up), p: 1 - conf },
    ],
  };
}

async function ask({ text, engine, force }) {
  if (!text || !String(text).trim()) throw Object.assign(new Error('Say or type something first.'), { status: 400 });
  if (engine && cfg.engines[engine]) activeEngine = engine;
  const r = await route(String(text));
  if (force) {
    const forced = r.choices.find((c) => c.id === force) || { id: force, tier: force.startsWith('rule:') ? 1 : force === 'quick' ? 2 : 3, label: force, p: 1 };
    r.pick = { ...forced };
    r.reason = 'you picked this route';
    r.unsure = false;
  }
  const { pick } = r;
  vault.logRequest({ tier: pick.tier, route: pick.label, text });

  if (pick.tier === 1) {
    return { route: r, tier: 1, answer: answerRule(pick.id.slice(5), state()) };
  }
  if (pick.tier === 2) {
    const q = await quickAnswer(String(text), ctxForModel(), cfg);
    return { route: r, tier: 2, ...q };
  }
  const skill = pick.id.slice(6);
  const job = runner.runSkill(skill, { engine: activeEngine, input: String(text), source: 'voice/text' });
  return {
    route: r,
    tier: 3,
    job,
    answer: `On it. Running /${skill} in ${cfg.engines[activeEngine].label}. The report lands in the vault when it finishes.`,
  };
}

// ---------------------------------------------------------------- http plumbing

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`, `[::1]:${PORT}`]);
const allowedOrigins = new Set([...allowedHosts].map((h) => `http://${h}`));

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) { reject(Object.assign(new Error('Request too large'), { status: 413 })); req.destroy(); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(Object.assign(new Error('Body must be JSON'), { status: 400 })); } });
  });
}

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const full = path.resolve(PUBLIC, rel);
  if (!full.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(full, (err, buf) => {
    if (err) return send(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  // The Bridge can start Claude Code with write access to your vault, so it only
  // answers pages it served itself: no other site, no other machine.
  if (!allowedHosts.has(req.headers.host)) return send(res, 403, { error: 'Host not allowed' });
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.has(origin)) return send(res, 403, { error: 'Origin not allowed' });
    if (!String(req.headers['content-type'] || '').includes('application/json')) return send(res, 415, { error: 'Send JSON' });
  }

  try {
    if (p === '/api/health') {
      return send(res, 200, { ok: true, engines: runner.available, vault: vault.root });
    }
    if (p === '/api/state' && req.method === 'GET') return send(res, 200, state());
    if (p === '/api/events' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`event: hello\ndata: {"at":${Date.now()}}\n\n`);
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
      req.on('close', () => { clearInterval(ping); clients.delete(res); });
      return;
    }
    if (p === '/api/classify' && req.method === 'POST') {
      const body = await readBody(req);
      return send(res, 200, await route(String(body.text || '')));
    }
    if (p === '/api/ask' && req.method === 'POST') {
      return send(res, 200, await ask(await readBody(req)));
    }
    if (p === '/api/run' && req.method === 'POST') {
      const body = await readBody(req);
      if (!catalog.skills.some((s) => s.name === body.skill)) return send(res, 404, { error: `No skill named "${body.skill}".` });
      if (body.engine && cfg.engines[body.engine]) activeEngine = body.engine;
      vault.logRequest({ tier: 3, route: `/${body.skill}`, text: body.input || '(button)' });
      return send(res, 200, { job: runner.runSkill(body.skill, { engine: activeEngine, input: body.input || '', source: 'button' }) });
    }
    if (p === '/api/terminal' && req.method === 'POST') {
      const body = await readBody(req);
      if (!String(body.prompt || '').trim()) return send(res, 400, { error: 'Type a task for the new terminal.' });
      if (body.engine && cfg.engines[body.engine]) activeEngine = body.engine;
      vault.logRequest({ tier: 3, route: 'terminal', text: body.prompt });
      return send(res, 200, { job: runner.runPrompt(String(body.prompt), { engine: activeEngine }) });
    }
    if (p === '/api/engine' && req.method === 'POST') {
      const body = await readBody(req);
      if (!cfg.engines[body.engine]) return send(res, 400, { error: 'Unknown engine' });
      activeEngine = body.engine;
      broadcast('state', { at: Date.now() });
      return send(res, 200, { engine: activeEngine });
    }
    if (p === '/api/jobs' && req.method === 'GET') return send(res, 200, runner.list());
    const jobMatch = p.match(/^\/api\/jobs\/([a-z0-9]+)(\/stop)?$/);
    if (jobMatch) {
      if (jobMatch[2] && req.method === 'POST') { runner.stop(jobMatch[1]); return send(res, 200, { ok: true }); }
      const job = runner.get(jobMatch[1]);
      return job ? send(res, 200, job) : send(res, 404, { error: 'No such job' });
    }
    if (p === '/api/tasks/toggle' && req.method === 'POST') {
      const body = await readBody(req);
      if (!/^(daily-notes|ops)\/[\w.-]+\.md$/.test(String(body.file))) return send(res, 400, { error: 'Tasks live in daily-notes/ or ops/.' });
      return send(res, 200, { done: vault.toggleTask(body.file, Number(body.line)) });
    }
    if (p === '/api/vitals' && req.method === 'POST') {
      const body = await readBody(req);
      return send(res, 200, vault.setVital(String(body.key), body.value));
    }
    const trig = p.match(/^\/api\/trigger\/([a-z0-9-]+)$/);
    if (trig && req.method === 'POST') {
      const body = await readBody(req);
      return send(res, 200, { fired: scheduler.trigger(trig[1], body.input || '') });
    }
    if (p === '/api/file' && req.method === 'GET') {
      const rel = String(url.searchParams.get('path') || '');
      if (!/\.(md|json)$/.test(rel)) return send(res, 400, { error: 'Only Markdown and JSON files can be read.' });
      const text = vault.read(rel, null);
      return text == null ? send(res, 404, { error: 'Not found' }) : send(res, 200, { path: rel, text });
    }
    if (p.startsWith('/api/')) return send(res, 404, { error: 'Unknown endpoint' });
    if (req.method === 'GET') return serveStatic(req, res, p);
    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    return send(res, err.status || 500, { error: err.message });
  }
});

// ---------------------------------------------------------------- boot

await runner.detect();
server.listen(PORT, HOST, () => {
  const engines = Object.entries(runner.available).map(([id, a]) => `${cfg.engines[id].label}: ${a.ok ? `ready ${a.version}` : 'not found'}`).join(' · ');
  console.log(`\n  ${cfg.name} / Agentic OS  ->  http://${HOST}:${PORT}`);
  console.log(`  vault   ${vault.root}`);
  console.log(`  engines ${engines}`);
  console.log(`  skills  ${catalog.skills.length} loaded · scheduler ${cfg.scheduler?.enabled === false || process.env.NO_SCHEDULER ? 'off' : 'on'}`);
  console.log(`  today   ${localDate()}\n`);
  if (cfg.scheduler?.enabled !== false && !process.env.NO_SCHEDULER) scheduler.start();
});
