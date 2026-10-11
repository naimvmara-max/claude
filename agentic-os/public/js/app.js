// The HUD: one page, four views (HUD, Command, Backbone, Router) and the terminal dock.
// Talks to the Bridge at /api. With no Bridge it runs in demo mode on example data.

import { Core } from './core.js';
import { classify } from './classify.js';
import { fmtNum } from './rules.js';
import { demoState, demoAsk, demoRun, demoFile, demoStopped } from './demo.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(`aos:${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`aos:${k}`, JSON.stringify(v)); } catch { /* storage blocked */ } },
};

const app = {
  state: null,
  demo: false,
  view: 'hud',
  tab: 'overview',
  jobs: new Map(),
  activeJob: null,
  transcript: [],
  manualState: null,
  listening: false,
  speaking: false,
  busy: 0,
  lastError: 0,
  composing: false,
};

const core = new Core($('#core'));
core.setSlot($('#core-slot'));

// ------------------------------------------------------------------ api

async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function timeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// ------------------------------------------------------------------ boot

async function boot() {
  if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embed');
  app.demo = Boolean(window.__AOS_DEMO__);
  if (!app.demo) {
    try { await timeout(api('/api/health'), 1800); } catch { app.demo = true; }
  }
  bind();
  await refresh();
  setEngine(app.state.engine || 'claude', { silent: true });
  const fromHash = location.hash.slice(1);
  setView(['hud', 'command', 'backbone', 'router'].includes(fromHash) ? fromHash : store.get('view', 'hud'));
  if (!app.demo) {
    connectEvents();
    setInterval(refresh, 60_000);
  }
  clock();
  setInterval(clock, 1000);
  setInterval(syncCore, 400);
}

let refreshing = null;
async function refresh() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      app.state = app.demo ? app.state || demoState() : await api('/api/state');
      for (const j of app.state.jobs || []) upsertJob(j);
      renderAll();
    } catch (err) {
      toast(`Could not load state: ${err.message}`);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

let refreshTimer = null;
function softRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 500);
}

function connectEvents() {
  const es = new EventSource('/api/events');
  es.addEventListener('job', (e) => onJobEvent(JSON.parse(e.data)));
  es.addEventListener('state', softRefresh);
  es.onerror = () => { $('#status-line') && renderStatus(false); };
  es.onopen = () => renderStatus(true);
}

// ------------------------------------------------------------------ render

function renderAll() {
  const s = app.state;
  $('#os-name').textContent = s.name;
  $('#os-tag').textContent = s.tagline;
  document.title = `${s.name.charAt(0)}${s.name.slice(1).toLowerCase()} Agentic OS`;
  for (const btn of $$('.engine button')) {
    const e = s.engines[btn.dataset.engine];
    btn.title = e?.available === false ? `${e.label} is not installed on this machine` : `${e?.label} ${e?.version || ''}`.trim();
    btn.querySelector('.off')?.remove();
    if (e?.available === false) btn.insertAdjacentHTML('beforeend', '<span class="off">offline</span>');
  }
  renderStatus(true);
  renderVitals();
  renderUsage();
  renderChecks('#directives', s.directives, 'No directives yet. Add three under "## Directives" in today\'s note.');
  renderDocs();
  renderQuickSkills();
  renderCommand();
  renderBackbone();
  renderRouter();
  renderSkillList();
  renderDock();
  if (!$('#answer').children.length) renderWelcome();
  syncCore();
}

const TRY = ['what are my priorities?', 'plan my day', 'write 10 hooks for a hoodie drop', 'explain CPM in one line'];

function renderWelcome() {
  $('#answer').innerHTML = `<div class="answer">
    <span class="label">Try asking</span>
    <div class="route-alt">${TRY.map((t) => `<button data-try="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    <span class="label" style="text-transform:none;letter-spacing:0;font-size:11px">Each message is routed to Tier 1 (saved data), Tier 2 (quick model) or Tier 3 (a skill in Claude Code or Codex). You see the odds.</span>
  </div>`;
  $$('#answer [data-try]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.try)));
}

function renderStatus(connected = true) {
  const s = app.state;
  if (!s) return;
  const running = [...app.jobs.values()].filter((j) => j.status === 'running' || j.status === 'queued').length;
  const st = currentState();
  $('#status-line').innerHTML = [
    `<span class="dot">Core · ${esc(st)}</span>`,
    app.demo ? '<span class="dot warn">Demo data</span>' : `<span class="${connected ? 'dot' : 'dot warn'}">${connected ? 'Connected vault' : 'Bridge offline'}</span>`,
    `<span>Terminals · ${running ? `${running} running` : 'connected'}</span>`,
  ].join('');
  $('#vault-pill').textContent = app.demo ? 'Demo data' : 'Connected vault';
  $('#vault-pill').classList.toggle('demo', app.demo);
  $('#foot-text').textContent = `V2 · ${app.demo ? 'Demo, no vault connected' : 'Connected vault'} · Shared agent terminals`;
}

function delta(m) {
  const h = m.history || [];
  if (h.length < 2) return { text: '', up: false };
  const d = h[h.length - 1].v - h[h.length - 2].v;
  return { text: `${d > 0 ? '▲' : d < 0 ? '▼' : '·'} ${m.prefix || ''}${fmtNum(Math.abs(d))} ${m.unit || ''}`.trim(), up: d > 0 };
}

function sparkline(m, color) {
  const h = (m.history || []).map((p) => p.v);
  if (h.length < 2) return '';
  const min = Math.min(...h);
  const max = Math.max(...h);
  const span = max - min || 1;
  const pts = h.map((v, i) => [(i / (h.length - 1)) * 100, 22 - ((v - min) / span) * 18]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('');
  const last = pts[pts.length - 1];
  return `<div style="position:relative">
    <svg class="spark" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
      <path class="a" d="${d}L100,26L0,26Z" fill="${color}"/>
      <path class="l" d="${d}" stroke="${color}" vector-effect="non-scaling-stroke"/>
    </svg>
    <span style="position:absolute;left:calc(${last[0]}% - 4px);top:${last[1] - 4}px;width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 0 2px var(--bg),0 0 10px ${color}"></span>
  </div>`;
}

const VITAL_COLORS = { tiktok: '#f2876a', instagram: '#b58cff', revenue: '#f2c46a', latest: '#7fd0ff' };

function renderVitals() {
  const v = app.state.vitals || { metrics: {} };
  const keys = ['tiktok', 'instagram', 'latest'].filter((k) => v.metrics[k]);
  const html = keys.map((k) => {
    const m = v.metrics[k];
    const d = delta(m);
    return `<div class="vital" data-key="${k}">
      <div class="vital-top"><span class="label">${esc(m.label)}</span><span class="delta ${d.up ? 'up' : ''}">${esc(d.text)}</span></div>
      <div class="num">${esc(m.prefix || '')}${fmtNum(m.value)}</div>
      ${sparkline(m, VITAL_COLORS[k] || '#9aa')}
    </div>`;
  });
  if (v.example) html.push('<span class="example-chip" title="Run /pull-metrics or edit system/vitals.json">Example numbers · run /pull-metrics</span>');
  $('#vitals').innerHTML = html.join('') || '<p class="empty">No numbers yet. Run /pull-metrics.</p>';
}

function engineInfo() {
  const s = app.state;
  return { id: s.engine, ...s.engines[s.engine] };
}

function renderUsage() {
  const e = engineInfo();
  const pct = e.week?.pct ?? 0;
  const on = Math.round((pct / 100) * 24);
  $('#usage-card').innerHTML = `<div class="usage">
    <i class="b1"></i><i class="b2"></i>
    <div class="label">${esc(e.core)} · weekly load</div>
    <div class="big"><span class="num">${pct}</span><span class="label">% of budget</span></div>
    <div class="ticks" aria-hidden="true">${Array.from({ length: 24 }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</div>
    <div class="scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
    <div class="foot">$${(e.week?.costUsd || 0).toFixed(2)} of $${app.state.budgetUsd} · ${e.week?.runs || 0} runs this week${app.demo ? ' · example' : ''}</div>
  </div>`;
}

function renderChecks(sel, items, emptyText) {
  const el = $(sel);
  if (!items || !items.length) { el.innerHTML = `<li class="empty">${esc(emptyText)}</li>`; return; }
  el.innerHTML = items.map((it, i) => `<li class="${it.done ? 'done' : ''}">
    <button class="box" data-i="${i}" aria-label="${it.done ? 'Mark not done' : 'Mark done'}: ${esc(it.text)}" aria-pressed="${it.done}"></button>
    <span>${esc(it.text)}</span></li>`).join('');
  $$('.box', el).forEach((b) => b.addEventListener('click', () => toggleItem(items[Number(b.dataset.i)])));
}

async function toggleItem(item) {
  if (app.demo || item.file === 'demo') { item.done = !item.done; renderAll(); return; }
  try {
    await api('/api/tasks/toggle', { file: item.file, line: item.line });
    await refresh();
  } catch (err) { toast(err.message); }
}

function ago(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 60) return `${Math.max(1, m)}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

function renderDocs() {
  const out = (app.state.outputs || []).slice(0, 3);
  $('#docs').innerHTML = out.length
    ? out.map((o) => `<button class="doc-link" data-path="${esc(o.path)}"><span>${esc(o.folder)}/${esc(o.name)}</span><small>${ago(o.mtime)}</small></button>`).join('')
    : '<p class="empty">No reports yet. Every skill saves one to outputs/.</p>';
  $$('#docs .doc-link').forEach((b) => b.addEventListener('click', () => openFile(b.dataset.path)));
}

function quickSkills() {
  const q = app.state.skills.filter((s) => s.quick);
  return (q.length ? q : app.state.skills).slice(0, 4);
}

function renderQuickSkills() {
  $('#quick-skills').innerHTML = quickSkills().map((s) => `<button class="skill-btn" data-skill="${esc(s.name)}" title="/${esc(s.name)} · ${esc(s.task)}">${esc(s.label)} <span class="arr">→</span></button>`).join('');
  $$('#quick-skills .skill-btn').forEach((b) => b.addEventListener('click', () => runSkill(b.dataset.skill)));
  $('#skill-count').textContent = `${app.state.skills.length} ↗`;
}

function whenIcon(w) {
  const id = w?.icon === 'bolt' ? 'i-bolt' : w?.icon === 'hand' ? 'i-hand' : 'i-clock';
  return `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
}

function renderSkillList() {
  $('#skill-list').innerHTML = app.state.skills.map((s) => `<div class="skill-row">
    <span class="cmd">/${esc(s.name)}</span>
    <p>${esc(s.task)} · ${esc(s.does)}</p>
    <span class="label when">${whenIcon(s.when)} ${esc(s.when?.text || '')} · ${esc((s.connectors || []).join(', '))}</span>
    <button class="ghost-btn run" data-skill="${esc(s.name)}">Run</button>
  </div>`).join('');
  $$('#skill-list .run').forEach((b) => b.addEventListener('click', () => { $('#skills-dlg').close(); runSkill(b.dataset.skill); }));
}

// ------------------------------------------------------------------ command view

const GLYPH = { tiktok: 'i-tiktok', instagram: 'i-ig', revenue: 'i-bag', latest: 'i-play' };

function renderCommand() {
  const s = app.state;
  const e = engineInfo();
  const v = s.vitals || { metrics: {} };
  const pct = e.week?.pct ?? 0;
  const metrics = ['tiktok', 'instagram', 'revenue', 'latest'].filter((k) => v.metrics[k]).map((k) => {
    const m = v.metrics[k];
    const d = delta(m);
    return `<div class="glass metric">
      <span class="label">${esc(m.short || m.label)}</span>
      <span class="num">${esc(m.prefix || '')}${fmtNum(m.value)}</span>
      <span class="delta ${d.up ? 'up' : ''}">${esc(d.text || '—')}</span>
      <svg class="glyph" aria-hidden="true" style="color:${VITAL_COLORS[k]}"><use href="#${GLYPH[k]}"/></svg>
      <span class="live ${v.example ? 'example' : ''}" title="${v.example ? 'Example data' : 'From the vault'}"></span>
    </div>`;
  }).join('');
  const lp = v.latest_post;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const sched = s.schedule || [];
  const nowIdx = sched.findIndex((it, i) => it.time <= hhmm && (!sched[i + 1] || sched[i + 1].time > hhmm));
  const timeline = sched.length
    ? sched.map((it, i) => `<div class="${i < nowIdx ? 'past' : i === nowIdx ? 'now' : ''}"><time>${esc(it.time)}</time><span>${esc(it.text)}</span></div>`).join('')
    : '<p class="empty">No schedule for today. <button data-run="plan-today">Run /plan-today</button></p>';
  const brief = s.brief && s.brief.bullets?.length
    ? `<ul>${s.brief.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
    : '<p class="empty">No brief yet. /morning-intel runs daily at 06:30. <button data-run="morning-intel">Run it now</button></p>';
  const ordered = [...s.skills.filter((x) => x.quick), ...s.skills.filter((x) => !x.quick)];
  const wf = ordered.slice(0, 10).map((sk) => `<button class="wf" data-skill="${esc(sk.name)}" title="/${esc(sk.name)}">${esc(sk.label)}</button>`).join('');

  $('#tab-overview').innerHTML = `
    <div class="glass wide-usage">
      <div><div class="label">${esc(e.label)} · weekly load</div><div class="num">${pct}<small>%</small></div></div>
      <div class="meter" role="img" aria-label="${pct} percent of weekly budget"><div class="fill" style="width:${pct}%"></div></div>
      <div class="meter-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
    </div>
    <div class="metrics">${metrics}</div>
    ${lp ? `<div class="glass latest"><span class="label">Latest upload · ${esc(lp.platform)}${v.example ? ' · example' : ''}</span><h3>${esc(lp.title)}</h3>
      <div class="stats"><span><b>${fmtNum(lp.views)}</b>views</span><span><b>${fmtNum(lp.likes)}</b>likes</span><span><b>${fmtNum(lp.comments)}</b>comments</span><span>${esc(lp.posted)}</span></div></div>` : ''}
    <div class="workflows">${wf}${s.skills.length > 10 ? '<button class="wf" id="more-wf">More workflows…</button>' : ''}</div>
    <div class="today-grid">
      <div class="glass today"><span class="label">Today</span><div class="timeline">${timeline}</div></div>
      <div class="glass tasks-card"><span class="label">Tasks</span><ul class="checks" id="cmd-tasks"></ul></div>
    </div>
    <div class="glass brief"><span class="label">Morning brief${s.brief?.title === 'Example brief' ? ' · example' : ''}</span>${brief}</div>`;
  renderChecks('#cmd-tasks', s.tasks, 'No open tasks.');
  $$('#tab-overview .wf[data-skill]').forEach((b) => b.addEventListener('click', () => runSkill(b.dataset.skill)));
  $('#more-wf')?.addEventListener('click', () => $('#skills-dlg').showModal());
  $$('#tab-overview [data-run]').forEach((b) => b.addEventListener('click', () => runSkill(b.dataset.run)));

  // audience: one single-series chart per metric
  $('#tab-audience').innerHTML = `<div class="chart-grid">${['tiktok', 'instagram', 'latest', 'revenue'].filter((k) => v.metrics[k]).map((k) => {
    const m = v.metrics[k];
    return `<div class="glass chart-card" data-key="${k}"><span class="label">${esc(m.label)}${v.example ? ' · example' : ''}</span>
      <div class="num" style="font-size:28px">${esc(m.prefix || '')}${fmtNum(m.value)}</div>${areaChart(m, VITAL_COLORS[k])}</div>`;
  }).join('')}</div>`;
  $$('#tab-audience .chart-card').forEach((card) => wireChart(card, v.metrics[card.dataset.key]));

  const outs = s.outputs || [];
  $('#tab-research').innerHTML = `<div class="glass research-list"><span class="label">Reports in outputs/</span>${outs.length
    ? outs.map((o) => `<button class="doc-link" data-path="${esc(o.path)}"><span>${esc(o.folder)} / ${esc(o.name)}</span><small>${ago(o.mtime)} ago</small></button>`).join('')
    : '<p class="empty">Nothing yet. Run /deep-research or any skill and its report appears here.</p>'}</div>`;
  $$('#tab-research .doc-link').forEach((b) => b.addEventListener('click', () => openFile(b.dataset.path)));
}

function areaChart(m, color) {
  const h = m.history || [];
  if (h.length < 2) return '<p class="empty">Not enough history yet.</p>';
  const W = 300; const H = 150; const L = 34; const B = 20; const T = 8;
  const vals = h.map((p) => p.v);
  const max = Math.max(...vals) || 1;
  const niceMax = (() => { const p = 10 ** Math.floor(Math.log10(max)); return Math.ceil(max / p) * p; })();
  const x = (i) => L + (i / (h.length - 1)) * (W - L - 4);
  const y = (v) => T + (1 - v / niceMax) * (H - T - B);
  const line = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const ticks = [0, niceMax / 2, niceMax];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.label)} over time, latest ${fmtNum(m.value)}">
    <g class="grid">${ticks.map((t) => `<line x1="${L}" x2="${W - 4}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>
    <g class="axis">${ticks.map((t) => `<text x="${L - 6}" y="${y(t) + 3}" text-anchor="end">${fmtNum(t)}</text>`).join('')}
      <text x="${x(0)}" y="${H - 4}" text-anchor="start">${esc(h[0].t.slice(5))}</text>
      <text x="${x(h.length - 1)}" y="${H - 4}" text-anchor="end">${esc(h[h.length - 1].t.slice(5))}</text></g>
    <path class="area" d="${line}L${x(h.length - 1)},${y(0)}L${x(0)},${y(0)}Z" fill="${color}"/>
    <path class="ln" d="${line}" stroke="${color}"/>
    <circle cx="${x(h.length - 1)}" cy="${y(vals[vals.length - 1])}" r="4" fill="${color}" stroke="var(--bg)" stroke-width="2"/>
    <line class="hair" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>
    <circle class="hdot" r="4" fill="${color}" stroke="var(--bg)" stroke-width="2" visibility="hidden"/>
    <rect x="${L}" y="0" width="${W - L}" height="${H}" fill="transparent" class="hit"/>
  </svg><div class="tip" hidden></div>`;
}

function wireChart(card, m) {
  const svg = card.querySelector('svg');
  const hit = card.querySelector('.hit');
  if (!svg || !hit) return;
  const tip = card.querySelector('.tip');
  const hair = svg.querySelector('.hair');
  const dot = svg.querySelector('.hdot');
  const h = m.history;
  const W = 300; const L = 34; const T = 8; const B = 20; const H = 150;
  const vals = h.map((p) => p.v);
  const max = Math.max(...vals) || 1;
  const niceMax = (() => { const p = 10 ** Math.floor(Math.log10(max)); return Math.ceil(max / p) * p; })();
  const show = (evt) => {
    const r = svg.getBoundingClientRect();
    const px = ((evt.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(h.length - 1, Math.round(((px - L) / (W - L - 4)) * (h.length - 1))));
    const cx = L + (i / (h.length - 1)) * (W - L - 4);
    const cy = T + (1 - vals[i] / niceMax) * (H - T - B);
    hair.setAttribute('x1', cx); hair.setAttribute('x2', cx); hair.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.textContent = `${h[i].t} · ${m.prefix || ''}${fmtNum(vals[i])}`;
    const cr = card.getBoundingClientRect();
    tip.style.left = `${r.left - cr.left + (cx / W) * r.width}px`;
    tip.style.top = `${r.top - cr.top + (cy / H) * r.height}px`;
  };
  const hide = () => { tip.hidden = true; hair.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); };
  hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointerleave', hide);
}

// ------------------------------------------------------------------ backbone view

function renderBackbone() {
  const s = app.state;
  const byDomain = new Map(s.domains.map((d) => [d.id, []]));
  for (const sk of s.skills) {
    if (!byDomain.has(sk.domain)) byDomain.set(sk.domain, []);
    byDomain.get(sk.domain).push(sk);
  }
  const label = (id) => s.domains.find((d) => d.id === id)?.label || id;
  const lastRun = (name) => s.automations?.[name] ? `last auto-run ${new Date(s.automations[name]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : '';
  const cols = [...byDomain.entries()].filter(([, list]) => list.length).map(([id, list]) => `
    <div class="dcol">
      <div class="node domain"><strong>${esc(label(id))}</strong></div>
      <div class="stack">${list.map((sk) => `
        <div class="chain">
          <div class="node">${esc(sk.task)}</div>
          <button class="node skill" data-skill="${esc(sk.name)}" title="Run /${esc(sk.name)}">
            <span class="cmd">/${esc(sk.name)}</span>${esc(sk.does)}
            <span class="chips">${(sk.connectors || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</span>
          </button>
          <div class="node auto ${sk.when?.icon === 'hand' ? 'manual' : ''}">${whenIcon(sk.when)} ${esc(sk.when?.text || 'manual')}<span class="last-run">${esc(lastRun(sk.name))}</span></div>
        </div>`).join('')}
      </div>
    </div>`).join('');

  $('#view-backbone').innerHTML = `
    <div class="board-h">
      <h2>SKILL BACKBONE</h2>
      <p>every domain has tasks → repeat tasks become skills → reliable skills become automations</p>
    </div>
    <div class="flow4">
      <div class="node domain"><strong>Domain</strong>an area of your life or business</div>
      <div class="node"><strong>Task</strong>something you do again and again</div>
      <div class="node skill" style="cursor:default"><strong>Skill</strong>the task written down once, Claude runs it</div>
      <div class="node auto"><strong>Automation</strong>a skill that runs by itself</div>
    </div>
    <div class="domains">${cols}</div>
    <div class="legend">
      <span>${whenIcon({ icon: 'clock' })} on a schedule</span>
      <span>${whenIcon({ icon: 'bolt' })} when something happens</span>
      <span>${whenIcon({ icon: 'hand' })} stays manual on purpose</span>
      <span>Tap a skill to run it now</span>
    </div>
    <div class="label">Rules of thumb</div>
    <div class="rules">${(s.rules || []).map((r) => `<div class="rule">${esc(r.title)}<b>→ ${esc(r.then)}</b></div>`).join('')}</div>`;
  $$('#view-backbone .node.skill[data-skill]').forEach((b) => b.addEventListener('click', () => runSkill(b.dataset.skill)));
}

// ------------------------------------------------------------------ router view

const EXAMPLES = [
  'turn yesterday\'s hoodie video into posts for instagram',
  'what are my priorities?',
  'explain CPM in one line',
  'is heated gloves worth dropshipping',
  'plan a winter drop with two pieces',
  'hello',
];

function renderRouter() {
  if ($('#router-text')) return; // keep what the user typed
  $('#view-router').innerHTML = `
    <div class="board-h">
      <h2>AGENTIC OS: HOW IT WORKS</h2>
      <p>two front doors, one brain, one shared memory</p>
    </div>
    <div class="glass" style="padding:18px">
      <div class="node speech">Speech<br>Web Speech = ears · speechSynthesis = voice</div>
      <div class="arch">
        <div class="node you"><strong>You</strong>talk or click</div>
        <div class="doors">
          <div class="node" style="border-color:rgba(127,208,255,.55)"><strong>Obsidian plugin</strong>lives inside the vault: orb, dashboard, terminal tabs</div>
          <div class="node switch">Claude ⇄ Codex · switch anytime</div>
          <div class="node" style="border-color:rgba(127,208,255,.55)"><strong>Jarvis HUD</strong>web app in the browser, same buttons, same voice</div>
        </div>
        <div class="node bridge"><strong>The Bridge</strong>one brain for both apps<br><br>takes every request from both front doors</div>
        <div class="node router"><strong>Router</strong>sorts each request into the right tier, from predefined choices</div>
        <div class="tiers">
          <div class="node t1"><strong>Tier 1</strong>rules + saved data, no AI, instant</div>
          <div class="node t2"><strong>Tier 2</strong>quick answer, Claude Haiku 5.5</div>
          <div class="node t3"><strong>Tier 3</strong>real work: Claude Code or Codex runs a skill in the background</div>
        </div>
        <div class="node conn"><strong>Connectors</strong>Gmail · Calendar · Drive · Shopify · Higgsfield</div>
      </div>
      <div class="vault-bar"><strong>THE VAULT: SHARED MEMORY</strong><br>daily notes · skills · outputs · logs — the Bridge reads and records every request, Tier 3 saves its reports here</div>
    </div>

    <div class="board-h" style="margin-top:8px">
      <h2 style="font-size:clamp(24px,3vw,32px)">ONE MESSAGE. ROUTED, NOT GENERATED.</h2>
      <p>The router never writes text. It scores a fixed list of choices and acts on the winner. Below ${Math.round(0.45 * 100)}% it falls back to the cheapest tier that can still answer.</p>
    </div>
    <div class="tester-input">
      <label class="label" for="router-text">Message</label>
      <textarea id="router-text">${esc(EXAMPLES[0])}</textarea>
      <div class="examples">${EXAMPLES.map((x) => `<button data-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    </div>
    <div class="tester">
      <div class="glass box">
        <span class="label">01 · LLM · generated text</span>
        <div class="gen">"Sounds like you want to repurpose a video. I could write some captions, or maybe a carousel? Let me know which platform and I can…"</div>
        <span class="label" style="text-transform:none;letter-spacing:0">Free text you would still have to parse before anything can happen.</span>
      </div>
      <div class="glass box">
        <span class="label">02 · Router · predefined choices <b id="router-clf"></b></span>
        <div class="bars" id="router-bars"></div>
        <div id="router-result"></div>
      </div>
    </div>`;
  const ta = $('#router-text');
  let t = null;
  ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => routeTest(ta.value), 160); });
  $$('#view-router [data-ex]').forEach((b) => b.addEventListener('click', () => { ta.value = b.dataset.ex; routeTest(ta.value); }));
  routeTest(ta.value);
}

function barsHtml(route, limit = 5) {
  return route.choices.slice(0, limit).map((c) => `<div class="bar ${c.id === route.pick.id ? 'pick' : ''}">
    <span class="name">${esc(c.label)} <span style="color:var(--mute)">T${c.tier}</span></span>
    <span class="track"><span class="fill" style="display:block;width:${Math.max(1.5, c.p * 100).toFixed(1)}%"></span></span>
    <span class="pct">${Math.round(c.p * 100)}%</span></div>`).join('');
}

const TIER_NAMES = { 1: 'Tier 1 · rules', 2: 'Tier 2 · quick', 3: 'Tier 3 · skill' };

async function routeTest(text) {
  if (!text.trim()) { $('#router-bars').innerHTML = ''; $('#router-result').innerHTML = ''; return; }
  let r;
  try {
    r = app.demo ? { ...classify(text, { skills: app.state.skills }), classifier: 'local' } : await api('/api/classify', { text });
  } catch (err) { toast(err.message); return; }
  $('#router-clf').textContent = r.classifier ? `· ${r.classifier}` : '';
  $('#router-bars').innerHTML = barsHtml(r, 5);
  const target = r.pick.tier === 3 ? `${r.pick.label} in ${engineInfo().label}` : r.pick.tier === 2 ? 'Claude Haiku 5.5' : 'answer from the vault';
  $('#router-result').innerHTML = `<span class="result-chip"><span class="tier" data-t="${r.pick.tier}">${TIER_NAMES[r.pick.tier]}</span> Send → ${esc(target)}</span>
    ${r.unsure ? '<p class="unsure" style="margin:8px 0 0">Unsure · fell back to the cheapest tier</p>' : ''}
    <p class="label" style="text-transform:none;letter-spacing:0;margin:8px 0 0">${esc(r.reason)}</p>`;
}

// ------------------------------------------------------------------ asking

async function ask(text, { voice = false, force = null } = {}) {
  text = String(text || '').trim();
  if (!text) return;
  app.busy += 1;
  syncCore();
  const entry = { q: text, at: Date.now() };
  app.transcript.push(entry);
  renderAnswer({ pending: true, q: text });
  try {
    const res = app.demo ? demoAsk(text, app.state, force) : await api('/api/ask', { text, engine: app.state.engine, force });
    Object.assign(entry, { a: res.answer, tier: res.tier, route: res.route.pick.label });
    renderAnswer({ q: text, res });
    if (res.tier === 3) {
      if (app.demo) startDemoJob(res.skill, `/${res.skill}`);
      else if (res.job) { upsertJob(res.job); openJob(res.job.id); }
    }
    if (res.tier === 1 && /rule:(tasks|priorities)/.test(res.route.pick.id)) softRefresh();
    if (voice || store.get('speakAll', false)) speak(res.answer);
  } catch (err) {
    app.lastError = Date.now();
    entry.a = err.message;
    renderAnswer({ q: text, error: err.message });
  } finally {
    app.busy -= 1;
    syncCore();
  }
}

function renderAnswer({ pending, q, res, error }) {
  const el = $('#answer');
  if (pending) {
    el.innerHTML = `<div class="answer"><div class="q">“${esc(q)}”</div><div class="a" style="color:var(--mute)">Routing…</div></div>`;
    return;
  }
  if (error) {
    el.innerHTML = `<div class="answer"><div class="q">“${esc(q)}”</div><div class="a" style="color:var(--bad)">${esc(error)}</div></div>`;
    return;
  }
  const r = res.route;
  const alts = r.choices.filter((c) => c.id !== r.pick.id).slice(0, 2);
  el.innerHTML = `<div class="answer">
    <div class="q">“${esc(q)}”</div>
    <div class="meta"><span class="tier" data-t="${res.tier}">${TIER_NAMES[res.tier]}</span><span class="label">${esc(r.pick.label)} · ${Math.round(r.pick.p * 100)}%</span>${r.unsure ? '<span class="unsure">unsure</span>' : ''}</div>
    <div class="bars">${barsHtml(r, 3)}</div>
    <div class="a">${esc(res.answer)}</div>
    ${res.backend ? `<span class="label" style="font-size:9.5px">via ${esc(res.backend)}</span>` : ''}
    <div class="route-alt"><span class="label" style="align-self:center">Route instead</span>${alts.map((c) => `<button data-force="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>
  </div>`;
  $$('#answer [data-force]').forEach((b) => b.addEventListener('click', () => ask(q, { force: b.dataset.force })));
}

// ------------------------------------------------------------------ runs / terminals

function upsertJob(j) {
  const prev = app.jobs.get(j.id) || { log: [] };
  const merged = { ...prev, ...j };
  if (j.log) merged.log = j.log; else merged.log = prev.log;
  app.jobs.set(j.id, merged);
  return merged;
}

function onJobEvent(ev) {
  if (ev.type === 'log') {
    const j = app.jobs.get(ev.id) || upsertJob({ id: ev.id, title: 'run', status: 'running', engine: app.state.engine, startedAt: Date.now() });
    j.log.push(ev.entry);
    if (app.activeJob === ev.id) appendLog(ev.entry);
  } else if (ev.job) {
    upsertJob(ev.job);
    if (ev.type === 'end') {
      if (ev.job.status === 'failed') app.lastError = Date.now();
      softRefresh();
      toast(`${ev.job.title} ${ev.job.status === 'done' ? 'finished' : ev.job.status}`);
    }
    renderDock();
  }
  renderStatus(true);
  syncCore();
}

async function runSkill(name, input = '') {
  if (app.demo) { startDemoJob(name, `/${name}`); return; }
  try {
    const { job } = await api('/api/run', { skill: name, engine: app.state.engine, input });
    upsertJob(job);
    openJob(job.id);
  } catch (err) { toast(err.message); app.lastError = Date.now(); }
}

function startDemoJob(skill, title, prompt = '') {
  const job = { id: `d${Date.now().toString(36)}`, skill, title, prompt, engine: app.state.engine, status: 'running', startedAt: Date.now(), log: [] };
  upsertJob(job);
  openJob(job.id);
  demoRun(job, onJobEvent);
}

function openJob(id) {
  app.activeJob = id;
  setDock(true);
  renderDock();
}

function setDock(open) {
  $('#dock').dataset.open = String(open);
  $('#dock-toggle').setAttribute('aria-expanded', String(open));
  $('#term').hidden = !open;
}

function renderDock() {
  const jobs = [...app.jobs.values()].sort((a, b) => b.startedAt - a.startedAt).slice(0, 12);
  const running = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;
  $('#term-count').textContent = running ? `${running} running` : `${jobs.length} open`;
  $('#term-tabs').innerHTML = jobs.map((j) => `<button class="term-tab" role="tab" data-id="${esc(j.id)}" aria-selected="${j.id === app.activeJob}"><span class="sdot ${esc(j.status)}"></span>${esc(j.title)}</button>`).join('');
  $$('#term-tabs .term-tab').forEach((b) => b.addEventListener('click', () => selectJob(b.dataset.id)));
  if (app.composing || !app.activeJob || !app.jobs.get(app.activeJob)) {
    renderNewTerminal();
    return;
  }
  const j = app.jobs.get(app.activeJob);
  const eng = app.state.engines[j.engine]?.label || j.engine;
  $('#term-body').innerHTML = `
    <div class="term-head">
      <span class="label"><b>${esc(j.title)}</b> · ${esc(eng)} · ${esc(j.status)}${j.costUsd != null ? ` · $${Number(j.costUsd).toFixed(3)}` : ''}${app.demo ? ' · demo' : ''}</span>
      <span class="actions">
        ${j.status === 'running' || j.status === 'queued' ? '<button class="ghost-btn" id="job-stop">Stop</button>' : ''}
        ${j.savedTo ? `<button class="ghost-btn" id="job-open">Open report</button>` : ''}
      </span>
    </div>
    <pre class="term-log" id="term-log"></pre>`;
  const logEl = $('#term-log');
  logEl.innerHTML = (j.log || []).map(logLine).join('');
  logEl.scrollTop = logEl.scrollHeight;
  $('#job-stop')?.addEventListener('click', () => stopJob(j.id));
  $('#job-open')?.addEventListener('click', () => openFile(j.savedTo));
}

function logLine(e) { return `<span class="${esc(e.kind)}">${esc(e.text)}</span>\n`; }

function appendLog(entry) {
  const el = $('#term-log');
  if (!el) return;
  const stick = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
  el.insertAdjacentHTML('beforeend', logLine(entry));
  if (stick) el.scrollTop = el.scrollHeight;
}

async function selectJob(id) {
  app.composing = false;
  app.activeJob = id;
  const j = app.jobs.get(id);
  if (!app.demo && j && !j.log?.length) {
    try { upsertJob(await api(`/api/jobs/${id}`)); } catch { /* keep what we have */ }
  }
  renderDock();
}

async function stopJob(id) {
  if (app.demo) { demoStopped.add(id); onJobEvent({ type: 'end', job: { ...app.jobs.get(id), status: 'stopped' } }); return; }
  try { await api(`/api/jobs/${id}/stop`, {}); } catch (err) { toast(err.message); }
}

function renderNewTerminal() {
  const eng = engineInfo().label;
  $('#term-body').innerHTML = `
    <div class="term-head"><span class="label"><b>New terminal</b> · ${esc(eng)} · runs headless in the vault</span></div>
    <form class="term-new" id="term-form" autocomplete="off">
      <label for="term-input" hidden>Task</label>
      <input id="term-input" placeholder="Task for ${esc(eng)}, e.g. summarise inbox/ into content ideas">
      <button class="dock-btn" type="submit">Run</button>
    </form>
    <pre class="term-log" style="color:var(--mute)">Each terminal is a headless ${esc(eng)} run inside your vault. It can read and edit notes and search the web.
It cannot send, post or buy anything: those tools are not allowed in .claude/settings.json.</pre>`;
  $('#term-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = $('#term-input').value.trim();
    if (!prompt) return;
    app.composing = false;
    if (app.demo) { startDemoJob(null, prompt.slice(0, 60), prompt); return; }
    try {
      const { job } = await api('/api/terminal', { prompt, engine: app.state.engine });
      upsertJob(job);
      openJob(job.id);
    } catch (err) { toast(err.message); }
  });
  setTimeout(() => $('#term-input')?.focus(), 30);
}

// ------------------------------------------------------------------ voice

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
let levelTimer = null;

function startListening() {
  if (!Recognition) { toast('Voice input needs Chrome or Edge. You can still type.'); return; }
  if (app.listening) { stopListening(true); return; }
  try {
    rec = new Recognition();
  } catch {
    toast('Voice input is blocked here. Type instead.');
    return;
  }
  rec.lang = navigator.language || 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    $('#ask-input').value = (finalText + interim).trim();
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Microphone access was refused. Allow it in the browser, or type.');
    else if (e.error !== 'aborted' && e.error !== 'no-speech') toast(`Voice error: ${e.error}`);
  };
  rec.onend = () => {
    const text = finalText.trim();
    setListening(false);
    if (text) { $('#ask-input').value = ''; ask(text, { voice: true }); }
  };
  try { rec.start(); setListening(true); } catch (err) { toast(err.message); }
}

function stopListening(cancel = false) {
  if (!rec) return;
  if (cancel) rec.abort(); else rec.stop();
}

function setListening(on) {
  app.listening = on;
  $('#talk').setAttribute('aria-pressed', String(on));
  $('#talk-label').textContent = on ? 'Listening… tap to cancel' : 'Tap to talk';
  clearInterval(levelTimer);
  if (on) {
    levelTimer = setInterval(() => {
      const v = 0.3 + Math.random() * 0.7;
      core.setLevel(v * 0.6);
      $$('.level i').forEach((d, i) => { d.style.transform = `scale(${1 + Math.random() * v * (i === 1 ? 1.6 : 1)})`; });
    }, 110);
  } else {
    core.setLevel(0);
    $$('.level i').forEach((d) => { d.style.transform = ''; });
  }
  syncCore();
}

let pulseTimer = null;
function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).slice(0, 600));
    u.rate = 1.04;
    u.onstart = () => { app.speaking = true; syncCore(); pulseTimer = setInterval(() => core.pulse(), 650); };
    u.onend = u.onerror = () => { app.speaking = false; clearInterval(pulseTimer); syncCore(); };
    speechSynthesis.speak(u);
  } catch { /* speech unavailable */ }
}

// ------------------------------------------------------------------ core state, engine, views

function autoState() {
  if (app.listening) return 'listening';
  if (app.speaking) return 'speaking';
  const running = [...app.jobs.values()].some((j) => j.status === 'running' || j.status === 'queued');
  if (app.busy > 0 || running) return 'working';
  if (Date.now() - app.lastError < 8000) return 'error';
  return 'idle';
}

function currentState() { return app.manualState || autoState(); }

function syncCore() {
  const st = currentState();
  core.setState(st);
  document.body.dataset.state = st;
  $$('.states button').forEach((b) => {
    const isAuto = b.dataset.state === 'auto';
    b.setAttribute('aria-pressed', String(isAuto ? !app.manualState : app.manualState ? b.dataset.state === st : b.dataset.state === st));
  });
  const running = [...app.jobs.values()].filter((j) => j.status === 'running' || j.status === 'queued').length;
  const text = { idle: 'Ready · idle', listening: 'Listening…', working: running ? `Working · ${running} run${running > 1 ? 's' : ''}` : 'Working…', speaking: 'Speaking', error: 'Something failed · check the terminal' }[st];
  $('#ready-text').textContent = text;
  const sl = $('#status-line .dot');
  if (sl) sl.textContent = `Core · ${st}`;
}

function setEngine(id, { silent = false } = {}) {
  if (!app.state.engines[id]) return;
  app.state.engine = id;
  document.body.dataset.engine = id;
  core.setMode(id);
  $$('.engine button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.engine === id)));
  const e = app.state.engines[id];
  $('#core-name').textContent = e.core;
  $('#core-sub').textContent = `${e.label} mode · Tier 3 engine${e.available === false ? ' · not installed' : ''}`;
  renderUsage();
  renderCommand();
  if (!app.composing) renderDock();
  if (!silent && !app.demo) api('/api/engine', { engine: id }).catch((err) => toast(err.message));
}

function setView(view) {
  app.view = view;
  store.set('view', view);
  document.body.dataset.view = view;
  core.setView(view);
  for (const v of ['hud', 'command', 'backbone', 'router']) $(`#view-${v}`).hidden = v !== view;
  $$('.views button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
  if (location.hash.slice(1) !== view) history.replaceState(null, '', `#${view}`);
}

function setTab(tab) {
  app.tab = tab;
  for (const t of ['overview', 'audience', 'research']) $(`#tab-${t}`).hidden = t !== tab;
  $$('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
}

// ------------------------------------------------------------------ misc UI

async function openFile(path) {
  $('#reader-title').textContent = path;
  $('#reader-text').textContent = 'Loading…';
  $('#reader').showModal();
  if (app.demo || path.startsWith('demo')) { $('#reader-text').textContent = demoFile(path); return; }
  try { $('#reader-text').textContent = (await api(`/api/file?path=${encodeURIComponent(path)}`)).text; } catch (err) { $('#reader-text').textContent = err.message; }
}

function renderTranscript() {
  $('#transcript').innerHTML = app.transcript.length
    ? app.transcript.slice().reverse().map((t) => `<div><span class="label">You · ${new Date(t.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span><span>${esc(t.q)}</span>
      ${t.a ? `<span class="label">${esc(app.state.name)}${t.tier ? ` · ${TIER_NAMES[t.tier]}` : ''}</span><span style="color:var(--ink-2)">${esc(t.a)}</span>` : ''}</div>`).join('')
    : '<p class="empty">Nothing said yet this session. Everything you ask is also logged in system/log/ in the vault.</p>';
}

let toastTimer = null;
function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;bottom:calc(var(--dock-h) + 16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:20;max-width:calc(100vw - 32px);padding:9px 14px;border-radius:8px;border:1px solid var(--line-2);background:rgba(6,10,9,.94);font:400 12px/1.4 var(--font-mono);color:var(--ink)';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3600);
}

function clock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  $('#hhmm').textContent = `${p(d.getHours())}:${p(d.getMinutes())}`;
  $('#ss').textContent = `:${p(d.getSeconds())}`;
  $('#date').textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ' ·').toUpperCase();
}

function bind() {
  $$('.engine button').forEach((b) => b.addEventListener('click', () => setEngine(b.dataset.engine)));
  $$('.views button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $$('.states button').forEach((b) => b.addEventListener('click', () => {
    app.manualState = b.dataset.state === 'auto' ? null : b.dataset.state;
    if (app.manualState === 'speaking') core.pulse();
    syncCore();
  }));
  $('#pause').addEventListener('click', (e) => { e.currentTarget.textContent = core.togglePause() ? 'Resume motion' : 'Pause motion'; });
  $('#ask-form').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#ask-input').value; $('#ask-input').value = ''; ask(v); });
  $('#talk').addEventListener('click', startListening);
  $('#dock-talk').addEventListener('click', () => { if (app.view !== 'hud') setView('hud'); startListening(); });
  $('#browse-skills').addEventListener('click', () => $('#skills-dlg').showModal());
  $('#open-transcript').addEventListener('click', () => { renderTranscript(); $('#transcript-dlg').showModal(); });
  $('#dock-toggle').addEventListener('click', () => setDock($('#dock').dataset.open !== 'true'));
  $('#new-term').addEventListener('click', () => { app.composing = true; setDock(true); renderDock(); });
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });
  addEventListener('hashchange', () => { const v = location.hash.slice(1); if (['hud', 'command', 'backbone', 'router'].includes(v)) setView(v); });
  addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
    if (e.key === 'Escape' && app.listening) { stopListening(true); return; }
    if (e.key === '/' && !typing) { e.preventDefault(); setView('hud'); $('#ask-input').focus(); }
  });
}

boot();
