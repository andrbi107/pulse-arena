/* Pulse Arena — vanilla JS twin-stick arena survival shooter.
 * No libraries, no external assets. All drawing is canvas primitives.
 */
(function () {
  'use strict';

  // ===== CONFIG =====
  const CFG = {
    playerSpeed: 250,        // px/s
    playerRadius: 14,        // px
    bulletSpeed: 560,        // px/s
    bulletLife: 1.0,         // seconds
    bulletLen: 12,           // tail length px
    fireInterval: 0.16,      // seconds between shots
    startLives: 3,
    invulnDuration: 1.0,     // seconds of i-frames after a hit
    enemyBaseSpeed: 75,      // px/s at level 1
    enemySpeedPerLevel: 7,   // px/s added each level
    bossEvery: 5,            // boss on levels 5, 10, 15...
    bossBaseHp: 18,
    bossHpPerCycle: 10,
    bossRadius: 38,
    bossSpeed: 0.42,         // multiplier of base speed
    scorePerKill: 10,
    scorePerWave: 100,
    scorePerBoss: 500,
    spawnInterval: 0.45,     // seconds between spawns
    spawnSafeDist: 260,      // min px from player at spawn
    trailMax: 10,
    gridSize: 44,
    // v0.0.5 — Shield / Overcharge powerups (distinct from arena-blaster's rapid/spread/slow)
    powerupDropChance: 0.06,      // regular-kill drop chance
    powerupBossDropChance: 0.6,   // boss-kill drop chance
    shieldDuration: 6,            // seconds of invulnerability
    overchargeDuration: 6,        // seconds of 3-way spread + fast fire
    overchargeFireMult: 0.5,      // fire interval multiplier (faster)
    overchargeSpread: 0.18,       // radians between spread shots
    powerupRadius: 13,
    powerupLife: 12,              // seconds before a dropped powerup expires
    powerupMagnetRange: 90,
    powerupMagnetSpeed: 120,
  };

  // Enemy archetypes (regular; boss is built separately)
  const ENEMY_TYPES = {
    normal: { shape: 'circle',   color: '#ff2bd6', radius: 13, hp: 1, speedMul: 1.0,  score: 10 },
    fast:   { shape: 'square',    color: '#ff8a00', radius: 10, hp: 1, speedMul: 1.7,  score: 10 },
    tank:   { shape: 'triangle',  color: '#ff3344', radius: 16, hp: 3, speedMul: 0.65, score: 10 },
  };

  // ===== STATE =====
  const S = {
    mode: 'start',           // start | playing | paused | gameover
    score: 0,
    best: 0,
    level: 1,
    lives: CFG.startLives,
    invuln: 0,
    fireCd: 0,
    spawnQueue: [],
    waveTotal: 0,
    spawnTimer: 0,
    enemies: [],
    bullets: [],
    particles: [],
    ambient: [],
    player: { x: 0, y: 0, vx: 0, vy: 0, r: CFG.playerRadius, aim: { x: 1, y: 0 }, trail: [] },
    shake: 0,
    flash: 0,
    time: 0,
    // v0.0.5 — Shield + Overcharge powerup timers and active pickups
    shieldT: 0,
    overchargeT: 0,
    powerups: [],
  };

  // ===== DOM =====
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  const el = (id) => document.getElementById(id);
  const hud = el('hud');
  const scoreVal = el('scoreVal');
  const levelVal = el('levelVal');
  const waveVal = el('waveVal');
  const livesDots = el('livesDots');
  const startScreen = el('startScreen');
  const pauseScreen = el('pauseScreen');
  const overScreen = el('overScreen');
  const bestStart = el('bestStart');
  const finalScore = el('finalScore');
  const bestOver = el('bestOver');
  const finalLevel = el('finalLevel');
  const movePad = el('movePad');
  const padKnob = movePad.querySelector('.pad-knob');
  const fireBtn = el('fireBtn');
  const powerupHud = el('powerupHud');

  // ===== HELPERS =====
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function norm(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }

  // ===== CANVAS SIZING =====
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(W * DPR));
    canvas.height = Math.max(1, Math.floor(H * DPR));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    S.player.x = clamp(S.player.x || W / 2, S.player.r, W - S.player.r);
    S.player.y = clamp(S.player.y || H / 2, S.player.r, H - S.player.r);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // ===== INPUT =====
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, active: false };
  const touch = { move: { active: false, dx: 0, dy: 0, id: null, cx: 0, cy: 0, rad: 1 }, fire: false };
  let isTouch = false;

  function detectTouch() {
    isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      || ('ontouchstart' in window)
      || (navigator.maxTouchPoints > 0);
    if (isTouch) document.body.classList.add('is-touch');
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (S.mode === 'playing' && (k === ' ' || k === 'spacebar' || k.indexOf('arrow') === 0)) {
      e.preventDefault();
    }
    if (k === 'p' || k === 'escape') { togglePause(); return; }
    if (k === 'm') { toggleMute(); return; }
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); });
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });

  canvas.addEventListener('mousemove', (e) => {
    if (isTouch) return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  });
  window.addEventListener('mousedown', (e) => {
    if (isTouch) return;
    if (e.target && e.target.closest && e.target.closest('button,.screen,.touch-controls,.hud-btn')) return;
    mouse.down = true; mouse.active = true;
    AudioS.init();
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });

  // Block synthetic mouse + scroll/zoom on canvas for touch devices
  function blockCanvasTouch() {
    const block = (e) => { e.preventDefault(); };
    canvas.addEventListener('touchstart', block, { passive: false });
    canvas.addEventListener('touchmove', block, { passive: false });
  }

  // Touch move pad (analog joystick)
  function padGeom() {
    const r = movePad.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, rad: r.width / 2 };
  }
  function updatePad(px, py) {
    const g = padGeom();
    let dx = px - g.cx, dy = py - g.cy;
    const d = Math.hypot(dx, dy);
    const max = g.rad || 1;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    touch.move.dx = dx / max;
    touch.move.dy = dy / max;
    padKnob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }
  movePad.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const g = padGeom();
    touch.move.active = true;
    touch.move.id = t.identifier;
    touch.move.cx = g.cx; touch.move.cy = g.cy; touch.move.rad = g.rad;
    updatePad(t.clientX, t.clientY);
    mouse.active = false;
    AudioS.init();
  }, { passive: false });
  movePad.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === touch.move.id) updatePad(t.clientX, t.clientY);
    }
  }, { passive: false });
  function endPad(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touch.move.id) {
        touch.move.active = false; touch.move.id = null;
        touch.move.dx = 0; touch.move.dy = 0;
        padKnob.style.transform = 'translate(0,0)';
      }
    }
  }
  movePad.addEventListener('touchend', endPad);
  movePad.addEventListener('touchcancel', endPad);

  // Touch fire button (auto-aim nearest)
  fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); touch.fire = true; mouse.active = false; AudioS.init(); }, { passive: false });
  const endFire = () => { touch.fire = false; };
  fireBtn.addEventListener('touchend', endFire);
  fireBtn.addEventListener('touchcancel', endFire);

  // ===== AUDIO (optional, guarded WebAudio beeps) =====
  const AudioS = {
    ctx: null,
    muted: false,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) {} } return; }
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { this.ctx = null; }
    },
    beep(freq, dur, type, vol) {
      if (this.muted || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(t); o.stop(t + dur + 0.02);
      } catch (e) {}
    },
    shoot() { this.beep(740, 0.045, 'square', 0.03); },
    kill() { this.beep(180, 0.14, 'sawtooth', 0.07); },
    hit() { this.beep(110, 0.32, 'sawtooth', 0.13); },
    levelup() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, 0.12, 'triangle', 0.08), i * 90)); },
    boss() { this.beep(70, 0.6, 'sawtooth', 0.12); this.beep(140, 0.5, 'square', 0.06); },
    over() { [400, 300, 200, 120].forEach((f, i) => setTimeout(() => this.beep(f, 0.22, 'sawtooth', 0.1), i * 140)); },
  };

  function toggleMute() {
    AudioS.muted = !AudioS.muted;
    const b = el('btnMute');
    b.textContent = AudioS.muted ? 'X' : '\u266A';
    b.setAttribute('aria-label', AudioS.muted ? 'Unmute' : 'Mute');
  }

  // ===== BEST SCORE PERSISTENCE =====
  function loadBest() {
    try { S.best = parseInt(localStorage.getItem('pulseArena.best') || '0', 10) || 0; }
    catch (e) { S.best = 0; }
  }
  function saveBest() {
    try { localStorage.setItem('pulseArena.best', String(S.best)); }
    catch (e) {}
  }

  // ===== MODE / SCREENS =====
  function setMode(m) {
    S.mode = m;
    startScreen.classList.toggle('hidden', m !== 'start');
    pauseScreen.classList.toggle('hidden', m !== 'paused');
    overScreen.classList.toggle('hidden', m !== 'gameover');
    hud.classList.toggle('hidden', !(m === 'playing' || m === 'paused'));
  }

  // ===== GAME FLOW =====
  function startGame() {
    AudioS.init();
    if (document.activeElement && document.activeElement.blur) {
      try { document.activeElement.blur(); } catch (e) {}
    }
    S.score = 0;
    S.level = 1;
    S.lives = CFG.startLives;
    S.invuln = 0;
    S.fireCd = 0;
    S.enemies = [];
    S.bullets = [];
    S.particles = [];
    S.shake = 0;
    S.flash = 0;
    S.killCombo = 0; S.lastKillT = 0;   // v0.0.2 — rapid-kill combo
    S.shieldT = 0;                       // v0.0.5 — reset powerups
    S.overchargeT = 0;
    S.powerups = [];
    S.player.x = W / 2; S.player.y = H / 2;
    S.player.vx = 0; S.player.vy = 0;
    S.player.aim = { x: 1, y: 0 };
    S.player.trail = [];
    beginWave();
    setMode('playing');
    updateHUD();
  }

  function enemySpeed(lvl) { return CFG.enemyBaseSpeed + (lvl - 1) * CFG.enemySpeedPerLevel; }

  function pickRegularType(lvl) {
    const r = Math.random();
    const fastCh = clamp(0.18 + lvl * 0.015, 0.18, 0.42);
    const tankCh = clamp(0.08 + lvl * 0.012, 0.08, 0.28);
    if (r < tankCh) return 'tank';
    if (r < tankCh + fastCh) return 'fast';
    return 'normal';
  }

  function beginWave() {
    const lvl = S.level;
    const isBoss = lvl % CFG.bossEvery === 0;
    S.spawnQueue = [];
    if (isBoss) {
      S.spawnQueue.push('boss');
      const cycle = Math.floor(lvl / CFG.bossEvery);
      const minions = 3 + cycle;
      for (let i = 0; i < minions; i++) S.spawnQueue.push(pickRegularType(lvl));
      AudioS.boss();
    } else {
      const n = 5 + lvl * 2;
      for (let i = 0; i < n; i++) S.spawnQueue.push(pickRegularType(lvl));
    }
    S.waveTotal = S.spawnQueue.length;
    S.spawnTimer = 0.3;
  }

  // v0.0.5 — Shield / Overcharge powerup drops (rare from kills)
  const POWERUP_TYPES = ['shield', 'overcharge'];
  function spawnPowerup(x, y) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    S.powerups.push({
      x: x, y: y, type: type, r: CFG.powerupRadius,
      bob: Math.random() * Math.PI * 2, life: CFG.powerupLife,
    });
  }

  function spawnEnemy(type) {
    const base = enemySpeed(S.level);
    let arch;
    if (type === 'boss') {
      const cycle = Math.floor(S.level / CFG.bossEvery);
      const hp = CFG.bossBaseHp + Math.max(0, cycle - 1) * CFG.bossHpPerCycle;
      arch = { shape: 'circle', color: '#ff0040', radius: CFG.bossRadius, hp: hp, speedMul: CFG.bossSpeed, score: CFG.scorePerBoss, boss: true };
    } else {
      arch = ENEMY_TYPES[type];
    }
    let x = 0, y = 0, tries = 0;
    do {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { x = rand(0, W); y = -arch.radius; }
      else if (edge === 1) { x = W + arch.radius; y = rand(0, H); }
      else if (edge === 2) { x = rand(0, W); y = H + arch.radius; }
      else { x = -arch.radius; y = rand(0, H); }
      tries++;
    } while (dist2(x, y, S.player.x, S.player.y) < CFG.spawnSafeDist * CFG.spawnSafeDist && tries < 8);
    S.enemies.push({
      x: x, y: y, vx: 0, vy: 0, r: arch.radius,
      hp: arch.hp, maxHp: arch.hp,
      shape: arch.shape, color: arch.color,
      speed: base * arch.speedMul, score: arch.score,
      boss: !!arch.boss, hitFlash: 0, rot: Math.random() * Math.PI * 2,
    });
  }

  function nearestEnemy() {
    let best = null, bd = Infinity;
    for (let i = 0; i < S.enemies.length; i++) {
      const e = S.enemies[i];
      const d = dist2(e.x, e.y, S.player.x, S.player.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function fireBullet(ax, ay) {
    const p = S.player;
    S.bullets.push({
      x: p.x + ax * p.r, y: p.y + ay * p.r,
      vx: ax * CFG.bulletSpeed, vy: ay * CFG.bulletSpeed,
      life: CFG.bulletLife, len: CFG.bulletLen,
    });
    AudioS.shoot();
  }

  function tryFire(dt) {
    S.fireCd -= dt;
    if (S.fireCd > 0) return;
    let aim = null;
    if (touch.fire) {
      const e = nearestEnemy();
      if (e) aim = norm(e.x - S.player.x, e.y - S.player.y);
      else aim = { x: S.player.aim.x, y: S.player.aim.y };
      S.player.aim = aim;
    } else if (mouse.down && mouse.active) {
      aim = norm(mouse.x - S.player.x, mouse.y - S.player.y);
      S.player.aim = aim;
    } else if (keys.has(' ') || keys.has('spacebar')) {
      aim = { x: S.player.aim.x, y: S.player.aim.y };
    }
    if (aim && (Math.abs(aim.x) > 0.001 || Math.abs(aim.y) > 0.001)) {
      if (S.overchargeT > 0) {
        // v0.0.5 — Overcharge: simultaneous 3-way spread + faster fire rate
        const baseAng = Math.atan2(aim.y, aim.x);
        fireBullet(Math.cos(baseAng - CFG.overchargeSpread), Math.sin(baseAng - CFG.overchargeSpread));
        fireBullet(aim.x, aim.y);
        fireBullet(Math.cos(baseAng + CFG.overchargeSpread), Math.sin(baseAng + CFG.overchargeSpread));
        S.fireCd = CFG.fireInterval * CFG.overchargeFireMult;
      } else {
        fireBullet(aim.x, aim.y);
        S.fireCd = CFG.fireInterval;
      }
    }
  }

  function loseLife() {
    if (S.invuln > 0 || S.shieldT > 0) return;   // v0.0.5 — Shield ignores contact damage
    S.lives -= 1;
    S.invuln = CFG.invulnDuration;
    S.shake = 14;
    S.flash = 0.25;
    AudioS.hit();
    updateHUD();
    if (S.lives <= 0) gameOver();
  }

  function gameOver() {
    if (S.score > S.best) { S.best = S.score; saveBest(); }
    finalScore.textContent = S.score.toLocaleString();
    bestOver.textContent = S.best.toLocaleString();
    finalLevel.textContent = S.level;
    AudioS.over();
    setMode('gameover');
    if (window.MUX) MUX.over();
  }

  function advanceLevel() {
    S.level += 1;
    S.score += CFG.scorePerWave;
    AudioS.levelup();
    // v0.0.5 — achievement: reach wave 10
    if (S.level === 10 && window.GK) { try { GK.achievement('wave10', 'Wave 10', 'Reach wave 10'); } catch (er) {} }
    beginWave();
    updateHUD();
  }

  function togglePause() {
    if (S.mode === 'playing') setMode('paused');
    else if (S.mode === 'paused') setMode('playing');
  }

  // ===== UPDATE =====
  function update(dt) {
    S.time += dt;
    if (S.flash > 0) S.flash -= dt;
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 30);

    // Movement vector
    let mx = 0, my = 0;
    if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
    if (keys.has('d') || keys.has('arrowright')) mx += 1;
    if (keys.has('w') || keys.has('arrowup')) my -= 1;
    if (keys.has('s') || keys.has('arrowdown')) my += 1;
    if (touch.move.active) { mx = touch.move.dx; my = touch.move.dy; }
    const ml = Math.hypot(mx, my);
    if (ml > 0.12) {
      if (ml > 1) { mx /= ml; my /= ml; }
      if (!mouse.active && !touch.fire) S.player.aim = { x: mx, y: my };
    }

    const p = S.player;
    p.vx = mx * CFG.playerSpeed;
    p.vy = my * CFG.playerSpeed;
    p.x = clamp(p.x + p.vx * dt, p.r, W - p.r);
    p.y = clamp(p.y + p.vy * dt, p.r, H - p.r);

    // Trail
    if (ml > 0.12) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > CFG.trailMax) p.trail.shift();
    } else if (p.trail.length) {
      p.trail.shift();
    }

    // Invulnerability timer
    if (S.invuln > 0) S.invuln -= dt;
    // v0.0.5 — powerup timers
    if (S.shieldT > 0) S.shieldT = Math.max(0, S.shieldT - dt);
    if (S.overchargeT > 0) S.overchargeT = Math.max(0, S.overchargeT - dt);

    // v0.0.5 — powerup pickups: bob, magnet toward player, expire, collect
    for (let i = S.powerups.length - 1; i >= 0; i--) {
      const pu = S.powerups[i];
      pu.bob += dt * 3;
      pu.life -= dt;
      const ddx = p.x - pu.x, ddy = p.y - pu.y;
      const dd = Math.hypot(ddx, ddy) || 1;
      if (dd < CFG.powerupMagnetRange) { pu.x += (ddx / dd) * CFG.powerupMagnetSpeed * dt; pu.y += (ddy / dd) * CFG.powerupMagnetSpeed * dt; }
      if (dd < p.r + pu.r) {
        if (pu.type === 'shield') { S.shieldT = CFG.shieldDuration; }
        else { S.overchargeT = CFG.overchargeDuration; }
        if (window.MUX) MUX.bump();
        if (window.GK) { try { GK.sfx('coin'); } catch (er) {} }
        S.powerups.splice(i, 1);
        updateHUD();
        continue;
      }
      if (pu.life <= 0) S.powerups.splice(i, 1);
    }

    // Mouse aim (continuous)
    if (mouse.active && !touch.fire) {
      S.player.aim = norm(mouse.x - p.x, mouse.y - p.y);
    }

    tryFire(dt);

    // Spawn from queue
    if (S.spawnQueue.length) {
      S.spawnTimer -= dt;
      if (S.spawnTimer <= 0) {
        spawnEnemy(S.spawnQueue.shift());
        S.spawnTimer = CFG.spawnInterval;
      }
    }

    // Bullets
    for (let i = S.bullets.length - 1; i >= 0; i--) {
      const b = S.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
        S.bullets.splice(i, 1);
      }
    }

    // Enemies chase
    for (let i = 0; i < S.enemies.length; i++) {
      const e = S.enemies[i];
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.vx = (dx / d) * e.speed;
      e.vy = (dy / d) * e.speed;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rot += dt * (e.boss ? 1.2 : 2.5);
      if (e.hitFlash > 0) e.hitFlash -= dt;
      e.x = clamp(e.x, -e.r, W + e.r);
      e.y = clamp(e.y, -e.r, H + e.r);
    }

    // Bullet vs enemy
    for (let i = S.enemies.length - 1; i >= 0; i--) {
      const e = S.enemies[i];
      const rad = e.r + 4;
      const r2 = rad * rad;
      for (let j = S.bullets.length - 1; j >= 0; j--) {
        const b = S.bullets[j];
        if (dist2(b.x, b.y, e.x, e.y) < r2) {
          S.bullets.splice(j, 1);
          e.hp -= 1;
          e.hitFlash = 0.12;
          if (e.hp <= 0) {
            spawnDeathParticles(e);
            // v0.0.2 — rapid-kill combo: kills within 1.5s stack a multiplier
            var nowK = performance.now();
            if (nowK - S.lastKillT < 1500) S.killCombo = Math.min(S.killCombo + 1, 8);
            else S.killCombo = 1;
            S.lastKillT = nowK;
            var kMult = 1 + (S.killCombo - 1) * 0.25; // ×1 → ×2.75 cap
            S.score += Math.round(e.score * kMult);
            if (window.MUX) MUX.bump();
            if (e.boss) {
              S.shake = 18; AudioS.boss();
              // v0.0.5 — achievement: first boss kill
              if (window.GK) { try { GK.achievement('boss1', 'Boss Slayer', 'Defeat a boss'); } catch (er) {} }
              // v0.0.5 — bosses drop a powerup more often
              if (Math.random() < CFG.powerupBossDropChance) spawnPowerup(e.x, e.y);
            } else {
              AudioS.kill();
              // v0.0.5 — rare powerup drop from regular kills
              if (Math.random() < CFG.powerupDropChance) spawnPowerup(e.x, e.y);
            }
            S.enemies.splice(i, 1);
            updateHUD();
            break;
          }
        }
      }
    }

    // Player vs enemy — skipped entirely while Shield is active (v0.0.5)
    if (S.invuln <= 0 && S.shieldT <= 0) {
      for (let i = S.enemies.length - 1; i >= 0; i--) {
        const e = S.enemies[i];
        const rr = e.r + p.r;
        if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
          loseLife();
          if (!e.boss) {
            spawnDeathParticles(e);
            S.enemies.splice(i, 1);
            updateHUD();
          } else {
            const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
            e.x += dx / d * 36; e.y += dy / d * 36;
          }
          break;
        }
      }
    }

    // Particles
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const pt = S.particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.92; pt.vy *= 0.92;
      pt.life -= dt;
      if (pt.life <= 0) S.particles.splice(i, 1);
    }

    // Wave clear
    if (S.spawnQueue.length === 0 && S.enemies.length === 0 && S.mode === 'playing') {
      advanceLevel();
    }
  }

  function spawnDeathParticles(e) {
    const n = e.boss ? 40 : 12;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(60, e.boss ? 320 : 180);
      S.particles.push({
        x: e.x, y: e.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.4, 0.9), max: 0.9,
        color: e.color, r: rand(2, e.boss ? 6 : 4),
      });
    }
  }

  // ===== RENDER =====
  function drawGrid(ox, oy) {
    ctx.strokeStyle = 'rgba(20,40,70,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gs = CFG.gridSize;
    for (let x = -ox; x < W + gs; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = -oy; y < H + gs; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }

  function render() {
    let sx = 0, sy = 0;
    if (S.shake > 0) { sx = rand(-S.shake, S.shake); sy = rand(-S.shake, S.shake); }

    ctx.save();
    ctx.translate(sx, sy);

    // Background
    ctx.fillStyle = '#05070d';
    ctx.fillRect(-sx - 24, -sy - 24, W + 48, H + 48);

    const p = S.player;
    drawGrid(p.x % CFG.gridSize, p.y % CFG.gridSize);

    // Arena border
    ctx.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Trail
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const f = i / p.trail.length;
      ctx.fillStyle = 'rgba(0,229,255,' + (f * 0.4) + ')';
      ctx.beginPath();
      ctx.arc(t.x, t.y, p.r * f * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Particles
    for (let i = 0; i < S.particles.length; i++) {
      const pt = S.particles[i];
      ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // v0.0.5 — powerup pickups (Shield = cyan S, Overcharge = amber O)
    for (let i = 0; i < S.powerups.length; i++) {
      const pu = S.powerups[i];
      const yy = pu.y + Math.sin(pu.bob) * 3;
      const isShield = pu.type === 'shield';
      const col = isShield ? '#00e5ff' : '#ffd76a';
      const fade = pu.life < 3 ? (0.35 + 0.65 * Math.abs(Math.sin(pu.bob * 2))) : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.shadowColor = col; ctx.shadowBlur = 16;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(pu.x, yy, pu.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#05070d';
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(isShield ? 'S' : 'O', pu.x, yy);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Bullets (thin yellow streaks)
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ffe14d';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < S.bullets.length; i++) {
      const b = S.bullets[i];
      const ang = Math.atan2(b.vy, b.vx);
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - Math.cos(ang) * b.len, b.y - Math.sin(ang) * b.len);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Enemies
    for (let i = 0; i < S.enemies.length; i++) {
      const e = S.enemies[i];
      const flash = e.hitFlash > 0;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.shadowColor = e.color;
      ctx.shadowBlur = e.boss ? 28 : 14;
      ctx.fillStyle = flash ? '#ffffff' : e.color;
      if (e.shape === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
      } else if (e.shape === 'square') {
        ctx.rotate(e.rot);
        ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 2);
      } else { // triangle
        ctx.rotate(e.rot);
        ctx.beginPath();
        ctx.moveTo(0, -e.r);
        ctx.lineTo(e.r * 0.9, e.r * 0.7);
        ctx.lineTo(-e.r * 0.9, e.r * 0.7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (e.boss) {
        // inner ring
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, e.r * 0.6, 0, Math.PI * 2); ctx.stroke();
        // hp bar above
        const bw = e.r * 2.2, bh = 6;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-bw / 2, -e.r - 16, bw, bh);
        ctx.fillStyle = '#ff0040';
        ctx.fillRect(-bw / 2, -e.r - 16, bw * clamp(e.hp / e.maxHp, 0, 1), bh);
      }
      ctx.restore();
    }

    // Player (blink during invuln)
    const blink = S.invuln > 0 ? (Math.floor(S.time * 16) % 2 === 0) : false;
    if (!blink) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // inner highlight
      ctx.fillStyle = 'rgba(180,245,255,0.6)';
      ctx.beginPath(); ctx.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.45, 0, Math.PI * 2); ctx.fill();
      // turret line
      const ang = Math.atan2(p.aim.y, p.aim.x);
      ctx.strokeStyle = '#aef9ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * (p.r + 12), Math.sin(ang) * (p.r + 12));
      ctx.stroke();
      // turret tip
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * (p.r + 12), Math.sin(ang) * (p.r + 12), 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // v0.0.5 — Shield glowing ring (always drawn while active, even during i-frame blink)
    if (S.shieldT > 0) {
      const pulse = 0.6 + 0.4 * Math.sin(S.time * 8);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = 'rgba(0,229,255,' + (0.45 + 0.35 * pulse) + ')';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 18 * pulse;
      ctx.beginPath();
      ctx.arc(0, 0, p.r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Damage flash overlay
    if (S.flash > 0) {
      ctx.fillStyle = 'rgba(255,40,60,' + (S.flash * 0.6) + ')';
      ctx.fillRect(-sx - 24, -sy - 24, W + 48, H + 48);
    }

    ctx.restore();
  }

  // ===== MENU RENDER (start / gameover backdrop) =====
  function ensureAmbient() {
    if (S.ambient.length === 0) {
      const colors = ['#ff2bd6', '#ff8a00', '#ff3344', '#00e5ff'];
      for (let i = 0; i < 18; i++) {
        S.ambient.push({
          x: rand(0, W), y: rand(0, H),
          vx: rand(-25, 25), vy: rand(-25, 25),
          r: rand(3, 9),
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }
  }

  function renderMenu(dt) {
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, W, H);
    drawGrid(0, 0);
    ensureAmbient();
    for (let i = 0; i < S.ambient.length; i++) {
      const a = S.ambient[i];
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.x < -20) a.x = W + 20; if (a.x > W + 20) a.x = -20;
      if (a.y < -20) a.y = H + 20; if (a.y > H + 20) a.y = -20;
      ctx.shadowColor = a.color; ctx.shadowBlur = 12;
      ctx.fillStyle = a.color;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // ===== HUD =====
  function updateHUD() {
    scoreVal.textContent = S.score.toLocaleString();
    levelVal.textContent = S.level;
    const remaining = S.spawnQueue.length + S.enemies.length;
    const killed = S.waveTotal - remaining;
    const isBoss = S.level % CFG.bossEvery === 0;
    waveVal.textContent = isBoss ? 'BOSS' : (killed + ' / ' + S.waveTotal);
    livesDots.innerHTML = '';
    for (let i = 0; i < CFG.startLives; i++) {
      const d = document.createElement('span');
      d.className = 'life-dot' + (i >= S.lives ? ' gone' : '');
      livesDots.appendChild(d);
    }
    bestStart.textContent = S.best.toLocaleString();
    // v0.0.5 — powerup HUD timers
    if (powerupHud) {
      let html = '';
      if (S.shieldT > 0) html += '<span class="pu-chip shield">SHIELD ' + S.shieldT.toFixed(1) + 's</span>';
      if (S.overchargeT > 0) html += '<span class="pu-chip over">OVER ' + S.overchargeT.toFixed(1) + 's</span>';
      powerupHud.innerHTML = html;
    }
  }

  // ===== LOOP =====
  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (S.mode === 'playing') {
      update(dt);
      render();
      updateHUD();   // v0.0.5 — per-frame HUD refresh for powerup timers
    } else if (S.mode === 'paused') {
      render();
    } else {
      renderMenu(dt);
    }
    requestAnimationFrame(loop);
  }

  // ===== BUTTON WIRING =====
  el('btnPlay').addEventListener('click', startGame);
  el('btnRetry').addEventListener('click', startGame);
  el('btnHome').addEventListener('click', () => { setMode('start'); updateHUD(); });
  el('btnPause').addEventListener('click', togglePause);
  el('btnResume').addEventListener('click', togglePause);
  el('btnQuit').addEventListener('click', () => { setMode('start'); updateHUD(); });
  el('btnMute').addEventListener('click', toggleMute);

  // ===== INIT =====
  detectTouch();
  if (isTouch) blockCanvasTouch();
  loadBest();
  resize();
  updateHUD();
  setMode('start');
  requestAnimationFrame(loop);
})();
// ---- v0.0.5 gamekit wiring (splash + menu + stats + leaderboard + auto-update) ----
if (window.GK) {
  GK.boot({ title: "Pulse Arena", tagline: "Twin-stick arena survival", theme: "#0e1419" });
  GK.help({ title: "Pulse Arena", objective: "Survive endless waves of enemies. A boss appears every 5th wave.", controls: ["WASD / Arrows: move","Mouse: aim","Space / Click: fire","Touch: drag to move, auto-fire","P: pause","F: fullscreen","H: help"], tips: "Pick up drops for Shield/Overcharge powerups." });
  GK.exposeState(function () { try { return { score: (window.S && window.S.score) || window.score || 0, mode: (window.S && window.S.mode) || 'play', wave: (window.S && window.S.wave) || 0 }; } catch (e) { return {}; } });
  GK._manualRecord = false;
  setTimeout(function () { GK.ready(); }, 600);
}
