// The HUD: one page, five views (HUD, Live, Command, Backbone, Router) and the terminal dock.
// Talks to the Bridge at /api. With no Bridge it runs in demo mode on example data.

import { Core } from './core.js';
import { classify } from './classify.js';
import { fmtNum, nok, packageMix } from './rules.js';
import { demoState, demoAsk, demoRun, demoFile, demoStopped, demoText } from './demo.js';
import { createLive } from './live.js';
import { computeStats, applyStatus, nextId, goalMath, creditPlan, packageOf, channelOf, bookedVia, privacyMode, scrubPersonal, COLUMNS, STAGES, STAGE_LABELS, SOURCE_LABELS, PACKAGES, CHANNELS, CHANNEL_LABELS, CREDIT_COSTS, MIN_SAMPLE, isoLocal } from './pipeline.js';

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

const VIEWS = ['hud', 'live', 'command', 'backbone', 'router'];

// ------------------------------------------------------------------ api

async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Förfrågan misslyckades (${res.status})`);
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
  bindVoiceDialog();
  renderVoiceSupport();
  await refresh();
  setEngine(app.state.engine || 'claude', { silent: true });
  const fromHash = location.hash.slice(1);
  setView(VIEWS.includes(fromHash) ? fromHash : store.get('view', 'hud'));
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
      toast(`Kunde inte ladda läget: ${err.message}`);
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
    btn.title = e?.available === false ? `${e.label} är inte installerat på den här datorn` : `${e?.label} ${e?.version || ''}`.trim();
    btn.querySelector('.off')?.remove();
    if (e?.available === false) btn.insertAdjacentHTML('beforeend', '<span class="off">saknas</span>');
  }
  renderStatus(true);
  renderVitals();
  renderGoal();
  renderChecks('#directives', s.directives, 'Inget fokus än. Skriv tre rader under "## Fokus" i dagens anteckning.');
  renderFollowups('#followups', 4);
  renderDocs();
  renderQuickSkills();
  renderCommand();
  renderBackbone();
  renderRouter();
  renderSkillList();
  renderDock();
  live.update();
  if (!$('#answer').children.length) renderWelcome();
  syncCore();
}

const TRY = ['hur går det?', 'ligger jag i fas?', 'hitta 10 företag: nettbutikker i Bergen', 'vad svarar jag på «vi klarer oss med Outlook»?'];

function renderWelcome() {
  $('#answer').innerHTML = `<div class="answer">
    <span class="label">Prova att fråga</span>
    <div class="route-alt">${TRY.map((t) => `<button data-try="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    <span class="label" style="text-transform:none;letter-spacing:0;font-size:11px">Varje meddelande går till nivå 1 (din pipeline och dina anteckningar), nivå 2 (snabb modell) eller nivå 3 (en skill i Claude Code eller Codex). Du ser sannolikheterna.</span>
  </div>`;
  $$('#answer [data-try]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.try)));
}

function renderStatus(connected = true) {
  const s = app.state;
  if (!s) return;
  const running = [...app.jobs.values()].filter((j) => j.status === 'running' || j.status === 'queued').length;
  const st = currentState();
  $('#status-line').innerHTML = [
    `<span class="dot">Kärna · ${esc(STATE_NAMES[st] || st)}</span>`,
    app.demo ? '<span class="dot warn">Demodata</span>' : `<span class="${connected ? 'dot' : 'dot warn'}">${connected ? 'Valv anslutet' : 'Bridge offline'}</span>`,
    `<span>Terminaler · ${running ? `${running} körs` : 'anslutna'}</span>`,
  ].join('');
  $('#vault-pill').textContent = app.demo ? 'Demodata' : 'Valv anslutet';
  $('#vault-pill').classList.toggle('demo', app.demo);
  $('#foot-text').textContent = `V2 · ${app.demo ? 'Demo, inget valv anslutet' : 'Valv anslutet'} · Delade agentterminaler`;
}

function money(v) {
  return nok(v);
}

/** Whole number with Swedish thousands spacing, for big displays where the unit sits beside it. */
function kr(v) {
  return Math.round(Number(v) || 0).toLocaleString('sv-SE');
}

/** "≈ 28 500 SEK" from NOK, or '' when no rate is set. */
function sek(v) {
  const r = app.state.stats?.sekPerNok;
  return r ? `≈ ${kr((v || 0) * r)} SEK` : '';
}

/** 20000 -> "20k", 5000 -> "5k" for the small deal slots. */
function kShort(v) {
  const n = Number(v) || 0;
  return n >= 1000 ? `${String(Math.round(n / 100) / 10).replace('.', ',')}k` : String(n);
}

function pct(v) {
  return v == null ? '—' : `${(v * 100).toFixed(v < 0.1 ? 1 : 0).replace('.', ',')} %`;
}

function sparkline(history, color) {
  const h = (history || []).map((p) => p.v);
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

const METRIC_COLORS = { contacts: '#5cc8ff', booked: '#8f9bff', demos: '#3fd9e8', commission: '#cfe6ff' };

/** The four numbers that tell the sales story, all counted from ops/pipeline.md. */
function metrics() {
  const st = app.state.stats;
  const wkDelta = (arr) => { const a = arr || []; return a.length > 1 ? a[a.length - 1].v - a[a.length - 2].v : 0; };
  const arrow = (d) => (d > 0 ? `▲ ${fmtNum(d)}` : d < 0 ? `▼ ${fmtNum(-d)}` : '· 0');
  const ch = st.channelWeek || {};
  const split = [ch.email ? `${ch.email} mejl` : '', ch.phone ? `${ch.phone} samtal` : '', ch.other ? `${ch.other} annat` : ''].filter(Boolean).join(' · ');
  const payout = st.overdueUnpaid ? `${nok(st.overdueUnpaid)} försenad utbetalning` : st.payoutNextMonth ? `${nok(st.payoutNextMonth)} med nästa lön` : st.unpaid ? `${nok(st.unpaid)} ej utbetalt` : 'inget väntar på utbetalning';
  return [
    { key: 'contacts', icon: 'i-send', label: 'Kontakter i veckan', short: 'Kontakter i veckan', value: fmtNum(st.contactsWeek), delta: `${arrow(st.contactsWeek - st.contactsPrevWeek)} mot förra v.`, up: st.contactsWeek > st.contactsPrevWeek, sub: `idag ${st.contactsToday}${st.dailyTarget ? ` / ${st.dailyTarget}` : ''}${split ? ` · ${split}` : ''}`, history: st.contactsHistory },
    { key: 'booked', icon: 'i-cal', label: 'Bokade möten', short: 'Bokade möten', value: fmtNum(st.bookedMonth), delta: st.contacted30 ? `${pct(st.bookRate30)} av kontakter · 30 d` : 'inga kontakter än', up: false, sub: `denna månad · ${arrow(wkDelta(st.bookedHistory))} denna v.`, history: st.bookedHistory },
    { key: 'demos', icon: 'i-demo', label: 'Hållna demos', short: 'Hållna demos', value: fmtNum(st.demosMonth), delta: `${st.offersOpen || 0} offert${st.offersOpen === 1 ? '' : 'er'} ute`, up: false, sub: `denna månad · ${st.inPlay.count} pågående`, history: st.demosHistory },
    { key: 'commission', icon: 'i-coin', label: 'Provision denna månad', short: 'Provision (NOK)', value: kr(st.commissionMonth), delta: sek(st.commissionMonth) || `${st.dealsMonth} affärer`, up: false, sub: payout, history: st.commissionHistory },
  ];
}

function renderVitals() {
  const st = app.state.stats;
  const html = metrics().slice(0, 3).map((m) => `<div class="vital" data-key="${m.key}">
      <div class="vital-top"><span class="label">${esc(m.label)}</span><span class="delta ${m.up ? 'up' : ''}">${esc(m.delta)}</span></div>
      <div class="num">${esc(m.value)}</div>
      ${sparkline(m.history, METRIC_COLORS[m.key])}
      <span class="label vital-sub">${esc(m.sub)}</span>
    </div>`);
  if (app.demo) html.push('<span class="example-chip">Exempelpipeline · demo</span>');
  else if (!st.leads) html.push('<p class="empty">Pipelinen är tom, så allt är 0. <button data-run="lead-research">Hitta företag</button> eller <button data-goto="pipeline">lägg till ett</button>.</p>');
  $('#vitals').innerHTML = html.join('');
  bindQuickLinks('#vitals');
}

function bindQuickLinks(sel) {
  $$(`${sel} [data-run]`).forEach((b) => b.addEventListener('click', () => runSkill(b.dataset.run)));
  $$(`${sel} [data-goto]`).forEach((b) => b.addEventListener('click', () => { setView('command'); setTab(b.dataset.goto); }));
}

function engineInfo() {
  const s = app.state;
  return { id: s.engine, ...s.engines[s.engine] };
}

/** One slot per deal in the monthly goal, filled with the package as deals are won. */
function dealSlots(st, big = false) {
  const target = st.goal.target || 0;
  const won = st.wonThisMonth || [];
  const n = Math.min(8, Math.max(target, won.length, 1));
  const slots = Array.from({ length: n }, (_, i) => {
    const d = won[i];
    if (!d) return `<span class="slot"><b>${i + 1}</b><small>ledig</small></span>`;
    const name = st.packages[d.package]?.name || 'inget paket';
    return `<span class="slot on" title="${esc(d.company)} · ${esc(name)} · ${esc(nok(d.commission))}"><b>${esc(d.package || '?')}</b><small>${esc(d.package ? kShort(d.commission) : 'välj paket')}</small></span>`;
  }).join('');
  const extra = won.length > n ? `<span class="label">+ ${won.length - n} affärer till</span>` : '';
  return `<div class="slots${big ? ' big' : ''}" role="img" aria-label="${won.length} av ${target} affärer vunna denna månad">${slots}</div>${extra}`;
}

/** One line on what the rest of the month needs, from goalMath. */
function paceLine(st) {
  const g = goalMath(st, app.state.business || {});
  if (!g.target) return 'Inget affärsmål i business.json';
  if (!g.left) return 'Målet nått · resten är extra';
  if (!g.perDay) return `${g.left} kvar · kolla siffrorna i Takt`;
  const guessed = [g.book, g.show, g.close].some((r) => r.source === 'guess');
  return `${g.left} kvar · ~${Math.ceil(g.perDay)} kontakter per arbetsdag${guessed ? ' (gissade siffror)' : ''}`;
}

function renderGoal() {
  const st = app.state.stats;
  const g = st.goal;
  $('#goal-card').innerHTML = `<div class="usage">
    <i class="b1"></i><i class="b2"></i>
    <div class="label">Affärer denna månad · mål ${g.target || '—'}</div>
    ${dealSlots(st)}
    <div class="big"><span class="num">${kr(st.commissionMonth)}</span><span class="label">NOK intjänat</span></div>
    <div class="foot">${st.sekPerNok ? `${esc(sek(st.commissionMonth))} · ` : ''}${esc(paceLine(st))}${app.demo ? ' · exempel' : ''}</div>
    ${st.overdueUnpaid ? `<button class="warn-chip" data-goto="pipeline">${esc(nok(st.overdueUnpaid))} borde ha betalats ut</button>` : ''}
    ${st.confirmed ? '' : '<button class="warn-chip" data-goto="pace">Beloppen ej bekräftade</button>'}
  </div>`;
  bindQuickLinks('#goal-card');
}

function renderFollowups(sel, limit) {
  const f = app.state.stats.followups || [];
  const el = $(sel);
  if (!el) return;
  el.innerHTML = f.length
    ? `<ul class="fu-list">${f.slice(0, limit).map((x) => `<li><span class="fu-co">${esc(x.company)}</span><span class="fu-act">${esc(x.action)}</span><span class="chip ${x.overdue ? 'late' : ''}">${x.overdue ? `sen ${esc(svDay(x.due))}` : 'idag'}</span><button class="fu-live" data-live="${esc(x.id)}" title="Öppna ${esc(x.company)} i Live">Live</button></li>`).join('')}</ul>
       ${f.length > limit ? `<span class="label">+ ${f.length - limit} till</span>` : ''}
       <button class="ghost-btn" data-run="follow-ups">Skriv uppföljningar</button>`
    : '<p class="empty">Inget att följa upp idag.</p>';
  bindQuickLinks(sel);
  bindLiveLinks(sel);
}

/** "Live" buttons open the Live view on that company. */
function bindLiveLinks(sel) {
  $$(`${sel} [data-live]`).forEach((b) => b.addEventListener('click', () => openLive(b.dataset.live)));
}

async function openLive(id) {
  setView('live');
  await live.show();
  live.openCompany(id);
}

function renderChecks(sel, items, emptyText) {
  const el = $(sel);
  if (!items || !items.length) { el.innerHTML = `<li class="empty">${esc(emptyText)}</li>`; return; }
  el.innerHTML = items.map((it, i) => `<li class="${it.done ? 'done' : ''}">
    <button class="box" data-i="${i}" aria-label="${it.done ? 'Markera som ej klar' : 'Markera som klar'}: ${esc(it.text)}" aria-pressed="${it.done}"></button>
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
  if (m < 60) return `${Math.max(1, m)} min`;
  if (m < 1440) return `${Math.round(m / 60)} h`;
  return `${Math.round(m / 1440)} d`;
}

function renderDocs() {
  const out = (app.state.outputs || []).slice(0, 3);
  $('#docs').innerHTML = out.length
    ? out.map((o) => `<button class="doc-link" data-path="${esc(o.path)}"><span>${esc(o.folder)}/${esc(o.name)}</span><small>${ago(o.mtime)}</small></button>`).join('')
    : '<p class="empty">Inga rapporter än. Varje skill sparar en i outputs/.</p>';
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
    <button class="ghost-btn run" data-skill="${esc(s.name)}">Kör</button>
  </div>`).join('');
  $$('#skill-list .run').forEach((b) => b.addEventListener('click', () => { $('#skills-dlg').close(); runSkill(b.dataset.skill); }));
}

// ------------------------------------------------------------------ command view

function renderCommand() {
  const s = app.state;
  const st = s.stats;
  const g = st.goal;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const sched = s.schedule || [];
  const nowIdx = sched.findIndex((it, i) => it.time <= hhmm && (!sched[i + 1] || sched[i + 1].time > hhmm));
  const timeline = sched.length
    ? sched.map((it, i) => `<div class="${i < nowIdx ? 'past' : i === nowIdx ? 'now' : ''}"><time>${esc(it.time)}</time><span>${esc(it.text)}</span></div>`).join('')
    : '<p class="empty">Inget schema för idag. <button data-run="plan-today">Kör /plan-today</button></p>';
  const brief = s.brief && s.brief.bullets?.length
    ? `<ul>${s.brief.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
    : '<p class="empty">Ingen brief än. /morning-intel körs vardagar 06:30. <button data-run="morning-intel">Kör den nu</button></p>';
  const ordered = [...s.skills.filter((x) => x.quick), ...s.skills.filter((x) => !x.quick)];
  const wf = ordered.slice(0, 10).map((sk) => `<button class="wf" data-skill="${esc(sk.name)}" title="/${esc(sk.name)}">${esc(sk.label)}</button>`).join('');
  const cards = metrics().map((m) => `<div class="glass metric">
      <span class="label">${esc(m.short)}</span>
      <span class="num">${esc(m.value)}</span>
      <span class="delta ${m.up ? 'up' : ''}">${esc(m.delta)}</span>
      <svg class="glyph" aria-hidden="true" style="color:${METRIC_COLORS[m.key]}"><use href="#${m.icon}"/></svg>
      <span class="live ${app.demo ? 'example' : ''}" title="${app.demo ? 'Exempeldata' : 'Räknat från ops/pipeline.md'}"></span>
    </div>`).join('');
  const mix = packageMix(st.dealsByPackage, st.packages);

  $('#tab-overview').innerHTML = `
    <div class="glass goal-wide">
      <div class="gw-deals"><div class="label">Affärer denna månad</div><div class="num">${g.value}<small> / ${g.target || '—'}</small></div><span class="label">${esc(mix || 'inga vunna än')}</span></div>
      <div class="gw-slots">${dealSlots(st, true)}</div>
      <div class="gw-money"><div class="label">Provision denna månad</div><div class="num">${kr(st.commissionMonth)}<small> NOK</small></div><span class="label">${esc(sek(st.commissionMonth))}${st.inPlay.commission ? ` · upp till ${esc(nok(st.inPlay.commission))} pågående` : ''}</span></div>
      <div class="gw-pace"><span class="label">Takt</span><span>${esc(paceLine(st))}</span><button class="ghost-btn" data-goto="pace">Öppna Takt</button></div>
    </div>
    ${st.confirmed ? '' : '<p class="warn-note">Provisionen per paket är inte bekräftad skriftligt. <button data-goto="pace">Öppna checklistan</button></p>'}
    ${st.overdueUnpaid ? `<p class="warn-note">${esc(nok(st.overdueUnpaid))} i provision borde ha kommit med lönen (Driv betalar månaden efter signering). <button data-goto="pipeline">Visa vunna affärer</button></p>` : ''}
    ${st.missingPackage ? `<p class="warn-note">${st.missingPackage} vunn${st.missingPackage === 1 ? 'en affär saknar' : 'a affärer saknar'} paket, så ingen provision räknas för ${st.missingPackage === 1 ? 'den' : 'dem'}. <button data-goto="pipeline">Välj paket</button></p>` : ''}
    <div class="metrics">${cards}</div>
    ${channelsHtml(st)}
    <div class="today-grid">
      <div class="glass today"><span class="label">Uppföljningar och återuppringningar · ${st.followups.length}</span><div id="cmd-followups"></div></div>
      <div class="glass today"><span class="label">Tratt · alla företag${app.demo ? ' · exempel' : ''}</span>${funnelHtml(st.funnel)}</div>
    </div>
    <div class="workflows">${wf}${s.skills.length > 10 ? '<button class="wf" id="more-wf">Fler arbetsflöden…</button>' : ''}</div>
    <div class="today-grid">
      <div class="glass today"><span class="label">Idag</span><div class="timeline">${timeline}</div></div>
      <div class="glass tasks-card"><span class="label">Uppgifter</span><ul class="checks" id="cmd-tasks"></ul></div>
    </div>
    <div class="glass brief"><span class="label">Morgonbrief${s.brief?.title === 'Example brief' ? ' · exempel' : ''}</span>${brief}</div>`;
  renderFollowups('#cmd-followups', 5);
  renderChecks('#cmd-tasks', s.tasks, 'Inga öppna uppgifter.');
  $$('#tab-overview .wf[data-skill]').forEach((b) => b.addEventListener('click', () => runSkill(b.dataset.skill)));
  $('#more-wf')?.addEventListener('click', () => $('#skills-dlg').showModal());
  bindQuickLinks('#tab-overview');

  renderPipelineTab();
  renderPaceTab();
  renderPackagesTab();

  const outs = s.outputs || [];
  $('#tab-research').innerHTML = `<div class="glass research-list"><span class="label">Rapporter och utkast i outputs/</span>${outs.length
    ? outs.map((o) => `<button class="doc-link" data-path="${esc(o.path)}"><span>${esc(o.folder)} / ${esc(o.name)}</span><small>${ago(o.mtime)} sedan</small></button>`).join('')
    : '<p class="empty">Inget än. Kör /lead-research eller någon annan skill så hamnar rapporten här.</p>'}</div>`;
  $$('#tab-research .doc-link').forEach((b) => b.addEventListener('click', () => openFile(b.dataset.path)));
}

/** Which channel books meetings and wins deals: email replies, cold calls, calls after email. */
function channelsHtml(st) {
  const ch = st.channels;
  if (!ch) return '';
  const per100 = (m, c) => (c ? (Math.round((m / c) * 1000) / 10).toLocaleString('sv-SE') : '—');
  const rows = ['email', 'call', 'followcall', 'other']
    .filter((k) => k !== 'other' || ch.other.contactsMonth || ch.other.meetingsMonth)
    .map((k) => {
      const x = ch[k];
      const contacts = k === 'followcall' ? '<span class="muted">mejlade först</span>' : fmtNum(x.contactsMonth);
      const replies = k === 'email' ? fmtNum(x.replies30) : '—';
      const rate = k === 'followcall' ? '—' : per100(x.meetings30, x.contacts30);
      return `<tr><th scope="row">${esc(SOURCE_LABELS[k])}</th><td>${contacts}</td><td>${replies}</td><td><b>${x.meetingsMonth}</b></td><td>${x.demosMonth}</td><td><b>${x.dealsMonth}</b></td><td>${kr(x.commissionMonth)}</td><td>${rate}</td></tr>`;
    }).join('');
  const emailAll = per100(ch.email.meetings30 + ch.followcall.meetings30, ch.email.contacts30);
  return `<div class="glass chan-card">
    <span class="label">Kanaler · denna månad${app.demo ? ' · exempel' : ''}</span>
    <div class="table-wrap"><table class="chan">
      <thead><tr><th>Kanal</th><th>Kontakter</th><th>Svar 30 d</th><th>Möten</th><th>Demos</th><th>Affärer</th><th>Provision</th><th>Möten per 100 kontakter (30 d)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="muted">Kontakter räknas på hur första kontakten skedde. Möten, demos och affärer räknas på hur mötet bokades: svar på ett mejl, ett kallt samtal, eller ett samtal efter mejlen. Mejl inklusive samtalen efteråt: <b>${emailAll}</b> möten per 100 mejlade företag.</p>
  </div>`;
}

function funnelHtml(funnel) {
  const top = Math.max(1, ...funnel.map((f) => f.count));
  return `<div class="funnel">${funnel.map((f, i) => {
    const prev = i ? funnel[i - 1].count : null;
    const conv = prev ? `${Math.round((f.count / prev) * 100)} %` : '';
    return `<div class="fn-row"><span class="fn-label">${esc(f.label)}</span>
      <span class="fn-track"><span class="fn-fill" style="width:${Math.max(f.count ? 2 : 0, (f.count / top) * 100).toFixed(1)}%"></span></span>
      <span class="fn-count">${f.count}</span><span class="fn-conv">${conv}</span></div>`;
  }).join('')}</div>`;
}

const FILTER_NAMES = { open: 'öppna', won: 'vunna', lost: 'förlorade', all: 'alla' };

/** Status choices; "Möte bokat" comes twice so the HUD learns which channel booked it. */
function statusOptions(r) {
  const current = r.status === 'booked' ? `booked|${bookedVia(r) === 'email' ? 'email' : 'phone'}` : r.status;
  return STAGES.flatMap((o) => (o === 'booked'
    ? [['booked|email', 'Möte bokat · via mejl'], ['booked|phone', 'Möte bokat · via samtal']]
    : [[o, STAGE_LABELS[o]]]))
    .map(([v, label]) => `<option value="${v}"${v === current ? ' selected' : ''}>${label}</option>`).join('');
}

function renderPipelineTab() {
  const s = app.state;
  const st = s.stats;
  // Due first (by date), then companies with no next step yet (new research), then later dates.
  const today = st.today;
  const rank = (r) => (r.next_date && r.next_date <= today ? `0${r.next_date}` : !r.next_date ? '1' : `2${r.next_date}`);
  const all = [...(s.leads || [])].sort((a, b) => rank(a).localeCompare(rank(b)) || a.id.localeCompare(b.id));
  const groups = {
    open: all.filter((r) => !['won', 'lost'].includes(r.status)),
    won: all.filter((r) => r.status === 'won'),
    lost: all.filter((r) => r.status === 'lost'),
    all,
  };
  const filter = groups[app.leadFilter] ? app.leadFilter : 'open';
  const limit = app.leadLimit || 30;
  const leads = groups[filter].slice(0, limit);
  const more = groups[filter].length - leads.length;
  const pkgSelect = (r) => `<label class="sr" for="pk-${esc(r.id)}">Paket</label><select id="pk-${esc(r.id)}" data-f="package"><option value="">—</option>${PACKAGES.map((k) => `<option value="${k}"${packageOf(r) === k ? ' selected' : ''}>${esc(st.packages[k].name)}</option>`).join('')}</select>`;
  const nextCell = (r) => (r.status === 'won'
    ? `<label class="sr" for="pd-${esc(r.id)}">Provision utbetald</label><input id="pd-${esc(r.id)}" type="date" data-f="paid" value="${esc(r.paid)}"><br><span class="muted">${r.paid ? 'provision utbetald' : `utbetald? ${packageOf(r) ? esc(nok(st.packages[packageOf(r)].commission)) : 'välj paket'}`}</span>`
    : `<label class="sr" for="nd-${esc(r.id)}">Nästa datum</label><input id="nd-${esc(r.id)}" type="date" data-f="next_date" value="${esc(r.next_date)}"><br><span class="muted">${esc(r.next_action)}</span>`);
  const site = (w) => esc(/^https?:/.test(w) ? w : `https://${w}`);
  const companyOnly = privacyMode(s.business) === 'company-only';
  const rows = leads.map((r) => `<tr data-id="${esc(r.id)}" class="st-${esc(r.status)}">
      <td><b>${esc(r.company)}</b> <button class="row-live" data-live="${esc(r.id)}" title="Öppna ${esc(r.company)} i Live">Live</button>${r.website ? `<br><a href="${site(r.website)}" target="_blank" rel="noopener">${esc(r.website.replace(/^https?:\/\//, ''))}</a>` : ''}${r.industry || r.city ? `<br><span class="muted">${esc([r.industry, r.city].filter(Boolean).join(' · '))}</span>` : ''}</td>
      <td>${esc(r.contact)}${r.email ? `<br><span class="muted">${esc(r.email)}</span>` : ''}${r.phone ? `<br><a href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">${esc(r.phone)}</a>` : ''}</td>
      <td><label class="sr" for="st-${esc(r.id)}">Status</label><select id="st-${esc(r.id)}" data-f="status">${statusOptions(r)}</select></td>
      <td>${pkgSelect(r)}</td>
      <td>${nextCell(r)}</td>
      <td class="muted">${esc(r.contacted || '—')}${r.contacted ? `<br>${esc(CHANNEL_LABELS[channelOf(r)])}` : ''}</td>
    </tr>`).join('');
  $('#tab-pipeline').innerHTML = `
    <form class="glass add-lead" id="add-lead" autocomplete="off">
      <span class="label">Lägg till ett företag</span>
      <div class="add-grid">
        <label>Företag<input id="al-company" name="company" required placeholder="Fjellsport Nett AS"></label>
        ${companyOnly ? '' : '<label>Kontaktperson<input id="al-contact" name="contact" placeholder="Ingrid Haugen, daglig leder"></label>'}
        <label>${companyOnly ? 'Allmän e-post' : 'E-post'}<input id="al-email" name="email" type="email" placeholder="post@foretag.no"></label>
        <label>Telefon<input id="al-phone" name="phone" inputmode="tel" placeholder="+47 22 00 00 00"></label>
        <label>Webbplats<input id="al-website" name="website" placeholder="foretag.no"></label>
        <label>Bransch<input id="al-industry" name="industry" placeholder="nettbutikk"></label>
        <label>Ort<input id="al-city" name="city" placeholder="Bergen"></label>
        <label>Kanal<select id="al-channel" name="channel">${CHANNELS.map((c) => `<option value="${c}">${CHANNEL_LABELS[c]}</option>`).join('')}</select></label>
        <label>Paket<select id="al-package" name="package"><option value="">vet inte än</option>${PACKAGES.map((k) => `<option value="${k}">${esc(st.packages[k].name)}</option>`).join('')}</select></label>
        <button class="dock-btn" type="submit">Lägg till</button>
      </div>
    </form>
    <div class="glass table-card">
      <div class="table-head">
        <span class="label">${all.length} företag · ops/pipeline.md${app.demo ? ' · exempel' : ''}${companyOnly ? ' · <span class="gdpr-chip" title="Jarvis sparar bara företagsuppgifter. Kontaktpersoner och personliga adresser hör hemma i Drivs CRM tills Driv godkänt mer (system/business.json → privacy).">GDPR-läge</span>' : ''}</span>
        <div class="tabs" role="tablist" aria-label="Filtrera företag">${['open', 'won', 'lost', 'all'].map((k) => `<button role="tab" data-filter="${k}" aria-selected="${k === filter}">${FILTER_NAMES[k]} ${groups[k].length}</button>`).join('')}</div>
      </div>
      ${leads.length ? `<div class="table-wrap"><table class="leads">
        <thead><tr><th>Företag</th><th>Kontakt</th><th>Status</th><th>Paket</th><th>${filter === 'won' ? 'Utbetald' : 'Nästa'}</th><th>Första kontakt</th></tr></thead>
        <tbody>${rows}</tbody></table></div>${more > 0 ? `<button class="ghost-btn" id="more-leads">Visa ${more} till</button>` : ''}`
        : all.length ? `<p class="empty">Inga ${FILTER_NAMES[filter]} företag.</p>` : '<p class="empty">Inga företag än. Lägg till ett ovan, eller <button data-run="lead-research">kör /lead-research</button> för att hitta 10.</p>'}
    </div>
    <div class="chart-grid">
      <div class="glass chart-card" data-key="contacts"><span class="label">Nya kontakter per vecka (mejl + samtal)</span>${areaChart({ label: 'Nya kontakter per vecka', history: st.contactsHistory, value: st.contactsWeek }, METRIC_COLORS.contacts)}</div>
      <div class="glass chart-card" data-key="booked"><span class="label">Bokade möten per vecka</span>${areaChart({ label: 'Bokade möten per vecka', history: st.bookedHistory, value: st.bookedHistory.at(-1)?.v ?? 0 }, METRIC_COLORS.booked)}</div>
    </div>`;
  $$('#tab-pipeline .chart-card').forEach((card) => wireChart(card, { history: card.dataset.key === 'contacts' ? st.contactsHistory : st.bookedHistory }));
  bindQuickLinks('#tab-pipeline');
  bindLiveLinks('#tab-pipeline');
  $$('#tab-pipeline [data-filter]').forEach((b) => b.addEventListener('click', () => { app.leadFilter = b.dataset.filter; app.leadLimit = 30; renderPipelineTab(); }));
  $('#more-leads')?.addEventListener('click', () => { app.leadLimit = limit + 100; renderPipelineTab(); });
  $('#add-lead').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.currentTarget).entries());
    await saveLead(null, fields);
  });
  $$('#tab-pipeline tr[data-id] [data-f]').forEach((el) => el.addEventListener('change', () => {
    const [value, via] = el.value.split('|');
    saveLead(el.closest('tr').dataset.id, via ? { [el.dataset.f]: value, booked_via: via } : { [el.dataset.f]: value });
  }));
}

// ------------------------------------------------------------------ pace tab

const RATE_FIELDS = [
  ['book', 'Kontakt → bokat möte'],
  ['show', 'Möte → hållen demo'],
  ['close', 'Demo → signerat avtal'],
];
const SOURCE_NAMES = { yours: 'din data', guess: 'startgissning', typed: 'inskrivet här' };

function paceOverrides() { return store.get('pace', {}); }

/** The goal calculator: the inputs are built once, the numbers update as you type. */
function renderPaceTab() {
  const s = app.state;
  const st = s.stats;
  const b = s.business || {};
  const o = paceOverrides();
  const sample = st.rates.sample;
  const own = {
    book: st.rates.book == null ? 'inga kontakter än' : `din: ${pct(st.rates.book)} (${sample.booked} av ${sample.contacted})`,
    show: st.rates.show == null ? 'inga möten än' : `din: ${pct(st.rates.show)} (${sample.demo} av ${sample.booked})`,
    close: st.rates.close == null ? 'inga demos än' : `din: ${pct(st.rates.close)} (${st.won} av ${sample.demo})`,
  };
  const need = { book: `${MIN_SAMPLE.book} kontakter`, show: `${MIN_SAMPLE.show} möten`, close: `${MIN_SAMPLE.close} demos` };
  const mix = o.mix || {};
  const typical = b.typical_mix || {};
  $('#tab-pace').innerHTML = `
    <div class="pace-grid">
      <div class="glass pace-card">
        <span class="label">Målräkning · resten av månaden</span>
        <div class="pace-inputs">
          <label class="rate"><span>Mål, affärer denna månad</span><input type="number" min="0" step="1" data-pace="goal" value="${esc(o.goal ?? '')}" placeholder="${st.goal.target}"><small>${st.goal.value} vunna hittills</small></label>
          ${RATE_FIELDS.map(([k, label]) => `<label class="rate"><span>${label} %</span><input type="number" min="0" max="100" step="0.5" data-pace="${k}" value="${esc(o[k] ?? '')}"><small><i class="src" data-src="${k}"></i> · ${esc(own[k])}, används efter ${esc(need[k])}</small></label>`).join('')}
        </div>
        <div class="pace-out" id="pace-out" aria-live="polite"></div>
        <p class="pace-say" id="pace-say"></p>
        <div class="pace-actions"><button class="ghost-btn" id="pace-reset">Tillbaka till min data och gissningar</button></div>
        <p class="muted">Det du skriver här stannar i den här webbläsaren och ändrar bara kalkylen. Startgissningarna ligger i <code>system/business.json</code> under <code>assumptions</code>. Affärer stänger ofta veckor efter första kontakten, så kontakter sent i månaden betalar mest nästa månad.</p>
      </div>
      <div class="col" style="gap:12px">
        <div class="glass pace-card">
          <span class="label">Provision per affär · ${b.confirmed ? `bekräftad${b.confirmed_by ? `: ${esc(b.confirmed_by)}` : ''}` : 'inte bekräftad än'}</span>
          <div class="pkg-grid">${PACKAGES.map((k) => `<div class="pkg">
            <span class="label">${esc(st.packages[k].name)}</span>
            <b>${kr(st.packages[k].commission)}</b><small>NOK${st.sekPerNok ? ` · ${esc(sek(st.packages[k].commission))}` : ''}</small>
            <small>${st.dealsByPackage[k]} denna månad</small>
            <label>Andel av affärer %<input type="number" min="0" max="100" step="5" data-mix="${k}" value="${esc(mix[k] ?? '')}" placeholder="${typical[k] ?? (k === st.defaultPackage ? 100 : 0)}"></label>
          </div>`).join('')}</div>
          <p class="pace-say" id="pace-money"></p>
          <p class="muted">Belopp från <code>system/business.json</code>. Andelarna är Drivs "typisk måned" (55 % Small, 35 % Medium, 10 % Large) tills du skriver egna.</p>
        </div>
        <div class="glass pace-card">
          <span class="label">Innan du skriver på · projects/sales-job.md</span>
          <ul class="checks" id="contract-checks"></ul>
        </div>
      </div>
    </div>`;
  renderChecks('#contract-checks', s.contract, 'Ingen checklista under "## Innan jag skriver på" i projects/sales-job.md.');
  $$('#tab-pace [data-pace]').forEach((el) => el.addEventListener('input', () => {
    const cur = paceOverrides();
    if (el.value === '') delete cur[el.dataset.pace]; else cur[el.dataset.pace] = Number(el.value);
    store.set('pace', cur);
    updatePace();
  }));
  $$('#tab-pace [data-mix]').forEach((el) => el.addEventListener('input', () => {
    const cur = paceOverrides();
    cur.mix = { ...(cur.mix || {}) };
    if (el.value === '') delete cur.mix[el.dataset.mix]; else cur.mix[el.dataset.mix] = Number(el.value);
    if (!Object.keys(cur.mix).length) delete cur.mix;
    store.set('pace', cur);
    updatePace();
  }));
  $('#pace-reset').addEventListener('click', () => { store.set('pace', {}); renderPaceTab(); });
  updatePace();
}

function updatePace() {
  const st = app.state.stats;
  const g = goalMath(st, app.state.business || {}, paceOverrides());
  const ceil = (v) => (v == null ? '—' : Math.ceil(v).toLocaleString('sv-SE'));
  for (const [k] of RATE_FIELDS) {
    const el = $(`#tab-pace [data-src="${k}"]`);
    if (el) { el.textContent = `använder ${pct(g[k].v)}, ${SOURCE_NAMES[g[k].source]}`; el.className = `src ${g[k].source}`; }
    const input = $(`#tab-pace [data-pace="${k}"]`);
    if (input) input.placeholder = (g[k].v * 100).toFixed(1).replace(/\.0$/, '');
  }
  $('#pace-out').innerHTML = [
    ['Affärer kvar', g.left],
    ['Demos som behövs', ceil(g.demosNeeded)],
    ['Möten som behövs', ceil(g.meetingsNeeded)],
    ['Kontakter som behövs', ceil(g.contactsNeeded)],
    ['Per arbetsdag', ceil(g.perDay)],
  ].map(([l, v]) => `<div><span class="label">${l}</span><b>${v}</b></div>`).join('');
  const target = st.dailyTarget;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  let say;
  if (!g.target) say = 'Sätt ett mål för att se vad som krävs.';
  else if (!g.left) say = `Målet på ${g.target} är nått den här månaden. Allt härifrån är extra provision.`;
  else if (!g.perContact) say = 'En av konverteringarna är 0 %, så inget antal kontakter tar dig dit. Höj den eller kolla pipelinen.';
  else {
    say = `Med de här siffrorna tar en affär ungefär ${ceil(1 / g.perContact)} kontakter. ${plural(g.left, 'affär till', 'affärer till')} kräver ungefär ${ceil(g.contactsNeeded)} nya kontakter, ${g.workdaysLeft ? `${ceil(g.perDay)} per arbetsdag de ${plural(g.workdaysLeft, 'arbetsdag', 'arbetsdagar')} som är kvar` : 'och inga arbetsdagar är kvar den här månaden'}.`;
    if (target && g.perDay) say += g.perDay > target ? ` Ditt dagsmål är ${target}, så du ligger ungefär ${ceil(g.perDay - target)} per dag efter.` : ` Ditt dagsmål på ${target} räcker.`;
    if (g.perDay > 150) say += ' Det är mer än en person hinner göra bra för hand: en bättre bokningsgrad (skarpare urval, rekryteringssignalen) flyttar siffran mer än volym.';
  }
  $('#pace-say').textContent = say;
  const mixText = { typical: 'Drivs typiska mix', typed: 'din mix', default: `bara ${st.packages[st.defaultPackage]?.name || 'Medium'}` }[g.mixSource];
  $('#pace-money').textContent = `${plural(g.target, 'affär', 'affärer')} à ungefär ${nok(g.avgCommission)} (${mixText}) blir ${nok(g.commissionAtGoal)} i månaden${st.sekPerNok ? ` (${sek(g.commissionAtGoal)})` : ''}. Kvar att tjäna denna månad: ${nok(g.commissionLeft)}.`;
}

// ------------------------------------------------------------------ packages tab

const NEED_FIELDS = [
  ['agent', 'Agenter', 'personer som svarar'],
  ['queue', 'Köer', 't.ex. kundtjänst'],
  ['webchat', 'Webbchattar', 'en per webbplats'],
  ['ai_agent', 'AI-agenter', 'per kanal'],
  ['email_channel', 'E-postkanaler', 'en per inkorg'],
];
const NEED_PRESETS = {
  S: { agent: 2, queue: 1, webchat: 1, ai_agent: 1, email_channel: 0 },
  M: { agent: 8, queue: 2, webchat: 1, ai_agent: 1, email_channel: 1 },
  L: { agent: 20, queue: 3, webchat: 2, ai_agent: 2, email_channel: 1 },
};

/** Driv's three packages and a credit calculator for step 3, "Velg pakke". */
function renderPackagesTab() {
  const s = app.state;
  const st = s.stats;
  const b = s.business || {};
  const pk = st.packages;
  const need = { ...NEED_PRESETS.S, ...store.get('credits', {}) };
  const costs = { ...CREDIT_COSTS, ...(b.credit_costs || {}) };
  $('#tab-packages').innerHTML = `
    <div class="pkg-cards">${PACKAGES.map((k) => `<div class="glass pkg-card${k === 'M' ? ' rec' : ''}">
      <div class="pc-head"><b>${esc(pk[k].name)}</b>${k === 'M' ? '<span class="pill-rec">Anbefalt</span>' : ''}</div>
      <span class="muted">${esc(pk[k].tagline.replace(' (anbefalt)', ''))}</span>
      <span class="label">Kunden betalar</span>
      <div class="pc-price"><b>${kr(pk[k].price)}</b> <small>kr/mån exkl. moms · ${pk[k].credits} krediter</small></div>
      <p class="pc-ex">${esc(pk[k].example)}</p>
      <div class="pc-com"><span class="label">Din provision</span><b>${kr(pk[k].commission)} NOK</b><small>per signerat avtal${st.sekPerNok ? ` · ${esc(sek(pk[k].commission))}` : ''}</small></div>
    </div>`).join('')}</div>
    <div class="glass pace-card credit-calc">
      <span class="label">Räkna krediter med kunden · steg 3 "Velg pakke"</span>
      <div class="presets">${PACKAGES.map((k) => `<button class="ghost-btn" data-preset="${k}">Drivs exempel ${esc(pk[k].name)}</button>`).join('')}</div>
      <div class="pace-inputs need-inputs">${NEED_FIELDS.map(([k, label, hint]) => `<label class="rate"><span>${label}</span><input type="number" min="0" step="1" data-need="${k}" value="${esc(need[k] ?? 0)}"><small>${hint} · ${costs[k]} kredit${costs[k] === 1 ? '' : 'er'} st.</small></label>`).join('')}</div>
      <div class="pace-out" id="credit-out" aria-live="polite"></div>
      <p class="pace-say" id="credit-say"></p>
      <p class="muted">Chatt-widgeten kostar 0 krediter. Drivs regel: välj det minsta paketet som täcker behovet. Rabatt bestäms med ledningen innan offerten skickas. Bindningstiden är oklar (12 eller 24/36 månader): fråga Driv innan du lovar något.</p>
    </div>`;
  $$('#tab-packages [data-need]').forEach((el) => el.addEventListener('input', () => {
    store.set('credits', { ...need, ...readNeed() });
    updateCredits();
  }));
  $$('#tab-packages [data-preset]').forEach((btn) => btn.addEventListener('click', () => {
    const p = NEED_PRESETS[btn.dataset.preset];
    for (const [k] of NEED_FIELDS) $(`#tab-packages [data-need="${k}"]`).value = p[k];
    store.set('credits', p);
    updateCredits();
  }));
  updateCredits();
}

function readNeed() {
  return Object.fromEntries(NEED_FIELDS.map(([k]) => [k, Math.max(0, Number($(`#tab-packages [data-need="${k}"]`)?.value) || 0)]));
}

function updateCredits() {
  const b = app.state.business || {};
  const plan = creditPlan(readNeed(), b);
  const p = plan.pick;
  $('#credit-out').innerHTML = [
    ['Krediter', plan.credits],
    ['Paket', `${p.name}${p.extraCredits ? ` + ${p.extraCredits}` : ''}`],
    ['Kunden betalar', `${kr(p.monthly)}`],
    ['Din provision', `${kr(p.commission)}`],
  ].map(([l, v]) => `<div><span class="label">${l}</span><b>${esc(v)}</b></div>`).join('');
  let say = plan.credits === 0
    ? 'Fyll i vad kunden behöver.'
    : plan.fits
      ? `${plan.credits} krediter ryms i ${p.name} (${p.credits} krediter): ${kr(p.monthly)} kr/mån exkl. moms, ${kr(p.monthly * 12)} kr per år. Din provision: ${kr(p.commission)} NOK.`
      : `${plan.credits} krediter är mer än Large (${p.credits}). Large + ${p.extraCredits} extra krediter à ${kr(plan.extraPrice)} kr = ${kr(p.monthly)} kr/mån, om extra krediter debiteras per månad (fråga Driv).`;
  // An honest alternative: a smaller package plus a few extra credits can be cheaper for the customer.
  const alt = plan.options.find((o) => o.key !== p.key && o.extraCredits > 0 && o.extraCredits <= 3 && o.monthly < p.monthly);
  if (plan.credits && alt) say += ` Alternativ: ${alt.name} + ${alt.extraCredits} extra kredit${alt.extraCredits === 1 ? '' : 'er'} = ${kr(alt.monthly)} kr/mån om extra krediter kostar ${kr(plan.extraPrice)} kr/mån (fråga Driv). Då blir din provision ${kr(alt.commission)} NOK.`;
  $('#credit-say').textContent = say;
}

/**
 * Add a company (id null) or change one. Returns the row. `quiet` skips the toasts, for the
 * Live view, which says what happened itself.
 */
async function saveLead(id, fields, { quiet = false } = {}) {
  const say = (msg) => { if (!quiet) toast(msg); };
  if (app.demo) {
    const today = isoLocal();
    const clean = scrubPersonal(fields, app.state.business);
    fields = clean.fields;
    if (clean.dropped.length) toast(gdprNote(clean.dropped));
    let row = null;
    if (id) {
      row = app.state.leads.find((r) => r.id === id);
      if (row) {
        if (fields.booked_via) row.booked_via = fields.booked_via;
        if (fields.status && fields.status !== row.status) applyStatus(row, fields.status, today);
        for (const k of ['next_date', 'next_action', 'package', 'paid', 'notes']) if (fields[k] != null) row[k] = fields[k];
      }
    } else {
      if (!fields.company) { toast('Skriv in ett företagsnamn.'); return null; }
      row = Object.fromEntries(COLUMNS.map((c) => [c, '']));
      Object.assign(row, fields, { id: nextId(app.state.leads), added: today });
      applyStatus(row, 'researched', today);
      app.state.leads.push(row);
    }
    app.state.stats = computeStats(app.state.leads, { business: app.state.business });
    renderAll();
    if (fields.status === 'booked') say('I riktiga Jarvis startar /demo-prep nu för det företaget.');
    if (fields.status === 'won') say('Affären vunnen. Rutan fylls med paketet och provisionen räknas.');
    return row ? { lead: row, fired: [] } : null;
  }
  try {
    const res = await api(id ? `/api/leads/${id}` : '/api/leads', fields);
    if (res.dropped?.length) { toast(gdprNote(res.dropped)); await refresh(); return res; }
    if (res.fired?.length) say(`Möte bokat: /demo-prep förbereder ${res.lead.company}.`);
    else if (fields.status === 'won') say(`${res.lead.company} vunnen${res.lead.package ? '' : ': välj paket så att provisionen räknas'}`);
    else say(id ? `${res.lead.company} uppdaterad` : `${res.lead.company} tillagd i pipelinen`);
    await refresh();
    return res;
  } catch (err) {
    if (quiet) throw err;
    toast(err.message);
    return null;
  }
}

function gdprNote(dropped) {
  return `GDPR-läge: sparade inte ${dropped.join(' och ')}. Personuppgifter hör hemma i Drivs CRM.`;
}

function areaChart(m, color) {
  const h = m.history || [];
  if (h.length < 2) return '<p class="empty">Inte nog med historik än.</p>';
  const W = 300; const H = 150; const L = 34; const B = 20; const T = 8;
  const vals = h.map((p) => p.v);
  const max = Math.max(...vals) || 1;
  const niceMax = (() => { const p = 10 ** Math.floor(Math.log10(max)); return Math.ceil(max / p) * p; })();
  const x = (i) => L + (i / (h.length - 1)) * (W - L - 4);
  const y = (v) => T + (1 - v / niceMax) * (H - T - B);
  const line = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const ticks = [0, niceMax / 2, niceMax];
  const u = m.unit || '';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.label)}, senast ${fmtNum(m.value)}${u}">
    <g class="grid">${ticks.map((t) => `<line x1="${L}" x2="${W - 4}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}</g>
    <g class="axis">${ticks.map((t) => `<text x="${L - 6}" y="${y(t) + 3}" text-anchor="end">${fmtNum(t)}${u}</text>`).join('')}
      <text x="${x(0)}" y="${H - 4}" text-anchor="start">${esc(svDay(h[0].t))}</text>
      <text x="${x(h.length - 1)}" y="${H - 4}" text-anchor="end">v. från ${esc(svDay(h[h.length - 1].t))}</text></g>
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
    tip.textContent = `veckan från ${svDay(h[i].t)} · ${fmtNum(vals[i])}${m.unit || ''}`;
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
  const lastRun = (name) => s.automations?.[name] ? `senast körd ${new Date(s.automations[name]).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}` : '';
  const cols = [...byDomain.entries()].filter(([, list]) => list.length).map(([id, list]) => `
    <div class="dcol">
      <div class="node domain"><strong>${esc(label(id))}</strong></div>
      <div class="stack">${list.map((sk) => `
        <div class="chain">
          <div class="node">${esc(sk.task)}</div>
          <button class="node skill" data-skill="${esc(sk.name)}" title="Kör /${esc(sk.name)}">
            <span class="cmd">/${esc(sk.name)}</span>${esc(sk.does)}
            <span class="chips">${(sk.connectors || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</span>
          </button>
          <div class="node auto ${sk.when?.icon === 'hand' ? 'manual' : ''}">${whenIcon(sk.when)} ${esc(sk.when?.text || 'manuell')}<span class="last-run">${esc(lastRun(sk.name))}</span></div>
        </div>`).join('')}
      </div>
    </div>`).join('');

  $('#view-backbone').innerHTML = `
    <div class="board-h">
      <h2>SKILL-RYGGRAD</h2>
      <p>varje område har uppgifter → återkommande uppgifter blir skills → pålitliga skills blir automationer</p>
    </div>
    <div class="flow4">
      <div class="node domain"><strong>Område</strong>en del av jobbet</div>
      <div class="node"><strong>Uppgift</strong>något du gör om och om igen</div>
      <div class="node skill" style="cursor:default"><strong>Skill</strong>uppgiften nedskriven en gång, Claude kör den</div>
      <div class="node auto"><strong>Automation</strong>en skill som kör av sig själv</div>
    </div>
    <div class="domains">${cols}</div>
    <div class="legend">
      <span>${whenIcon({ icon: 'clock' })} enligt schema</span>
      <span>${whenIcon({ icon: 'bolt' })} när något händer</span>
      <span>${whenIcon({ icon: 'hand' })} manuell med flit</span>
      <span>Tryck på en skill för att köra den nu</span>
    </div>
    <div class="label">Tumregler</div>
    <div class="rules">${(s.rules || []).map((r) => `<div class="rule">${esc(r.title)}<b>→ ${esc(r.then)}</b></div>`).join('')}</div>`;
  $$('#view-backbone .node.skill[data-skill]').forEach((b) => b.addEventListener('click', () => runSkill(b.dataset.skill)));
}

// ------------------------------------------------------------------ router view

const EXAMPLES = [
  'hitta 10 företag: nettbutikker i Bergen',
  'vem ska jag ringa idag?',
  'skriv mejl till de nya leadsen',
  'hur många kontakter behöver jag för att nå målet?',
  'förbered demon med Havgløtt Hotell',
  'hur går det?',
];

function renderRouter() {
  if ($('#router-text')) return; // keep what the user typed
  $('#view-router').innerHTML = `
    <div class="board-h">
      <h2>AGENTIC OS: SÅ FUNKAR DET</h2>
      <p>två ytterdörrar, en hjärna, ett gemensamt minne</p>
    </div>
    <div class="glass" style="padding:18px">
      <div class="node speech">Tal<br>Web Speech = öron · speechSynthesis = röst</div>
      <div class="arch">
        <div class="node you"><strong>Du</strong>pratar eller klickar</div>
        <div class="doors">
          <div class="node" style="border-color:rgba(127,208,255,.55)"><strong>Obsidian-plugin</strong>bor i valvet: kärna, dashboard, terminalflikar</div>
          <div class="node switch">Claude ⇄ Codex · byt när du vill</div>
          <div class="node" style="border-color:rgba(127,208,255,.55)"><strong>Jarvis HUD</strong>webbapp i webbläsaren, samma knappar, samma röst</div>
        </div>
        <div class="node bridge"><strong>Bridge</strong>en hjärna för båda apparna<br><br>tar emot varje förfrågan från båda dörrarna</div>
        <div class="node router"><strong>Router</strong>sorterar varje förfrågan till rätt nivå, bland förbestämda val</div>
        <div class="tiers">
          <div class="node t1"><strong>Nivå 1</strong>regler + din pipeline, provision och anteckningar, ingen AI, direkt</div>
          <div class="node t2"><strong>Nivå 2</strong>snabbt svar, Claude Haiku 5.5</div>
          <div class="node t3"><strong>Nivå 3</strong>riktigt arbete: Claude Code eller Codex kör en skill i bakgrunden</div>
        </div>
        <div class="node conn"><strong>Kopplingar</strong>Gmail · Kalender · Webb · brreg.no</div>
      </div>
      <div class="vault-bar"><strong>VALVET: DELAT MINNE</strong><br>dagsanteckningar · skills · rapporter · loggar — Bridge läser och loggar varje förfrågan, nivå 3 sparar sina rapporter här</div>
    </div>

    <div class="board-h" style="margin-top:8px">
      <h2 style="font-size:clamp(24px,3vw,32px)">ETT MEDDELANDE. SORTERAT, INTE GENERERAT.</h2>
      <p>Routern skriver aldrig text. Den poängsätter en fast lista med val och gör det som vinner. Under ${Math.round(0.45 * 100)} % faller den tillbaka till den billigaste nivån som ändå kan svara.</p>
    </div>
    <div class="tester-input">
      <label class="label" for="router-text">Meddelande</label>
      <textarea id="router-text">${esc(EXAMPLES[0])}</textarea>
      <div class="examples">${EXAMPLES.map((x) => `<button data-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    </div>
    <div class="tester">
      <div class="glass box">
        <span class="label">01 · LLM · genererad text</span>
        <div class="gen">"Det låter som att du vill nå nya företag. Jag kan skriva några mejl, eller kanske ett samtalsmanus? Säg vilken bransch så kan jag…"</div>
        <span class="label" style="text-transform:none;letter-spacing:0">Fri text som någon ändå måste tolka innan något kan hända.</span>
      </div>
      <div class="glass box">
        <span class="label">02 · Router · förbestämda val <b id="router-clf"></b></span>
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

const TIER_NAMES = { 1: 'Nivå 1 · regler', 2: 'Nivå 2 · snabbt', 3: 'Nivå 3 · skill' };
const STATE_NAMES = { idle: 'vila', listening: 'lyssnar', working: 'arbetar', speaking: 'talar', error: 'fel' };

/** "2026-10-26" -> "26 okt" */
function svDay(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }).replace('.', '');
}

async function routeTest(text) {
  if (!text.trim()) { $('#router-bars').innerHTML = ''; $('#router-result').innerHTML = ''; return; }
  let r;
  try {
    r = app.demo ? { ...classify(text, { skills: app.state.skills }), classifier: 'local' } : await api('/api/classify', { text });
  } catch (err) { toast(err.message); return; }
  $('#router-clf').textContent = r.classifier ? `· ${r.classifier}` : '';
  $('#router-bars').innerHTML = barsHtml(r, 5);
  const target = r.pick.tier === 3 ? `${r.pick.label} i ${engineInfo().label}` : r.pick.tier === 2 ? 'Claude Haiku 5.5' : 'svar från valvet';
  $('#router-result').innerHTML = `<span class="result-chip"><span class="tier" data-t="${r.pick.tier}">${TIER_NAMES[r.pick.tier]}</span> Skicka → ${esc(target)}</span>
    ${r.unsure ? '<p class="unsure" style="margin:8px 0 0">Osäker · föll tillbaka till billigaste nivån</p>' : ''}
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
    if (voice || voiceSettings().speakAll) speak(res.answer);
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
    el.innerHTML = `<div class="answer"><div class="q">“${esc(q)}”</div><div class="a" style="color:var(--mute)">Sorterar…</div></div>`;
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
    <div class="meta"><span class="tier" data-t="${res.tier}">${TIER_NAMES[res.tier]}</span><span class="label">${esc(r.pick.label)} · ${Math.round(r.pick.p * 100)}%</span>${r.unsure ? '<span class="unsure">osäker</span>' : ''}</div>
    <div class="bars">${barsHtml(r, 3)}</div>
    <div class="a">${esc(res.answer)}</div>
    ${res.backend ? `<span class="label" style="font-size:9.5px">via ${esc(res.backend)}</span>` : ''}
    <div class="route-alt"><span class="label" style="align-self:center">Skicka i stället till</span>${alts.map((c) => `<button data-force="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>
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
      toast(`${ev.job.title} ${{ done: 'klar', failed: 'misslyckades', stopped: 'stoppad' }[ev.job.status] || ev.job.status}`);
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
  $('#term-count').textContent = running ? `${running} körs` : `${jobs.length} öppna`;
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
      <span class="label"><b>${esc(j.title)}</b> · ${esc(eng)} · ${esc(JOB_STATUS[j.status] || j.status)}${j.costUsd != null ? ` · $${Number(j.costUsd).toFixed(3)}` : ''}${app.demo ? ' · demo' : ''}</span>
      <span class="actions">
        ${j.status === 'running' || j.status === 'queued' ? '<button class="ghost-btn" id="job-stop">Stoppa</button>' : ''}
        ${j.savedTo ? `<button class="ghost-btn" id="job-open">Öppna rapporten</button>` : ''}
      </span>
    </div>
    <pre class="term-log" id="term-log"></pre>`;
  const logEl = $('#term-log');
  logEl.innerHTML = (j.log || []).map(logLine).join('');
  logEl.scrollTop = logEl.scrollHeight;
  $('#job-stop')?.addEventListener('click', () => stopJob(j.id));
  $('#job-open')?.addEventListener('click', () => openFile(j.savedTo));
}

const JOB_STATUS = { running: 'körs', queued: 'i kö', done: 'klar', failed: 'misslyckades', stopped: 'stoppad' };

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
    <div class="term-head"><span class="label"><b>Ny terminal</b> · ${esc(eng)} · körs i bakgrunden i valvet</span></div>
    <form class="term-new" id="term-form" autocomplete="off">
      <label for="term-input" hidden>Uppgift</label>
      <input id="term-input" placeholder="Uppgift till ${esc(eng)}, t.ex. sammanfatta inbox/ till uppgifter">
      <button class="dock-btn" type="submit">Kör</button>
    </form>
    <pre class="term-log" style="color:var(--mute)">Varje terminal är en ${esc(eng)}-körning i bakgrunden i ditt valv. Den kan läsa och ändra anteckningar och söka på webben.
Den kan inte skicka, publicera eller köpa något: de verktygen är inte tillåtna i .claude/settings.json.</pre>`;
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

/**
 * Chromium browsers other than Chrome and Edge (Opera, Opera GX, Brave, Vivaldi…) expose the
 * speech API but cannot reach the speech service behind it, so they listen and hear nothing.
 * Say so up front instead of failing silently.
 */
function voiceBlockedReason() {
  const ua = navigator.userAgent;
  if (!Recognition) return 'Den här webbläsaren har ingen röstinmatning.';
  if (/OPR\/|Opera|OPX\//.test(ua)) return 'Opera och Opera GX kan inte ta röst: de når inte taltjänsten som behövs.';
  if (navigator.brave) return 'Brave blockerar taltjänsten som röstinmatning behöver.';
  if (/Vivaldi|YaBrowser|SamsungBrowser/.test(ua)) return 'Den här webbläsaren når inte taltjänsten som röstinmatning behöver.';
  return null;
}

const VOICE_FIX = 'Öppna Jarvis i Chrome eller Edge (Start Jarvis.bat gör det åt dig), eller skriv i stället.';

function renderVoiceSupport() {
  const reason = voiceBlockedReason();
  const label = $('#voice-engine');
  if (!label) return;
  if (reason) {
    label.textContent = 'Röst kräver Chrome eller Edge';
    label.style.color = 'var(--warm)';
    label.title = `${reason} ${VOICE_FIX}`;
  }
}

function startListening() {
  const blocked = voiceBlockedReason();
  if (blocked) { toast(`${blocked} ${VOICE_FIX}`); return; }
  if (app.listening) { stopListening(true); return; }
  try {
    rec = new Recognition();
  } catch {
    toast(`Röstinmatning är blockerad här. ${VOICE_FIX}`);
    return;
  }
  rec.lang = listenLang();
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = '';
  let heard = false;
  let failed = false;
  const startedAt = Date.now();
  rec.onresult = (e) => {
    heard = true;
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    $('#ask-input').value = (finalText + interim).trim();
  };
  rec.onerror = (e) => {
    failed = true;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Mikrofonen nekades. Klicka på låset bredvid adressen, tillåt mikrofonen och försök igen.');
    else if (e.error === 'network') toast(`Rösten nådde inte taltjänsten. ${VOICE_FIX}`);
    else if (e.error === 'audio-capture') toast('Ingen mikrofon hittades. Kolla att en är inkopplad och vald i Windows ljudinställningar.');
    else if (e.error === 'no-speech') toast('Jag hörde ingenting. Prata direkt efter att du tryckt, eller kolla mikrofonen.');
    else if (e.error !== 'aborted') toast(`Röstfel: ${e.error}. ${VOICE_FIX}`);
  };
  rec.onend = () => {
    const text = finalText.trim();
    setListening(false);
    if (text) { $('#ask-input').value = ''; ask(text, { voice: true }); return; }
    // Ended almost at once with nothing heard and no error: the speech service never answered.
    if (!heard && !failed && Date.now() - startedAt < 1500) toast(`Rösten slutade innan den hörde dig. ${VOICE_FIX}`);
  };
  try { rec.start(); setListening(true); } catch (err) { toast(err.message); }
}

function listenLang() {
  const lang = voiceSettings().lang;
  return lang && lang !== 'auto' ? lang : navigator.language || 'en-US';
}

function stopListening(cancel = false) {
  if (!rec) return;
  if (cancel) rec.abort(); else rec.stop();
}

function setListening(on) {
  app.listening = on;
  $('#talk').setAttribute('aria-pressed', String(on));
  $('#talk-label').textContent = on ? 'Lyssnar… tryck för att avbryta' : 'Tryck och prata';
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

// Jarvis's spoken voice: the browser's own voices. Jarvis answers in Swedish, so a Swedish
// voice comes first; Edge has the most natural ones ("… Online (Natural)").
const JARVIS_LIKE = [
  /Mattias.*Swedish/i, /Sofie.*Swedish/i, /Hillevi.*Swedish/i, /Google svenska/i, /\bsv[-_]SE\b/i,
];
const VOICE_DEFAULTS = { v: 2, name: '', rate: 1, pitch: 0.95, speakAll: false, lang: 'sv-SE' };

function voiceSettings() {
  const saved = store.get('voice', {});
  // Settings from the English version picked an English voice; Swedish answers need a Swedish one.
  if (saved.v !== 2) return { ...VOICE_DEFAULTS, rate: saved.rate ?? 1, pitch: saved.pitch ?? 0.95, speakAll: Boolean(saved.speakAll) };
  return { ...VOICE_DEFAULTS, ...saved };
}
function saveVoice(patch) { store.set('voice', { ...voiceSettings(), ...patch }); }

function allVoices() {
  try { return ('speechSynthesis' in window && speechSynthesis.getVoices()) || []; } catch { return []; }
}

function jarvisDefault(voices) {
  for (const re of JARVIS_LIKE) {
    const v = voices.find((x) => re.test(x.name));
    if (v) return v;
  }
  return voices.find((v) => /^sv/i.test(v.lang)) || voices.find((v) => /^nb|^no/i.test(v.lang)) || voices.find((v) => /^en-GB/i.test(v.lang)) || voices[0] || null;
}

function currentVoice() {
  const voices = allVoices();
  return voices.find((v) => v.name === voiceSettings().name) || jarvisDefault(voices);
}

let pulseTimer = null;
function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  try {
    speechSynthesis.cancel();
    const s = voiceSettings();
    // Fix lines and file paths are for reading, not for hearing.
    const spoken = String(text).split(/\n\n(?:FIX|ÅTGÄRD):/)[0].slice(0, 600);
    const u = new SpeechSynthesisUtterance(spoken);
    const v = currentVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = Number(s.rate) || 1;
    u.pitch = Number(s.pitch) || 1;
    u.onstart = () => { app.speaking = true; syncCore(); pulseTimer = setInterval(() => core.pulse(), 650); };
    u.onend = u.onerror = () => { app.speaking = false; clearInterval(pulseTimer); syncCore(); };
    speechSynthesis.speak(u);
  } catch { /* speech unavailable */ }
}

function renderVoiceDialog() {
  const s = voiceSettings();
  const voices = allVoices();
  const sel = $('#voice-select');
  const best = jarvisDefault(voices);
  const chosen = currentVoice();
  const opt = (v) => `<option value="${esc(v.name)}"${chosen && v.name === chosen.name ? ' selected' : ''}>${esc(v.name.replace(/^Microsoft\s+/, ''))} · ${esc(v.lang)}</option>`;
  if (!voices.length) {
    sel.innerHTML = '<option value="">Inga röster i den här webbläsaren</option>';
    sel.disabled = true;
  } else {
    sel.disabled = false;
    const swedish = voices.filter((v) => /^(sv|nb|no|da)/i.test(v.lang) && v !== best);
    const english = voices.filter((v) => /^en/i.test(v.lang) && v !== best);
    const other = voices.filter((v) => !/^(sv|nb|no|da|en)/i.test(v.lang) && v !== best);
    sel.innerHTML = [
      best ? `<optgroup label="Bäst för Jarvis på svenska">${opt(best)}</optgroup>` : '',
      swedish.length ? `<optgroup label="Svenska och nordiska">${swedish.map(opt).join('')}</optgroup>` : '',
      english.length ? `<optgroup label="Engelska (läser svenska dåligt)">${english.map(opt).join('')}</optgroup>` : '',
      other.length ? `<optgroup label="Andra språk">${other.map(opt).join('')}</optgroup>` : '',
    ].join('');
  }
  const natural = voices.some((v) => /Natural/i.test(v.name));
  $('#voice-note').textContent = !voices.length
    ? 'Den här webbläsaren har inga röster. Öppna Jarvis i Edge eller Chrome.'
    : natural
      ? 'Röster märkta "Online (Natural)" låter mest mänskliga. De kräver internet. Prova Mattias eller Sofie (svenska).'
      : 'För naturligare röster: öppna Jarvis i Microsoft Edge och välj en "Natural"-röst, till exempel Mattias (svenska).';
  $('#voice-rate').value = s.rate;
  $('#voice-pitch').value = s.pitch;
  $('#voice-rate-out').textContent = Number(s.rate).toFixed(2);
  $('#voice-pitch-out').textContent = Number(s.pitch).toFixed(2);
  $('#speak-all').checked = Boolean(s.speakAll);
  $('#listen-lang').value = s.lang;
}

function voiceSample() {
  const h = new Date().getHours();
  const part = h < 10 ? 'God morgon' : h < 18 ? 'Hej' : 'God kväll';
  const st = app.state?.stats;
  const due = st?.followups?.length ?? 0;
  const deals = st?.goal?.target ? `${st.goal.value} av ${st.goal.target} affärer den här månaden och ` : '';
  return `${part}, ${app.state?.owner || 'chefen'}. Du har ${deals}${due} ${due === 1 ? 'uppföljning' : 'uppföljningar'} idag.`;
}

function bindVoiceDialog() {
  $('#voice-settings').addEventListener('click', () => { renderVoiceDialog(); $('#voice-dlg').showModal(); });
  $('#voice-select').addEventListener('change', (e) => { saveVoice({ name: e.target.value }); speak(voiceSample()); });
  for (const k of ['rate', 'pitch']) {
    $(`#voice-${k}`).addEventListener('input', (e) => {
      $(`#voice-${k}-out`).textContent = Number(e.target.value).toFixed(2);
      saveVoice({ [k]: Number(e.target.value) });
    });
  }
  $('#speak-all').addEventListener('change', (e) => saveVoice({ speakAll: e.target.checked }));
  $('#listen-lang').addEventListener('change', (e) => saveVoice({ lang: e.target.value }));
  $('#voice-test').addEventListener('click', () => speak(voiceSample()));
  $('#voice-reset').addEventListener('click', () => { store.set('voice', { ...VOICE_DEFAULTS }); renderVoiceDialog(); speak(voiceSample()); });
  $('#voice-form').addEventListener('submit', (e) => e.preventDefault());
  // Voices load after the page; refresh the list when they arrive.
  try { speechSynthesis.addEventListener('voiceschanged', () => { if ($('#voice-dlg').open) renderVoiceDialog(); }); } catch { /* no speech */ }
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
  const text = { idle: 'Redo · vila', listening: 'Lyssnar…', working: running ? `Arbetar · ${running} ${running > 1 ? 'körningar' : 'körning'}` : 'Arbetar…', speaking: 'Talar', error: 'Något gick fel · kolla terminalen' }[st];
  $('#ready-text').textContent = text;
  const sl = $('#status-line .dot');
  if (sl) sl.textContent = `Kärna · ${STATE_NAMES[st] || st}`;
}

function setEngine(id, { silent = false } = {}) {
  if (!app.state.engines[id]) return;
  app.state.engine = id;
  document.body.dataset.engine = id;
  core.setMode(id);
  $$('.engine button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.engine === id)));
  const e = app.state.engines[id];
  $('#core-name').textContent = e.core;
  $('#core-sub').textContent = `${e.label}-läge · motor för nivå 3${e.available === false ? ' · inte installerat' : ''}`;
  renderGoal();
  renderCommand();
  if (!app.composing) renderDock();
  if (!silent && !app.demo) api('/api/engine', { engine: id }).catch((err) => toast(err.message));
}

function setView(view) {
  app.view = view;
  store.set('view', view);
  document.body.dataset.view = view;
  core.setView(view);
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== view;
  $$('.views button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
  if (location.hash.slice(1) !== view) history.replaceState(null, '', `#${view}`);
  if (view === 'live') live.show();
  else document.body.classList.remove('share-safe');
}

function setTab(tab) {
  app.tab = tab;
  for (const t of ['overview', 'pipeline', 'pace', 'packages', 'research']) $(`#tab-${t}`).hidden = t !== tab;
  $$('.tabs button[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
}

// ------------------------------------------------------------------ misc UI

async function openFile(path) {
  $('#reader-title').textContent = path;
  $('#reader-text').textContent = 'Laddar…';
  $('#reader').showModal();
  if (app.demo || path.startsWith('demo')) { $('#reader-text').textContent = demoFile(path); return; }
  try { $('#reader-text').textContent = (await api(`/api/file?path=${encodeURIComponent(path)}`)).text; } catch (err) { $('#reader-text').textContent = err.message; }
}

function renderTranscript() {
  $('#transcript').innerHTML = app.transcript.length
    ? app.transcript.slice().reverse().map((t) => `<div><span class="label">Du · ${new Date(t.at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span><span>${esc(t.q)}</span>
      ${t.a ? `<span class="label">${esc(app.state.name)}${t.tier ? ` · ${TIER_NAMES[t.tier]}` : ''}</span><span style="color:var(--ink-2)">${esc(t.a)}</span>` : ''}</div>`).join('')
    : '<p class="empty">Inget sagt än den här gången. Allt du frågar loggas också i system/log/ i valvet.</p>';
}

let toastTimer = null;
function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;bottom:calc(var(--dock-h) + 16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:20;max-width:calc(100vw - 32px);padding:9px 14px;border-radius:8px;border:1px solid var(--line-2);background:rgba(4,9,22,.94);font:400 12px/1.4 var(--font-mono);color:var(--ink)';
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
  $('#date').textContent = `${d.toLocaleDateString('sv-SE', { weekday: 'short' })} · ${d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}`.replace(/\./g, '').toUpperCase();
}

function bind() {
  $$('.engine button').forEach((b) => b.addEventListener('click', () => setEngine(b.dataset.engine)));
  $$('.views button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $$('.tabs button[data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $$('.states button').forEach((b) => b.addEventListener('click', () => {
    app.manualState = b.dataset.state === 'auto' ? null : b.dataset.state;
    if (app.manualState === 'speaking') core.pulse();
    syncCore();
  }));
  $('#pause').addEventListener('click', (e) => { e.currentTarget.textContent = core.togglePause() ? 'Starta rörelse' : 'Pausa rörelse'; });
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
  addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.includes(v)) setView(v); });
  addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
    if (e.key === 'Escape' && app.listening) { stopListening(true); return; }
    if (app.view === 'live' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); live.save(); return; }
    if (e.key === '/' && !typing) {
      e.preventDefault();
      if (app.view === 'live') { live.focusSearch(); return; }
      setView('hud');
      $('#ask-input').focus();
    }
  });
}

// ------------------------------------------------------------------ live view

/** Add a company from the Live view and return its row. */
async function addLead(fields) {
  return (await saveLead(null, fields, { quiet: true }))?.lead || null;
}

/** A Markdown note from the vault (or the copy built into the demo). */
async function loadText(path) {
  if (app.demo) return demoText(path);
  return (await api(`/api/file?path=${encodeURIComponent(path)}`)).text;
}

const live = createLive({
  $, $$, esc, store, api, toast, saveLead, addLead, loadText, openFile, Recognition, listenLang, voiceBlockedReason,
  getState: () => app.state,
  isDemo: () => app.demo,
  demoJob: (skill, title) => startDemoJob(skill, title),
});

boot();
