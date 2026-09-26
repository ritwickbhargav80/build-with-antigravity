/**
 * TYPE//TANK - Core Combat & Graphics Engine
 * Global: window.Game
 */

(function () {
  'use strict';

  // --- Difficulty & Progression Curves Configuration ---
  const DIFFICULTY_CONFIG = {
    baseCrossTimeSec: 9.0,         // Initial seconds for a word to cross top-to-bottom
    minCrossTimeSec: 3.0,          // Maximum speed cap
    speedBonusPer10Kills: 0.04,    // +4% speed per 10 hostiles destroyed
    speedBonusPer20Sec: 0.03,      // +3% speed per 20 seconds elapsed
    baseSpawnIntervalSec: 2.2,     // Initial hostile spawn interval
    minSpawnIntervalSec: 0.7,      // Fastest spawn interval
    baseMaxConcurrentWords: 4,     // Starting concurrent hostile limit
    hardCapConcurrentWords: 12,    // Maximum concurrent hostiles on screen
    crimsonBaseChance: 0.08,       // Base crimson spawn probability (8%)
    crimsonMaxChance: 0.15,        // Max crimson spawn probability (15%)
    crimsonSpeedMultiplier: 1.6,   // Crimson fall velocity factor
    perimeterNormY: 0.84           // Normalized defensive perimeter boundary
  };

  // Canvas and Rendering Contexts
  let canvas = null;
  let ctx = null;
  let confettiCanvas = null;
  let confettiCtx = null;

  // Screen Shake & Camera
  let shakeIntensity = 0;
  let prefersReducedMotion = false;

  // Engine Lifecycle State
  let isRunning = false;
  let isPaused = false;
  let isCountingDown = false;
  let isGameOver = false;
  let timeScale = 1.0;
  let slowMoTimer = 0;
  let lastTimestamp = 0;
  let activeCombatSeconds = 0;

  // Sortie Operational Session Parameters
  let currentMode = 1;
  let currentCallsign = 'GHOST';
  let callbacks = {
    onGameOver: null,
    onAbort: null
  };

  // Defensive Metrics & Telemetry
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let wordsDestroyed = 0;
  let correctKeystrokes = 0;
  let totalKeystrokes = 0;
  let currentLevel = 1;
  let hullIntegrity = 100; // 0..100
  let isAborted = false;

  // Tank Chassis & Turret Geometry
  const tank = {
    x: 0.5,        // Normalized center
    y: 0.93,       // Anchored near bottom
    angle: -Math.PI / 2, // Current angle (pointing straight up)
    targetAngle: -Math.PI / 2,
    recoil: 0,
    treadOffset: 0,
    isDestroyed: false
  };

  // Targeting Radar
  let lockedWord = null; // Reference to hostile currently locked
  let reticlePulseTimer = 0;
  let reticleMissTimer = 0;

  // Active Entities
  let hostiles = [];
  let nextHostileId = 1;
  let spawnCooldownSec = 1.0;

  // Object Pools for High-Performance Zero-Allocation Loops
  const BULLET_POOL_SIZE = 40;
  const PARTICLE_POOL_SIZE = 250;
  const CONFETTI_POOL_SIZE = 120;

  const bulletPool = [];
  const particlePool = [];
  const confettiPool = [];

  function initObjectPools() {
    bulletPool.length = 0;
    for (let i = 0; i < BULLET_POOL_SIZE; i++) {
      bulletPool.push({
        active: false,
        x: 0,
        y: 0,
        targetWord: null,
        targetCharIndex: 0,
        trail: [],
        speed: 1.4 // Normalized units/sec
      });
    }

    particlePool.length = 0;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      particlePool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        color: '#33ff66',
        alpha: 1,
        life: 0,
        maxLife: 0.5
      });
    }

    confettiPool.length = 0;
    for (let i = 0; i < CONFETTI_POOL_SIZE; i++) {
      confettiPool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 6,
        color: '#33ff66',
        rotation: 0,
        rotSpeed: 0,
        alpha: 1
      });
    }
  }

  // Particle Allocator from Pool
  function spawnParticle(x, y, vx, vy, color, size, life) {
    for (let i = 0; i < particlePool.length; i++) {
      const p = particlePool[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.color = color;
        p.size = size;
        p.alpha = 1;
        p.life = 0;
        p.maxLife = life;
        return p;
      }
    }
    return null;
  }

  // Bullet Allocator from Pool
  function spawnBullet(startX, startY, targetWord, charIndex) {
    for (let i = 0; i < bulletPool.length; i++) {
      const b = bulletPool[i];
      if (!b.active) {
        b.active = true;
        b.x = startX;
        b.y = startY;
        b.targetWord = targetWord;
        b.targetCharIndex = charIndex;
        b.trail = [];
        return b;
      }
    }
    return null;
  }

  // Burst Particles Helper
  function spawnExplosion(normX, normY, color = '#33ff66', count = 25, maxSpeed = 0.4) {
    const particleCount = prefersReducedMotion ? Math.floor(count / 3) : count;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.05 + Math.random() * 0.95) * maxSpeed;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 1.5 + Math.random() * 3.5;
      const life = 0.3 + Math.random() * 0.5;
      spawnParticle(normX, normY, vx, vy, color, size, life);
    }
  }

  // --- Dynamic Difficulty Calculations ---
  function getDifficultyMultiplier() {
    const killFactor = Math.floor(wordsDestroyed / 10) * DIFFICULTY_CONFIG.speedBonusPer10Kills;
    const timeFactor = Math.floor(activeCombatSeconds / 20) * DIFFICULTY_CONFIG.speedBonusPer20Sec;
    return 1.0 + killFactor + timeFactor;
  }

  function getWordFallSpeed(isCrimson = false) {
    const mult = getDifficultyMultiplier();
    const effectiveCrossTime = Math.max(
      DIFFICULTY_CONFIG.minCrossTimeSec,
      DIFFICULTY_CONFIG.baseCrossTimeSec / mult
    );
    const baseSpeed = 1.0 / effectiveCrossTime;
    return baseSpeed * (isCrimson ? DIFFICULTY_CONFIG.crimsonSpeedMultiplier : 1.0);
  }

  function getSpawnInterval() {
    const mult = getDifficultyMultiplier();
    return Math.max(
      DIFFICULTY_CONFIG.minSpawnIntervalSec,
      DIFFICULTY_CONFIG.baseSpawnIntervalSec / mult
    );
  }

  function getMaxConcurrentWords() {
    const bonus = Math.floor(wordsDestroyed / 8);
    return Math.min(
      DIFFICULTY_CONFIG.hardCapConcurrentWords,
      DIFFICULTY_CONFIG.baseMaxConcurrentWords + bonus
    );
  }

  function getCrimsonChance() {
    const progress = Math.min(1.0, wordsDestroyed / 50);
    return DIFFICULTY_CONFIG.crimsonBaseChance + (DIFFICULTY_CONFIG.crimsonMaxChance - DIFFICULTY_CONFIG.crimsonBaseChance) * progress;
  }

  // --- Telemetry & DOM HUD Updates ---
  function getComboMultiplier() {
    return Math.min(4.0, 1.0 + Math.floor(combo / 5) * 0.5);
  }

  function getLiveWPM() {
    if (activeCombatSeconds < 5) return '--';
    const minutes = activeCombatSeconds / 60;
    const wpm = (correctKeystrokes / 5) / minutes;
    return Math.round(wpm);
  }

  function getLiveAccuracy() {
    if (totalKeystrokes === 0) return '100.0%';
    const acc = (correctKeystrokes / totalKeystrokes) * 100;
    return acc.toFixed(1) + '%';
  }

  function updateDOMHud() {
    const elOp = document.getElementById('hud-op');
    const elMode = document.getElementById('hud-mode');
    const elScore = document.getElementById('hud-score');
    const elCombo = document.getElementById('hud-combo');
    const elWpm = document.getElementById('hud-wpm');
    const elAcc = document.getElementById('hud-acc');
    const elLvl = document.getElementById('hud-lvl');
    const elHullBar = document.getElementById('hud-hull-bar');
    const elHullPct = document.getElementById('hud-hull-pct');

    if (elOp) elOp.textContent = currentCallsign;
    if (elMode) {
      const modeNames = { 1: '1 ALPHA', 2: '2 BRAVO', 3: '3 CHARLIE', 4: '4 DELTA' };
      elMode.textContent = modeNames[currentMode] || '1 ALPHA';
    }
    if (elScore) elScore.textContent = String(Math.round(score)).padStart(6, '0');
    if (elCombo) elCombo.textContent = '×' + getComboMultiplier().toFixed(1);
    if (elWpm) elWpm.textContent = getLiveWPM();
    if (elAcc) elAcc.textContent = getLiveAccuracy();
    if (elLvl) elLvl.textContent = currentLevel;

    if (elHullPct) elHullPct.textContent = Math.max(0, Math.round(hullIntegrity)) + '%';
    if (elHullBar) {
      const blocks = Math.max(0, Math.ceil(hullIntegrity / 10));
      const filled = '█'.repeat(blocks);
      const empty = '░'.repeat(10 - blocks);
      elHullBar.textContent = `[${filled}${empty}]`;
      elHullBar.className = 'hud-hull-graphic';
      if (hullIntegrity <= 25) {
        elHullBar.classList.add('hull-crit');
      } else if (hullIntegrity <= 50) {
        elHullBar.classList.add('hull-mid');
      }
    }
  }

  // Threat Level Announcement Banner
  function showThreatBanner(lvl) {
    const banner = document.getElementById('threat-banner');
    if (!banner) return;
    banner.textContent = `THREAT LEVEL ${lvl}`;
    banner.classList.add('visible');
    setTimeout(() => {
      banner.classList.remove('visible');
    }, 1600);
  }

  // Priority Target Flash Alert
  function showCrimsonAlert() {
    const banner = document.getElementById('crimson-alert-banner');
    if (!banner) return;
    banner.classList.add('visible');
    setTimeout(() => {
      banner.classList.remove('visible');
    }, 1400);
  }

  // --- Word Spawning & Positioning ---
  function spawnHostile() {
    if (hostiles.length >= getMaxConcurrentWords()) return;

    // Check crimson eligibility
    const wantsCrimson = Math.random() < getCrimsonChance();
    const wordText = window.Words.selectSpawnWord(currentMode, wantsCrimson, hostiles, currentLevel);
    if (!wordText) return;

    const isCrimson = wantsCrimson && !window.Words.SpawnExclusion.isCharBlockedByCrimson(wordText[0]);

    // Measure approximate word width in normalized units (canvas width dependent)
    const cw = canvas ? canvas.width : 800;
    // Estimate char width: 14px * dpr at 1000px canvas ~= 0.016 normalized per char
    const estCharWidthNorm = 15 / (cw || 800);
    const wordWidthNorm = (wordText.length * estCharWidthNorm) + 0.04;

    // Find non-overlapping X coordinate near top band (y < 0.25)
    let bestX = 0.05 + Math.random() * (0.90 - wordWidthNorm);
    const topBandHostiles = hostiles.filter(h => h.y < 0.25);
    
    // Try up to 5 attempts to minimize horizontal overlap with hostiles in top band
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateX = 0.05 + Math.random() * Math.max(0.01, 0.90 - wordWidthNorm);
      const overlaps = topBandHostiles.some(h => Math.abs(h.x - candidateX) < 0.16);
      if (!overlaps) {
        bestX = candidateX;
        break;
      }
    }

    const hostile = {
      id: nextHostileId++,
      text: wordText,
      typedIndex: 0,      // Keystrokes correctly registered
      hitIndex: 0,        // Bullets that visually struck
      completed: false,   // True when typedIndex === text.length
      isCrimson: isCrimson,
      x: bestX,
      y: 0.02,
      speed: getWordFallSpeed(isCrimson),
      pulse: 0
    };

    hostiles.push(hostile);

    if (isCrimson) {
      window.Words.SpawnExclusion.onCrimsonSpawned(wordText[0]);
      window.Sfx.crimsonSpawn();
      showCrimsonAlert();
    }
  }

  // --- Targeting & Input Engine ---
  function handleInputKey(key) {
    if (!isRunning || isPaused || isCountingDown || isGameOver) return;

    // Ignore multi-char control keys (except Backspace)
    if (key === 'Backspace') {
      if (lockedWord) {
        // Release radar lock; typed letters remain dimmed; word is freed
        lockedWord = null;
        window.Sfx.uiClick();
      }
      return;
    }

    // Must be a single printable character
    if (key.length !== 1) return;

    totalKeystrokes++;

    // 1. If currently locked onto a target
    if (lockedWord && !lockedWord.completed) {
      const expectedChar = lockedWord.text[lockedWord.typedIndex];
      if (key === expectedChar) {
        // Correct strike!
        fireBulletAtLockedWord(lockedWord, lockedWord.typedIndex);
        lockedWord.typedIndex++;
        correctKeystrokes++;

        // Check if word is fully typed
        if (lockedWord.typedIndex === lockedWord.text.length) {
          onWordFullyTyped(lockedWord);
          lockedWord = null; // Instantly free lock for next target
        }
      } else {
        // Miss on locked target
        registerMiss();
      }
      return;
    }

    // 2. If NO active lock: search all live hostiles whose NEXT untyped char === key
    // Spec: "find all live words whose first char === key... lock onto the one with the greatest y (tie -> closer to turret)"
    const candidates = hostiles.filter(h => {
      if (h.completed) return false;
      const nextChar = h.text[h.typedIndex];
      return nextChar === key;
    });

    if (candidates.length > 0) {
      // Sort: greatest y first; tie breaker: closer to turret X (0.5)
      candidates.sort((a, b) => {
        if (Math.abs(b.y - a.y) > 0.005) {
          return b.y - a.y; // Lowest word (greatest y) wins
        }
        return Math.abs(a.x - 0.5) - Math.abs(b.x - 0.5);
      });

      const selected = candidates[0];
      lockedWord = selected;
      reticlePulseTimer = 0;

      // Immediately register first hit
      fireBulletAtLockedWord(selected, selected.typedIndex);
      selected.typedIndex++;
      correctKeystrokes++;

      if (selected.typedIndex === selected.text.length) {
        onWordFullyTyped(selected);
        lockedWord = null;
      }
    } else {
      // Miss: no hostile starts with this key
      registerMiss();
    }
  }

  function registerMiss() {
    combo = 0; // Combo breaks to x1
    reticleMissTimer = 0.25; // Amber reticle flash
    window.Sfx.miss();
    updateDOMHud();
  }

  function fireBulletAtLockedWord(word, charIdx) {
    // Tank recoil & flash
    tank.recoil = 0.02;
    window.Sfx.laser();

    // Muzzle sparks
    const barrelX = tank.x + Math.cos(tank.angle) * 0.05;
    const barrelY = tank.y + Math.sin(tank.angle) * 0.05;
    for (let i = 0; i < (prefersReducedMotion ? 2 : 5); i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const spd = 0.2 + Math.random() * 0.3;
      spawnParticle(
        barrelX,
        barrelY,
        Math.cos(tank.angle + spread) * spd,
        Math.sin(tank.angle + spread) * spd,
        '#66ff8f',
        2.5,
        0.18
      );
    }

    spawnBullet(barrelX, barrelY, word, charIdx);
  }

  function onWordFullyTyped(word) {
    word.completed = true;

    // Logical scoring immediately
    const charCount = word.text.length;
    const comboMult = getComboMultiplier();
    const crimsonMultiplier = word.isCrimson ? 3.5 : 1.0;
    const wordPoints = Math.round(charCount * 10 * comboMult * crimsonMultiplier);

    score += wordPoints;
    combo++;
    if (combo > maxCombo) {
      maxCombo = combo;
    }

    updateDOMHud();
  }

  // --- Projectile & Entity Update Logic ---
  function updateBullets(dt) {
    const bulletSpeedNorm = 1.6; // Speed in normalized units/second

    for (let i = 0; i < bulletPool.length; i++) {
      const b = bulletPool[i];
      if (!b.active) continue;

      const target = b.targetWord;
      // If target got destroyed or removed
      if (!target) {
        b.active = false;
        continue;
      }

      // Compute target character coordinate in normalized world units
      const charWidthEst = 0.016;
      const targetCharX = target.x + (b.targetCharIndex + 0.5) * charWidthEst;
      const targetCharY = target.y + 0.015;

      // Homing vector towards target
      const dx = targetCharX - b.x;
      const dy = targetCharY - b.y;
      const dist = Math.hypot(dx, dy);

      const step = bulletSpeedNorm * dt;

      // Save trail
      b.trail.unshift({ x: b.x, y: b.y });
      if (b.trail.length > 5) b.trail.pop();

      if (dist <= step || dist < 0.02) {
        // Bullet impacted the target character
        b.active = false;
        target.hitIndex++;

        // Impact spark burst
        const sparkColor = target.isCrimson ? '#ff2a3d' : '#33ff66';
        spawnExplosion(targetCharX, targetCharY, sparkColor, prefersReducedMotion ? 4 : 8, 0.25);

        // If all characters of word visually struck
        if (target.hitIndex >= target.text.length) {
          eliminateHostile(target, true);
        }
      } else {
        // Move towards target
        b.x += (dx / dist) * step;
        b.y += (dy / dist) * step;
      }
    }
  }

  function eliminateHostile(word, byPlayer = true) {
    // Big explosion at hostile location
    const centerCharX = word.x + (word.text.length * 0.016) / 2;
    const explColor = word.isCrimson ? '#ff2a3d' : '#33ff66';
    spawnExplosion(centerCharX, word.y + 0.01, explColor, 35, 0.5);
    window.Sfx.explosion();

    if (word.isCrimson) {
      window.Words.SpawnExclusion.onCrimsonEnded(word.text[0]);
    }

    if (lockedWord === word) {
      lockedWord = null;
    }

    // Remove from active hostiles
    hostiles = hostiles.filter(h => h.id !== word.id);

    if (byPlayer) {
      wordsDestroyed++;
      // Check level bump every 10 kills
      const newLevel = 1 + Math.floor(wordsDestroyed / 10);
      if (newLevel > currentLevel) {
        currentLevel = newLevel;
        window.Sfx.levelUp();
        showThreatBanner(currentLevel);
      }
      updateDOMHud();
    }
  }

  function triggerPerimeterBreach(word) {
    // Explosion at perimeter impact
    const impactX = word.x + (word.text.length * 0.016) / 2;
    spawnExplosion(impactX, DIFFICULTY_CONFIG.perimeterNormY, '#ff2a3d', 40, 0.6);
    window.Sfx.hullHit();

    if (!prefersReducedMotion) {
      shakeIntensity = word.isCrimson ? 18 : 12;
    }

    const damage = word.isCrimson ? 30 : 20;
    hullIntegrity = Math.max(0, hullIntegrity - damage);
    combo = 0; // Combo reset on breach

    if (word.isCrimson) {
      window.Words.SpawnExclusion.onCrimsonEnded(word.text[0]);
    }

    if (lockedWord === word) {
      lockedWord = null;
    }

    // Remove hostile
    hostiles = hostiles.filter(h => h.id !== word.id);
    updateDOMHud();

    // Check Sortie Over
    if (hullIntegrity <= 0 && !isGameOver) {
      triggerTankDestruction();
    }
  }

  function triggerTankDestruction() {
    isGameOver = true;
    tank.isDestroyed = true;
    window.Sfx.gameOver();

    // Large debris burst
    spawnExplosion(tank.x, tank.y, '#ff2a3d', 80, 0.8);
    spawnExplosion(tank.x, tank.y, '#ffb000', 60, 0.6);

    // 1.5s slow-motion duration
    timeScale = 0.25;
    slowMoTimer = 1.5;
  }

  function finishSortie() {
    isRunning = false;
    isGameOver = true;
    timeScale = 1.0;

    const runStats = {
      mode: currentMode,
      score: Math.round(score),
      wpm: activeCombatSeconds >= 5 ? Math.round((correctKeystrokes / 5) / (activeCombatSeconds / 60)) : 0,
      acc: totalKeystrokes > 0 ? Number(((correctKeystrokes / totalKeystrokes) * 100).toFixed(1)) : 100.0,
      words: wordsDestroyed,
      maxCombo: maxCombo,
      duration: Math.round(activeCombatSeconds),
      aborted: isAborted
    };

    if (callbacks.onGameOver) {
      callbacks.onGameOver(runStats);
    }
  }

  // --- Turret Easing & Animations ---
  function updateTurret(dt) {
    if (tank.isDestroyed) return;

    // Recoil spring recovery
    if (tank.recoil > 0) {
      tank.recoil = Math.max(0, tank.recoil - dt * 0.15);
    }

    // Tread animation
    tank.treadOffset = (tank.treadOffset + dt * 4) % 10;

    // Determine target angle
    if (lockedWord) {
      const charWidthEst = 0.016;
      const targetX = lockedWord.x + (lockedWord.typedIndex + 0.5) * charWidthEst;
      const targetY = lockedWord.y + 0.015;
      const dx = targetX - tank.x;
      const dy = targetY - tank.y;
      let angle = Math.atan2(dy, dx);

      // Clamp to upper half-plane: straight left (-Math.PI) to straight right (0)
      if (angle > 0) {
        angle = dx >= 0 ? 0 : -Math.PI;
      }
      tank.targetAngle = angle;
    } else {
      // Idle back to straight vertical (-Math.PI / 2)
      tank.targetAngle = -Math.PI / 2;
    }

    // Angular easing (lerp towards targetAngle)
    const angleDiff = tank.targetAngle - tank.angle;
    tank.angle += angleDiff * Math.min(1.0, dt * 14);
  }

  // --- Main Tick Update ---
  function update(dt) {
    // Screen shake decay
    if (shakeIntensity > 0) {
      shakeIntensity = Math.max(0, shakeIntensity - dt * 35);
    }

    if (isGameOver) {
      // Handle slow-mo timer
      slowMoTimer -= dt / timeScale;
      if (slowMoTimer <= 0) {
        finishSortie();
        return;
      }
    }

    if (!isGameOver && !isCountingDown) {
      activeCombatSeconds += dt;

      // Hostile Spawner
      spawnCooldownSec -= dt;
      if (spawnCooldownSec <= 0) {
        spawnHostile();
        spawnCooldownSec = getSpawnInterval();
      }

      // Update Hostiles
      for (let i = hostiles.length - 1; i >= 0; i--) {
        const h = hostiles[i];
        h.y += h.speed * dt;
        h.pulse += dt * 5;

        // Check perimeter breach
        if (h.y >= DIFFICULTY_CONFIG.perimeterNormY && !h.completed) {
          triggerPerimeterBreach(h);
        }
      }

      // Update Reticle timers
      reticlePulseTimer += dt * 6;
      if (reticleMissTimer > 0) {
        reticleMissTimer = Math.max(0, reticleMissTimer - dt);
      }

      updateDOMHud();
    }

    updateTurret(dt);
    updateBullets(dt);

    // Update Particles
    for (let i = 0; i < particlePool.length; i++) {
      const p = particlePool[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - (p.life / p.maxLife);
    }
  }

  // --- Rendering Graphics Engine (Canvas 2D) ---
  function render() {
    if (!ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Apply Screen Shake
    if (shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * shakeIntensity;
      const sy = (Math.random() - 0.5) * shakeIntensity;
      ctx.translate(sx, sy);
    }

    // 1. Draw Defensive Perimeter Boundary Line
    const perimeterY = DIFFICULTY_CONFIG.perimeterNormY * h;
    ctx.strokeStyle = '#187733';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, perimeterY);
    ctx.lineTo(w, perimeterY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Perimeter boundary marker text
    ctx.fillStyle = '#187733';
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.fillText('--- DEFENSE PERIMETER // BREACH PROHIBITED ---', 16, perimeterY - 6);

    // 2. Render Hostile Words
    renderHostiles(w, h);

    // 3. Render Bullets & Tracer Lines
    renderBullets(w, h);

    // 4. Render Particles
    renderParticles(w, h);

    // 5. Render Tank Chassis & Turret
    renderTank(w, h);

    ctx.restore();
  }

  function renderHostiles(w, h) {
    ctx.textBaseline = 'top';

    hostiles.forEach(hostile => {
      const px = hostile.x * w;
      const py = hostile.y * h;

      const isLocked = (lockedWord === hostile);
      const isCrimson = hostile.isCrimson;

      // Font size responsive to canvas width
      const fontSize = Math.max(14, Math.floor(w * 0.021));
      ctx.font = `${fontSize}px "VT323", "Courier New", monospace`;

      const text = hostile.text;
      const typedLen = hostile.typedIndex;

      // Monospace character advance width
      const charW = ctx.measureText('M').width;
      const wordW = charW * text.length;

      // Reticle Box for Locked Hostile
      if (isLocked) {
        ctx.save();
        const pulse = Math.sin(reticlePulseTimer) * 2;
        const boxPadding = 8 + pulse;
        const boxX = px - boxPadding;
        const boxY = py - boxPadding;
        const boxW = wordW + boxPadding * 2;
        const boxH = fontSize + boxPadding * 2;

        const reticleColor = reticleMissTimer > 0 ? '#ffb000' : (isCrimson ? '#ff2a3d' : '#33ff66');
        ctx.strokeStyle = reticleColor;
        ctx.lineWidth = 1.5;

        // Bracket corners: [ word ]
        const bracketLen = 8;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(boxX + bracketLen, boxY);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX, boxY + bracketLen);
        // Bottom-left
        ctx.moveTo(boxX, boxY + boxH - bracketLen);
        ctx.lineTo(boxX, boxY + boxH);
        ctx.lineTo(boxX + bracketLen, boxY + boxH);
        // Top-right
        ctx.moveTo(boxX + boxW - bracketLen, boxY);
        ctx.lineTo(boxX + boxW, boxY);
        ctx.lineTo(boxX + boxW, boxY + bracketLen);
        // Bottom-right
        ctx.moveTo(boxX + boxW, boxY + boxH - bracketLen);
        ctx.lineTo(boxX + boxW, boxY + boxH);
        ctx.lineTo(boxX + boxW - bracketLen, boxY + boxH);
        ctx.stroke();

        ctx.restore();
      }

      // Draw word text character-by-character
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charX = px + i * charW;

        if (i < typedLen) {
          // Typed characters: dimmed 35-40% opacity
          ctx.fillStyle = isCrimson ? 'rgba(255, 42, 61, 0.38)' : 'rgba(51, 255, 102, 0.38)';
        } else {
          // Untyped characters: full brightness
          ctx.fillStyle = isCrimson ? '#ff2a3d' : '#33ff66';
        }

        ctx.fillText(char, charX, py);

        // Glowing cursor underline under NEXT character of locked hostile
        if (isLocked && i === typedLen) {
          ctx.save();
          ctx.fillStyle = '#e8ffe8';
          ctx.fillRect(charX, py + fontSize + 2, charW, 2.5);
          ctx.restore();
        }
      }
    });
  }

  function renderBullets(w, h) {
    bulletPool.forEach(b => {
      if (!b.active) return;
      const bx = b.x * w;
      const by = b.y * h;

      // Draw Tracer Trail
      if (b.trail.length > 0) {
        ctx.strokeStyle = 'rgba(102, 255, 143, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        b.trail.forEach(pt => ctx.lineTo(pt.x * w, pt.y * h));
        ctx.stroke();
      }

      // Bullet Head
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function renderParticles(w, h) {
    particlePool.forEach(p => {
      if (!p.active) return;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x * w - p.size / 2, p.y * h - p.size / 2, p.size, p.size);
      ctx.restore();
    });
  }

  function renderTank(w, h) {
    if (tank.isDestroyed) return;

    const cx = tank.x * w;
    const cy = tank.y * h;

    ctx.save();
    ctx.translate(cx, cy);

    // 1. Tread Chassis (bottom foundation)
    const chassisW = Math.min(110, w * 0.12);
    const chassisH = 18;
    ctx.fillStyle = '#060a06';
    ctx.strokeStyle = '#33ff66';
    ctx.lineWidth = 1.5;

    // Tread Base
    ctx.fillRect(-chassisW / 2, -chassisH / 2, chassisW, chassisH);
    ctx.strokeRect(-chassisW / 2, -chassisH / 2, chassisW, chassisH);

    // Tread Segment Lines (Animated)
    const segSpacing = 10;
    ctx.strokeStyle = '#187733';
    ctx.lineWidth = 1;
    for (let x = -chassisW / 2 + (tank.treadOffset % segSpacing); x < chassisW / 2; x += segSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, -chassisH / 2);
      ctx.lineTo(x, chassisH / 2);
      ctx.stroke();
    }

    // 2. Armored Dome (Semicircle)
    const domeR = Math.min(28, w * 0.035);
    ctx.fillStyle = '#08140a';
    ctx.strokeStyle = '#33ff66';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -chassisH / 2, domeR, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dome Plate Lines
    ctx.strokeStyle = '#187733';
    ctx.beginPath();
    ctx.moveTo(0, -chassisH / 2);
    ctx.lineTo(0, -chassisH / 2 - domeR);
    ctx.moveTo(-domeR * 0.6, -chassisH / 2);
    ctx.lineTo(-domeR * 0.4, -chassisH / 2 - domeR * 0.7);
    ctx.moveTo(domeR * 0.6, -chassisH / 2);
    ctx.lineTo(domeR * 0.4, -chassisH / 2 - domeR * 0.7);
    ctx.stroke();

    // 3. Artillery Barrel (Rotates & Recoils)
    ctx.save();
    ctx.translate(0, -chassisH / 2);
    ctx.rotate(tank.angle);

    const barrelLen = Math.min(42, w * 0.045);
    const barrelW = 7;
    const recoilPx = tank.recoil * h;

    ctx.fillStyle = '#0a1a0c';
    ctx.strokeStyle = '#66ff8f';
    ctx.lineWidth = 1.5;

    // Draw barrel with recoil displacement
    ctx.fillRect(-recoilPx, -barrelW / 2, barrelLen, barrelW);
    ctx.strokeRect(-recoilPx, -barrelW / 2, barrelLen, barrelW);

    // Muzzle brake ring
    ctx.fillStyle = '#33ff66';
    ctx.fillRect(barrelLen - recoilPx - 4, -barrelW / 2 - 1.5, 4, barrelW + 3);

    ctx.restore();
    ctx.restore();
  }

  // --- Confetti Engine (Debrief Personal Best Celebration) ---
  let confettiAnimId = null;

  function initConfetti() {
    if (!confettiCanvas) return;
    confettiCtx = confettiCanvas.getContext('2d');
    resizeConfetti();

    const colors = ['#33ff66', '#ffde59', '#ff2a3d', '#ffffff', '#66ff8f'];
    confettiPool.forEach(p => {
      p.active = true;
      p.x = Math.random() * confettiCanvas.width;
      p.y = -Math.random() * confettiCanvas.height * 0.5;
      p.vx = (Math.random() - 0.5) * 4;
      p.vy = 2 + Math.random() * 5;
      p.size = 5 + Math.random() * 6;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.rotation = Math.random() * Math.PI * 2;
      p.rotSpeed = (Math.random() - 0.5) * 0.1;
      p.alpha = 1;
    });
  }

  function resizeConfetti() {
    if (!confettiCanvas) return;
    const rect = confettiCanvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    confettiCanvas.width = rect.width * dpr;
    confettiCanvas.height = rect.height * dpr;
  }

  function loopConfetti() {
    if (!confettiCtx || !confettiCanvas) return;

    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let anyActive = false;

    confettiPool.forEach(p => {
      if (!p.active) return;
      anyActive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      if (p.y > confettiCanvas.height) {
        p.alpha -= 0.02;
        if (p.alpha <= 0) p.active = false;
      }

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rotation);
      confettiCtx.globalAlpha = Math.max(0, p.alpha);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
    });

    if (anyActive) {
      confettiAnimId = requestAnimationFrame(loopConfetti);
    }
  }

  // --- Engine Main Animation Loop ---
  function gameLoop(timestamp) {
    if (!isRunning) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    // Delta-time clamped to 50ms (0.050s) to prevent physics jumps
    const rawDt = (timestamp - lastTimestamp) / 1000;
    const dt = Math.min(0.05, rawDt) * timeScale;
    lastTimestamp = timestamp;

    if (!isPaused) {
      update(dt);
    }

    render();
    requestAnimationFrame(gameLoop);
  }

  // --- 3-2-1 Countdown Sequence ---
  function runCountdown(callback) {
    isCountingDown = true;
    const overlay = document.getElementById('countdown-overlay');
    const numDisplay = document.getElementById('countdown-number');
    if (!overlay || !numDisplay) {
      isCountingDown = false;
      if (callback) callback();
      return;
    }

    overlay.classList.add('active');
    let count = 3;

    function step() {
      if (count > 0) {
        numDisplay.textContent = count;
        window.Sfx.countdownBeep(false);
        count--;
        setTimeout(step, 800);
      } else {
        numDisplay.textContent = 'ENGAGE!';
        window.Sfx.countdownBeep(true);
        setTimeout(() => {
          overlay.classList.remove('active');
          isCountingDown = false;
          if (callback) callback();
        }, 600);
      }
    }

    step();
  }

  // --- Game Public API Interface ---
  const Game = {
    /**
     * Engine initialization
     */
    init(canvasEl, confettiEl, onGameOverCb, onAbortCb) {
      canvas = canvasEl;
      ctx = canvas.getContext('2d');
      confettiCanvas = confettiEl;

      callbacks.onGameOver = onGameOverCb;
      callbacks.onAbort = onAbortCb;

      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      initObjectPools();
      this.resize();

      // Listen for window blur / visibility change to auto-pause
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && isRunning && !isPaused && !isGameOver) {
          this.pause();
        }
      });

      window.addEventListener('blur', () => {
        if (isRunning && !isPaused && !isGameOver) {
          this.pause();
        }
      });
    },

    /**
     * Start a new combat sortie
     */
    startSortie(mode = 1, callsign = 'GHOST') {
      currentMode = mode;
      currentCallsign = callsign;

      // Reset state
      score = 0;
      combo = 0;
      maxCombo = 0;
      wordsDestroyed = 0;
      correctKeystrokes = 0;
      totalKeystrokes = 0;
      currentLevel = 1;
      hullIntegrity = 100;
      activeCombatSeconds = 0;
      isAborted = false;
      isGameOver = false;
      timeScale = 1.0;
      lockedWord = null;
      hostiles = [];
      spawnCooldownSec = 0.5;

      tank.angle = -Math.PI / 2;
      tank.targetAngle = -Math.PI / 2;
      tank.recoil = 0;
      tank.isDestroyed = false;

      window.Words.SpawnExclusion.reset();
      initObjectPools();

      this.resize();
      updateDOMHud();

      isRunning = true;
      isPaused = false;
      lastTimestamp = 0;

      // Begin countdown then unleash hostiles
      runCountdown(() => {
        requestAnimationFrame(gameLoop);
      });
    },

    /**
     * Tactical Pause
     */
    pause() {
      if (!isRunning || isGameOver || isCountingDown) return;
      isPaused = true;
      const overlay = document.getElementById('pause-overlay');
      if (overlay) overlay.classList.add('active');
    },

    /**
     * Resume from Pause
     */
    resume() {
      if (!isRunning || !isPaused) return;
      isPaused = false;
      lastTimestamp = performance.now();
      const overlay = document.getElementById('pause-overlay');
      if (overlay) overlay.classList.remove('active');
    },

    /**
     * Abort Sortie (Not eligible for Personal Bests)
     */
    abort() {
      if (!isRunning) return;
      isAborted = true;
      isPaused = false;
      const overlay = document.getElementById('pause-overlay');
      if (overlay) overlay.classList.remove('active');

      finishSortie();
    },

    /**
     * Keyboard Input Handler
     */
    handleKeyDown(event) {
      if (!isRunning) return;

      // Handle pause menu shortcuts
      if (isPaused) {
        if (event.key === 'Enter') {
          this.resume();
        } else if (event.key === 'Escape') {
          this.abort();
        } else if (event.key === 'm' || event.key === 'M') {
          window.Sfx.toggleMute();
        }
        return;
      }

      // Escape triggers pause overlay
      if (event.key === 'Escape') {
        this.pause();
        return;
      }

      // Prevent browser default scrolling or quick-find on Space, slash, quotes
      if ([' ', '/', "'", '"'].includes(event.key)) {
        event.preventDefault();
      }

      // Pass key to typing & targeting engine
      handleInputKey(event.key);
    },

    /**
     * Responsive Canvas Resize
     */
    resize() {
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      resizeConfetti();
    },

    /**
     * Trigger Debrief Confetti
     */
    startConfetti() {
      if (prefersReducedMotion) return;
      if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
      initConfetti();
      loopConfetti();
    },

    stopConfetti() {
      if (confettiAnimId) {
        cancelAnimationFrame(confettiAnimId);
        confettiAnimId = null;
      }
      if (confettiCtx && confettiCanvas) {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    },

    isPaused() {
      return isPaused;
    },

    isRunning() {
      return isRunning;
    },

    /**
     * Read-only telemetry state for testing & headless verification
     */
    debugState() {
      return {
        isRunning,
        isPaused,
        isCountingDown,
        isGameOver,
        lockedWord: lockedWord ? { ...lockedWord } : null,
        hostiles: hostiles.map(h => ({ ...h })),
        score,
        combo,
        currentLevel,
        hullIntegrity,
        wordsDestroyed
      };
    }
  };

  // Expose global namespace
  window.Game = Game;
})();
