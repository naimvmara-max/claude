// The core: one pool of particles that is a connected sphere in Claude mode and a
// spiral galaxy in Codex mode, morphing between the two. Canvas 2D, no libraries.
// States (idle, listening, working, speaking, error) change speed, glow and colour.

const TAU = Math.PI * 2;

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const PALETTES = {
  claude: { hi: [160, 220, 255], lo: [22, 70, 160], line: [79, 178, 255], glow: [40, 130, 255] },
  codex: { hi: [240, 244, 255], lo: [72, 80, 150], line: [205, 215, 255], glow: [140, 150, 255] },
  error: { hi: [255, 130, 120], lo: [120, 30, 30], line: [255, 110, 100], glow: [255, 70, 60] },
};

const STATE_PARAMS = {
  idle: { spin: 0.1, jitter: 0, glow: 0.55, lines: 1, breathe: 0.012 },
  listening: { spin: 0.06, jitter: 0, glow: 0.85, lines: 1.2, breathe: 0.03 },
  working: { spin: 0.55, jitter: 0.018, glow: 0.95, lines: 1.5, breathe: 0.01 },
  speaking: { spin: 0.16, jitter: 0, glow: 0.9, lines: 1.25, breathe: 0.045 },
  error: { spin: 0.04, jitter: 0.03, glow: 0.7, lines: 0.6, breathe: 0.005 },
};

export class Core {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.small = Math.min(innerWidth, innerHeight) < 700;
    this.mode = 'claude';
    this.morph = 0; // 0 sphere, 1 galaxy
    this.morphFrom = 0;
    this.morphTo = 0;
    this.morphStart = 0;
    this.state = 'idle';
    this.p = { ...STATE_PARAMS.idle };
    this.err = 0;
    this.level = 0;
    this.rings = [];
    this.paused = false;
    this.time = 0;
    this.last = performance.now();
    this.slotEl = null;
    this.view = 'hud';
    this.frame = { cx: innerWidth / 2, cy: innerHeight / 2, r: 200, alpha: 1, grid: 1 };
    this.build();
    this.resize();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.last = performance.now(); this.loop(); } });
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  build() {
    const N = this.small ? 1700 : 3000;
    const P = this.small ? 260 : 420; // particles that take part in the network lines
    const ARMS = 2;
    this.N = N;
    this.P = P;
    this.sx = new Float32Array(N); this.sy = new Float32Array(N); this.sz = new Float32Array(N);
    this.gr = new Float32Array(N); this.ga = new Float32Array(N); this.gy = new Float32Array(N);
    this.tw = new Float32Array(N); this.size = new Float32Array(N);
    this.px = new Float32Array(N); this.py = new Float32Array(N); this.pz = new Float32Array(N);

    for (let i = 0; i < N; i += 1) {
      // sphere: a dense volume with a brighter shell
      const shell = i < P ? Math.random() < 0.55 : Math.random() < 0.28;
      const r = shell ? 0.88 + Math.random() * 0.12 : Math.cbrt(Math.random()) * 0.95;
      const u = Math.random() * 2 - 1;
      const th = Math.random() * TAU;
      const s = Math.sqrt(1 - u * u);
      this.sx[i] = r * s * Math.cos(th);
      this.sy[i] = r * u;
      this.sz[i] = r * s * Math.sin(th);

      // galaxy: logarithmic arms plus a bulge
      if (Math.random() < 0.14) {
        const rb = Math.abs(gauss()) * 0.11;
        this.gr[i] = rb;
        this.ga[i] = Math.random() * TAU;
        this.gy[i] = gauss() * 0.05;
      } else {
        const gr = 0.06 + Math.pow(Math.random(), 0.85) * 0.94;
        const arm = i % ARMS;
        const spread = gauss() * (0.2 * (1 - gr) + 0.09);
        this.gr[i] = gr;
        this.ga[i] = (arm * TAU) / ARMS + gr * 5.4 + spread;
        this.gy[i] = gauss() * 0.035 * (1 - gr * 0.6);
      }
      this.tw[i] = Math.random() * TAU;
      this.size[i] = Math.random() < 0.06 ? 2.2 : Math.random() < 0.4 ? 1.4 : 1;
    }

    // Rotation preserves distances, so the network's pairs never change.
    const pairs = [];
    const deg = new Uint8Array(P);
    const maxD2 = 0.36 * 0.36;
    for (let i = 0; i < P; i += 1) {
      for (let j = i + 1; j < P; j += 1) {
        if (deg[i] > 3 || deg[j] > 3) continue;
        const dx = this.sx[i] - this.sx[j];
        const dy = this.sy[i] - this.sy[j];
        const dz = this.sz[i] - this.sz[j];
        if (dx * dx + dy * dy + dz * dz < maxD2) { pairs.push(i, j); deg[i] += 1; deg[j] += 1; }
      }
    }
    this.pairs = new Uint16Array(pairs);
    this.bucketCount = new Uint16Array(5);
    this.buckets = Array.from({ length: 5 }, () => new Float32Array(N * 3));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.dpr = dpr;
    this.canvas.width = Math.round(innerWidth * dpr);
    this.canvas.height = Math.round(innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.morphFrom = this.morph;
    this.morphTo = mode === 'codex' ? 1 : 0;
    this.morphStart = performance.now();
    if (this.reduced) this.morph = this.morphTo;
  }

  setState(state) {
    if (!STATE_PARAMS[state]) return;
    this.state = state;
  }

  setLevel(v) { this.level = Math.max(0, Math.min(1, v)); }

  pulse() { this.rings.push({ t: 0 }); }

  setSlot(el) { this.slotEl = el; }

  setView(view) { this.view = view; }

  togglePause() { this.paused = !this.paused; return this.paused; }

  target() {
    const w = innerWidth;
    const h = innerHeight;
    if (this.view === 'hud' && this.slotEl) {
      const r = this.slotEl.getBoundingClientRect();
      const rad = Math.min(r.width, r.height) * 0.4;
      return { cx: r.left + r.width / 2, cy: r.top + r.height * 0.47, r: rad, alpha: 1, grid: 1 };
    }
    if (this.view === 'command') return { cx: w * 0.72, cy: h * 0.42, r: Math.min(w, h) * 0.46, alpha: 0.4, grid: 0 };
    if (this.view === 'live' || this.view === 'dialer') return { cx: w * 0.5, cy: h * 0.55, r: Math.min(w, h) * 0.6, alpha: 0.07, grid: 0 };
    return { cx: w * 0.5, cy: h * 0.5, r: Math.min(w, h) * 0.55, alpha: 0.14, grid: 0 };
  }

  loop(now = performance.now()) {
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) this.time += dt * (this.reduced ? 0.25 : 1);

    // ease frame toward the current view's target
    const t = this.target();
    const k = this.reduced ? 1 : 1 - Math.pow(0.002, dt);
    for (const key of ['cx', 'cy', 'r', 'alpha', 'grid']) this.frame[key] = lerp(this.frame[key], t[key], k);

    // ease state params
    const goal = STATE_PARAMS[this.state];
    const ks = 1 - Math.pow(0.02, dt);
    for (const key of Object.keys(goal)) this.p[key] = lerp(this.p[key], goal[key], ks);
    this.err = lerp(this.err, this.state === 'error' ? 1 : 0, ks);

    // morph
    if (this.morph !== this.morphTo) {
      const d = Math.min(1, (now - this.morphStart) / 1400);
      this.morph = lerp(this.morphFrom, this.morphTo, ease(d));
      if (d >= 1) this.morph = this.morphTo;
    }

    this.draw(dt);
    requestAnimationFrame(this.loop);
  }

  color(which, bright) {
    const m = this.morph;
    const a = PALETTES.claude[which];
    const b = PALETTES.codex[which];
    const e = PALETTES.error[which];
    const c = [0, 1, 2].map((i) => lerp(lerp(a[i], b[i], m), e[i], this.err));
    return c.map((v, i) => Math.round(v * bright + (1 - bright) * PALETTES[m > 0.5 ? 'codex' : 'claude'].lo[i] * 0.4));
  }

  draw(dt) {
    const ctx = this.ctx;
    const { cx, cy, alpha } = this.frame;
    const W = innerWidth;
    const H = innerHeight;
    ctx.clearRect(0, 0, W, H);
    if (alpha < 0.01) return;

    const time = this.time;
    const p = this.p;
    const m = this.morph;
    const breathe = 1 + Math.sin(time * (this.state === 'speaking' ? 9 : 1.6)) * p.breathe + this.level * 0.12;
    const R = this.frame.r * breathe;

    // glow
    const gc = this.color('glow', 1);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
    g.addColorStop(0, `rgba(${gc[0]},${gc[1]},${gc[2]},${0.16 * p.glow * alpha})`);
    g.addColorStop(0.45, `rgba(${gc[0]},${gc[1]},${gc[2]},${0.05 * p.glow * alpha})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);

    // floor grid, Claude HUD only
    const gridA = this.frame.grid * (1 - m) * alpha;
    if (gridA > 0.02) this.drawGrid(cx, cy, R, gridA, time);

    // transforms
    const spin = time * p.spin * 2.2 + time * 0.05;
    const tiltX = 0.32 + Math.sin(time * 0.13) * 0.08;
    const cy1 = Math.cos(spin);
    const sy1 = Math.sin(spin);
    const cx1 = Math.cos(tiltX);
    const sx1 = Math.sin(tiltX);
    const gTilt = 1.05; // galaxy seen from above, slightly tilted
    const cgt = Math.cos(gTilt);
    const sgt = Math.sin(gTilt);
    const D = 3.4;
    const jitter = p.jitter;

    for (let b = 0; b < 5; b += 1) this.bucketCount[b] = 0;

    for (let i = 0; i < this.N; i += 1) {
      // sphere position
      let x = this.sx[i];
      let y = this.sy[i];
      let z = this.sz[i];
      let x1 = x * cy1 + z * sy1;
      let z1 = -x * sy1 + z * cy1;
      let y1 = y * cx1 - z1 * sx1;
      let z2 = y * sx1 + z1 * cx1;
      let X = x1;
      let Y = y1;
      let Z = z2;

      if (m > 0) {
        // Rigid rotation keeps the arms; real differential rotation would wind them into rings.
        const a = this.ga[i] + time * 0.11 + Math.sin(time * 0.6 + this.tw[i]) * 0.012;
        const gx = Math.cos(a) * this.gr[i] * 1.25;
        const gz = Math.sin(a) * this.gr[i] * 1.25;
        const gy = this.gy[i];
        const GY = gy * cgt - gz * sgt;
        const GZ = gy * sgt + gz * cgt;
        X = lerp(X, gx, m);
        Y = lerp(Y, GY, m);
        Z = lerp(Z, GZ, m);
      }
      if (jitter) {
        X += (Math.random() - 0.5) * jitter;
        Y += (Math.random() - 0.5) * jitter;
      }
      const f = D / (D - Z);
      const sx = cx + X * R * f;
      const sy = cy + Y * R * f;
      this.px[i] = sx;
      this.py[i] = sy;
      this.pz[i] = Z;

      const depth = (Z + 1) / 2; // 0 back, 1 front
      const tw = 0.75 + 0.25 * Math.sin(time * 2 + this.tw[i]);
      let lvl = depth * 0.8 + tw * 0.25 + (m > 0 ? (1 - this.gr[i]) * 0.35 * m : 0);
      const b = Math.max(0, Math.min(4, Math.floor(lvl * 4.2)));
      const n = this.bucketCount[b];
      const arr = this.buckets[b];
      arr[n * 3] = sx;
      arr[n * 3 + 1] = sy;
      arr[n * 3 + 2] = this.size[i] * (0.7 + depth * 0.6) * (m > 0.5 && this.gr[i] < 0.12 ? 1.3 : 1);
      this.bucketCount[b] = n + 1;
    }

    // network lines, fading out as the sphere becomes a galaxy
    const lineA = (1 - m) * alpha * p.lines;
    if (lineA > 0.02) {
      const lc = this.color('line', 1);
      const groups = [[], [], []];
      for (let k = 0; k < this.pairs.length; k += 2) {
        const i = this.pairs[k];
        const j = this.pairs[k + 1];
        const d = (this.pz[i] + this.pz[j] + 2) / 4;
        groups[d < 0.4 ? 0 : d < 0.7 ? 1 : 2].push(i, j);
      }
      ctx.lineWidth = 0.6;
      [0.06, 0.13, 0.24].forEach((a, gi) => {
        const list = groups[gi];
        if (!list.length) return;
        ctx.strokeStyle = `rgba(${lc[0]},${lc[1]},${lc[2]},${Math.min(1, a * lineA)})`;
        ctx.beginPath();
        for (let k = 0; k < list.length; k += 2) {
          ctx.moveTo(this.px[list[k]], this.py[list[k]]);
          ctx.lineTo(this.px[list[k + 1]], this.py[list[k + 1]]);
        }
        ctx.stroke();
      });
    }

    // particles, additive
    ctx.globalCompositeOperation = 'lighter';
    const alphas = [0.22, 0.4, 0.6, 0.82, 1];
    for (let b = 0; b < 5; b += 1) {
      const c = this.color(b >= 3 ? 'hi' : 'hi', 0.45 + b * 0.14);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alphas[b] * alpha})`;
      const arr = this.buckets[b];
      const n = this.bucketCount[b];
      for (let q = 0; q < n; q += 1) {
        const s = arr[q * 3 + 2];
        ctx.fillRect(arr[q * 3] - s / 2, arr[q * 3 + 1] - s / 2, s, s);
      }
    }
    // bright core for the galaxy
    if (m > 0.05) {
      const cc = this.color('hi', 1);
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.22);
      cg.addColorStop(0, `rgba(${cc[0]},${cc[1]},${cc[2]},${0.75 * m * alpha})`);
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(cx - R * 0.25, cy - R * 0.25, R * 0.5, R * 0.5);
    }
    ctx.globalCompositeOperation = 'source-over';

    // speaking rings
    if (this.rings.length) {
      const rc = this.color('line', 1);
      ctx.lineWidth = 1.2;
      this.rings = this.rings.filter((ring) => {
        ring.t += dt;
        const life = ring.t / 1.6;
        if (life >= 1) return false;
        ctx.strokeStyle = `rgba(${rc[0]},${rc[1]},${rc[2]},${(1 - life) * 0.4 * alpha})`;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (0.9 + life * 0.6), 0, TAU);
        ctx.stroke();
        return true;
      });
    }
  }

  drawGrid(cx, cy, R, a, time) {
    const ctx = this.ctx;
    const lc = this.color('line', 1);
    const top = cy + R * 0.95;
    const bottom = Math.min(innerHeight, cy + R * 2.1);
    if (bottom <= top) return;
    const half = R * 2.4;
    ctx.save();
    ctx.lineWidth = 0.7;
    // horizontal lines rushing slowly toward the viewer
    const rows = 9;
    const shift = this.reduced ? 0 : (time * 0.12) % 1;
    for (let r = 0; r < rows; r += 1) {
      const tt = (r + shift) / rows;
      const y = top + (bottom - top) * tt * tt;
      const w = half * (0.55 + tt * 0.9);
      ctx.strokeStyle = `rgba(${lc[0]},${lc[1]},${lc[2]},${0.16 * a * (0.25 + tt)})`;
      ctx.beginPath();
      ctx.moveTo(cx - w, y);
      ctx.lineTo(cx + w, y);
      ctx.stroke();
    }
    // vertical lines to the vanishing point
    const cols = 14;
    for (let c = -cols; c <= cols; c += 1) {
      const xb = cx + (c / cols) * half * 1.45;
      const xt = cx + (c / cols) * half * 0.55;
      const grad = ctx.createLinearGradient(0, top, 0, bottom);
      grad.addColorStop(0, `rgba(${lc[0]},${lc[1]},${lc[2]},0)`);
      grad.addColorStop(1, `rgba(${lc[0]},${lc[1]},${lc[2]},${0.12 * a})`);
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(xt, top);
      ctx.lineTo(xb, bottom);
      ctx.stroke();
    }
    ctx.restore();
  }
}
