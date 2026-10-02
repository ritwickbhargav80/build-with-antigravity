/**
 * TYPE//TANK - Combat Engine & Canvas 2D Simulator
 * 60 FPS real-time ballistic defense arena, turret dynamics, bullet physics,
 * lowest-first targeting, and particle explosion systems.
 */

class TypeTankGame {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSortieEnd = options.onSortieEnd || (() => {});
    this.onStatsUpdate = options.onStatsUpdate || (() => {});

    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.mode = 1;
    this.callsign = "COMMANDER";

    // Scoring & Statistics
    this.score = 0;
    this.combo = 1.0;
    this.maxCombo = 1.0;
    this.wordsDestroyed = 0;
    this.totalTypedChars = 0;
    this.correctTypedChars = 0;
    this.missedTypedChars = 0;
    this.startTime = 0;
    this.hull = 100; // 0 - 100%

    // Entities
    this.words = [];
    this.bullets = [];
    this.particles = [];
    this.lockedWord = null;
    this.exclusionManager = new WordExclusionManager();

    // Turret & Tank properties
    this.tankX = 0;
    this.tankY = 0;
    this.perimeterY = 0;
    this.turretAngle = -Math.PI / 2; // -90 deg (pointing straight up)
    this.targetTurretAngle = -Math.PI / 2;
    this.recoilDistance = 0;
    this.muzzleX = 0;
    this.muzzleY = 0;

    // Spawning & Difficulty
    this.lastSpawnTime = 0;
    this.spawnInterval = 2500; // ms
    this.minSpawnInterval = 1050; // ms
    this.baseSpeed = 0.55;
    this.speedMultiplier = 1.0;
    this.bonusSpawnCounter = 0;

    // Screen Shake & Tank Error Feedback
    this.screenShakeTime = 0;
    this.screenShakeIntensity = 0;
    this.tankGlitchTime = 0;
    this.tankShakeOffsetX = 0;
    this.tankShakeOffsetY = 0;

    // Animation frame handle
    this.rafId = null;
    this.lastFrameTime = performance.now();

    // High DPI & Resize binding
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    window.addEventListener("resize", this.resize);
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const rect = (parent && parent.clientWidth > 0) ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Recalibrate coordinates
    this.tankX = this.width / 2;
    this.perimeterY = this.height - 75;
    this.tankY = this.height - 30;

    // Reposition active words proportionally if resized during play
    this.words.forEach(w => {
      w.x = Math.max(70, Math.min(this.width - 70, w.relX ? w.relX * this.width : w.x));
    });
  }

  start(mode = 1, callsign = "COMMANDER") {
    this.mode = mode;
    this.callsign = callsign;
    this.isRunning = true;
    this.isPaused = false;

    this.score = 0;
    this.combo = 1.0;
    this.maxCombo = 1.0;
    this.wordsDestroyed = 0;
    this.totalTypedChars = 0;
    this.correctTypedChars = 0;
    this.missedTypedChars = 0;
    this.hull = 100;
    this.startTime = performance.now();

    this.words = [];
    this.bullets = [];
    this.particles = [];
    this.lockedWord = null;
    this.exclusionManager.reset();

    this.turretAngle = -Math.PI / 2;
    this.targetTurretAngle = -Math.PI / 2;
    this.recoilDistance = 0;

    this.lastSpawnTime = performance.now() - 1500;
    this.spawnInterval = 2500;
    this.baseSpeed = 0.55;
    this.speedMultiplier = 1.0;
    this.bonusSpawnCounter = 0;
    this.tankGlitchTime = 0;
    this.tankShakeOffsetX = 0;
    this.tankShakeOffsetY = 0;

    this.resize();
    this.lastFrameTime = performance.now();

    window.removeEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keydown", this.handleKeyDown);

    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.loop);

    this.updateStatsHUD();
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  triggerScreenShake(intensity = 8, durationMs = 250) {
    this.screenShakeIntensity = intensity;
    this.screenShakeTime = durationMs;
  }

  /**
   * Real-time keyboard input processor:
   * Handles target acquisition with lowest-first priority and ballistic firing
   */
  handleKeyDown(e) {
    if (!this.isRunning || this.isPaused) return;

    // Ignore navigation/control keys
    if (e.key === "Escape") {
      this.abortSortie();
      return;
    }
    if (e.ctrlKey || e.altKey || e.metaKey || e.key === "Tab" || e.key === "Shift" || e.key === "CapsLock") {
      return;
    }

    // Only process printable single character keystrokes
    if (e.key.length !== 1) return;

    const charTyped = e.key;
    e.preventDefault();

    this.totalTypedChars++;

    if (!this.lockedWord) {
      // 1. Target Acquisition: find all visible active words whose first character matches charTyped
      const matchingWords = this.words.filter(w => {
        if (w.isBreached || w.isDestroyed) return false;
        const expected = w.text.charAt(0);
        return expected === charTyped;
      });

      if (matchingWords.length > 0) {
        // AUTOMATICALLY LOCK ONTO LOWEST / BOTTOM-MOST WORD (HIGHEST Y COORDINATE)
        matchingWords.sort((a, b) => b.y - a.y);
        const target = matchingWords[0];

        this.lockedWord = target;
        if (window.soundEngine) {
          window.soundEngine.playLockChirp();
        }

        // Process first character hit
        this.processCharHit(target, charTyped);
      } else {
        // Miss / no match
        this.processCharMiss();
      }
    } else {
      // 2. Currently locked onto a word:
      const target = this.lockedWord;
      const expectedChar = target.text.charAt(target.typedIndex);

      if (charTyped === expectedChar) {
        this.processCharHit(target, charTyped);
      } else {
        // 1. Prefix Branch Switch: Check if the player was typing for another word sharing the typed prefix
        // (e.g. typed 'C' locking 'Crossfire', then typed 'A' for 'Caliber' -> switches to 'Caliber')
        const currentPrefix = target.text.slice(0, target.typedIndex);
        const prefixPlusChar = currentPrefix + charTyped;

        const prefixMatches = this.words.filter(w => {
          if (w === target || w.isBreached || w.isDestroyed) return false;
          return w.text.startsWith(prefixPlusChar);
        });

        if (prefixMatches.length > 0) {
          target.typedIndex = 0;
          prefixMatches.sort((a, b) => b.y - a.y);
          const newTarget = prefixMatches[0];
          this.lockedWord = newTarget;
          newTarget.typedIndex = currentPrefix.length;

          if (window.soundEngine) {
            window.soundEngine.playLockChirp();
          }

          this.processCharHit(newTarget, charTyped);
        } else {
          // 2. Starting Letter Switch: If player typed the starting letter of any other word on screen
          const alternateTargets = this.words.filter(w => {
            if (w === target || w.isBreached || w.isDestroyed) return false;
            return w.text.charAt(0) === charTyped;
          });

          if (alternateTargets.length > 0) {
            target.typedIndex = 0;
            alternateTargets.sort((a, b) => b.y - a.y);
            const newTarget = alternateTargets[0];
            this.lockedWord = newTarget;

            if (window.soundEngine) {
              window.soundEngine.playLockChirp();
            }

            this.processCharHit(newTarget, charTyped);
          } else {
            this.processCharMiss();
          }
        }
      }
    }

    this.updateStatsHUD();
  }

  processCharHit(target, char) {
    this.correctTypedChars++;
    target.typedIndex++;

    // Combo progression
    this.combo = Math.min(5.0, Math.round((this.combo + 0.1) * 10) / 10);
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Incremental hit score
    const letterScore = Math.round(15 * this.combo * (target.isBonus ? 3.5 : 1.0));
    this.score += letterScore;

    // Calculate exact target coordinate for this specific character in the word
    const charCoord = this.getCharPosition(target, target.typedIndex - 1);

    // Aim turret smoothly towards target character
    const dx = charCoord.x - this.tankX;
    const dy = charCoord.y - this.tankY;
    this.targetTurretAngle = Math.atan2(dy, dx);

    // Cannon recoil and muzzle flash
    this.recoilDistance = 10;
    this.createMuzzleFlash();

    // Fire visible ballistic bullet
    this.spawnBullet(charCoord.x, charCoord.y, target);

    // Audio SFX
    if (window.soundEngine) {
      window.soundEngine.playLaserShot();
    }

    // Check if entire word is neutralized
    if (target.typedIndex >= target.text.length) {
      this.destroyWord(target);
    }
  }

  processCharMiss() {
    this.missedTypedChars++;
    // Reset combo
    this.combo = 1.0;

    // Visual Cue: High-impact tank shudder & red glitch flash
    this.tankGlitchTime = 220; // ms duration for red glitch flash & violent shudder
    this.triggerScreenShake(4, 120);

    // Spawn error sparks around the tank core and treads
    this.createTankErrorSparks();

    if (window.soundEngine) {
      window.soundEngine.playKeyError();
    }
  }

  createTankErrorSparks() {
    for (let i = 0; i < 9; i++) {
      const angle = -Math.PI * 0.8 + Math.random() * Math.PI * 0.6;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x: this.tankX + (Math.random() - 0.5) * 40,
        y: this.tankY - 6 + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: "#ffffff",
        glow: "#ff2244",
        radius: 1.5 + Math.random() * 2,
        alpha: 1.0,
        decay: 0.08 + Math.random() * 0.06
      });
    }
  }

  destroyWord(word) {
    word.isDestroyed = true;
    this.wordsDestroyed++;

    // Completion score bonus
    const wordBonus = Math.round(word.text.length * 80 * this.combo * (word.isBonus ? 3.5 : 1.0));
    this.score += wordBonus;

    // Heavy metallic explosion sound
    if (window.soundEngine) {
      window.soundEngine.playExplosion();
    }

    // Explosion particles & score popup
    this.createWordExplosion(word.x, word.y, word.isBonus);
    this.createScorePopup(word.x, word.y, `+${wordBonus}`, word.isBonus);

    // Release bonus exclusion if applicable
    if (word.isBonus) {
      this.exclusionManager.resolveBonus(word.text.charAt(0));
    }

    // Release lock
    if (this.lockedWord === word) {
      this.lockedWord = null;
    }

    // Filter out from active words
    this.words = this.words.filter(w => w !== word);
  }

  /**
   * Spawns a new hostile word based on arsenal mode, difficulty, and exclusion rules
   */
  spawnWord() {
    const isBonus = this.bonusSpawnCounter >= 5 && Math.random() < 0.45;
    if (isBonus) {
      this.bonusSpawnCounter = 0;
    } else {
      this.bonusSpawnCounter++;
    }

    // Extract first letters of currently falling active words
    const existingChars = this.words
      .filter(w => !w.isBreached && !w.isDestroyed)
      .map(w => w.text.charAt(0));

    // Pick compliant word
    const text = this.exclusionManager.pickWord(this.mode, isBonus, existingChars);
    if (!text) return;

    // Estimate text width in monospace font (16px wide font)
    const textWidth = text.length * 14;
    const margin = 50;
    const minX = margin + textWidth / 2;
    const maxX = this.width - margin - textWidth / 2;

    // Find good X position that doesn't immediately overlap horizontally
    let candidateX = minX + Math.random() * (maxX - minX);
    for (let attempts = 0; attempts < 6; attempts++) {
      const tooClose = this.words.some(w => w.y < 90 && Math.abs(w.x - candidateX) < textWidth + 30);
      if (!tooClose) break;
      candidateX = minX + Math.random() * (maxX - minX);
    }

    const speed = (this.baseSpeed * this.speedMultiplier) * (isBonus ? 1.6 : 1.0);

    const newWord = {
      id: "W-" + Date.now() + "-" + Math.random(),
      text: text,
      typedIndex: 0,
      x: candidateX,
      relX: candidateX / this.width,
      y: 20,
      speed: speed,
      isBonus: isBonus,
      isDestroyed: false,
      isBreached: false,
      textWidth: textWidth,
      spawnTime: performance.now()
    };

    this.words.push(newWord);

    // Audio chime for crimson bonus spawn
    if (isBonus && window.soundEngine) {
      window.soundEngine.playBonusSpawn();
    }
  }

  spawnBullet(targetX, targetY, targetWord) {
    // Starting position at cannon muzzle
    const barrelLength = 48 - this.recoilDistance;
    const startX = this.tankX + Math.cos(this.turretAngle) * barrelLength;
    const startY = this.tankY + Math.sin(this.turretAngle) * barrelLength;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy);
    const speed = 18; // High speed ballistic tracer

    this.bullets.push({
      x: startX,
      y: startY,
      prevX: startX,
      prevY: startY,
      targetX: targetX,
      targetY: targetY,
      targetWord: targetWord,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      life: 0,
      maxLife: Math.ceil(dist / speed) + 2
    });
  }

  getCharPosition(word, charIndex) {
    // Calculates canvas coordinate of a specific letter in the word
    const charWidth = 14;
    const totalW = word.text.length * charWidth;
    const startX = word.x - totalW / 2;
    return {
      x: startX + charIndex * charWidth + charWidth / 2,
      y: word.y
    };
  }

  createMuzzleFlash() {
    const barrelLength = 48 - this.recoilDistance;
    const muzzleX = this.tankX + Math.cos(this.turretAngle) * barrelLength;
    const muzzleY = this.tankY + Math.sin(this.turretAngle) * barrelLength;

    for (let i = 0; i < 7; i++) {
      const spread = (Math.random() - 0.5) * 0.7;
      const speed = 2 + Math.random() * 4;
      const angle = this.turretAngle + spread;
      this.particles.push({
        x: muzzleX,
        y: muzzleY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: "#ffffff",
        glow: "#00ff66",
        radius: 1.5 + Math.random() * 2,
        alpha: 1.0,
        decay: 0.12 + Math.random() * 0.08
      });
    }
  }

  createHitSparks(x, y, isBonus) {
    const color = isBonus ? "#ff3355" : "#00ff66";
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: "#ffffff",
        glow: color,
        radius: 1 + Math.random() * 2,
        alpha: 1.0,
        decay: 0.08 + Math.random() * 0.06
      });
    }
  }

  createWordExplosion(x, y, isBonus) {
    const primary = isBonus ? "#ff2244" : "#00ff66";
    const secondary = isBonus ? "#ffaa00" : "#aaffaa";
    const count = isBonus ? 36 : 24;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5.5;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? primary : secondary,
        glow: primary,
        radius: 1.5 + Math.random() * 3,
        alpha: 1.0,
        decay: 0.03 + Math.random() * 0.04
      });
    }
  }

  createBreachDetonation(x, y, isBonus) {
    const color = isBonus ? "#ff2244" : "#ff8800";
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI; // Explode upward
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * speed * 2,
        vy: -Math.abs(Math.sin(angle) * speed),
        color: "#ffffff",
        glow: color,
        radius: 2 + Math.random() * 3.5,
        alpha: 1.0,
        decay: 0.035 + Math.random() * 0.03
      });
    }
  }

  createScorePopup(x, y, text, isBonus) {
    this.particles.push({
      type: "text",
      text: text,
      x: x,
      y: y - 10,
      vy: -1.2,
      color: isBonus ? "#ff3355" : "#00ff66",
      alpha: 1.0,
      decay: 0.025
    });
  }

  abortSortie() {
    if (!this.isRunning) return;
    this.endSortie(true);
  }

  endSortie(wasAborted = false) {
    if (!this.isRunning) return;
    this.stop();

    const elapsedMinutes = Math.max(0.05, (performance.now() - this.startTime) / 60000);
    const wpm = Math.round((this.correctTypedChars / 5) / elapsedMinutes);
    const accuracy = this.totalTypedChars > 0 ? (this.correctTypedChars / this.totalTypedChars) * 100 : 0;

    const sortieData = {
      callsign: this.callsign,
      mode: this.mode,
      score: this.score,
      wpm: wpm,
      accuracy: accuracy,
      wordsDestroyed: this.wordsDestroyed,
      maxCombo: `x${this.maxCombo.toFixed(1)}`,
      wasAborted: wasAborted
    };

    if (this.onSortieEnd) {
      this.onSortieEnd(sortieData);
    }
  }

  updateStatsHUD() {
    const elapsedMinutes = Math.max(0.02, (performance.now() - this.startTime) / 60000);
    const currentWpm = Math.round((this.correctTypedChars / 5) / elapsedMinutes);
    const currentAccuracy = this.totalTypedChars > 0 ? (this.correctTypedChars / this.totalTypedChars) * 100 : 100;

    if (this.onStatsUpdate) {
      this.onStatsUpdate({
        score: this.score,
        combo: this.combo,
        wpm: currentWpm,
        accuracy: currentAccuracy,
        hull: this.hull,
        mode: this.mode,
        wordsDestroyed: this.wordsDestroyed
      });
    }
  }

  // ================= MAIN GAME LOOP =================
  loop(currentTime) {
    if (!this.isRunning) return;

    if (!this.width || this.width === 0 || !this.height || this.height === 0) {
      this.resize();
      if (!this.width || this.width === 0) {
        this.rafId = requestAnimationFrame(this.loop);
        return;
      }
    }

    const dt = Math.min(50, currentTime - this.lastFrameTime);
    this.lastFrameTime = currentTime;

    this.update(dt, currentTime);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  }

  update(dt, currentTime) {
    // 1. Difficulty scaling
    const elapsedSec = (currentTime - this.startTime) / 1000;
    this.speedMultiplier = 1.0 + Math.min(1.8, elapsedSec * 0.015 + this.wordsDestroyed * 0.02);
    const currentInterval = Math.max(this.minSpawnInterval, this.spawnInterval - elapsedSec * 15 - this.wordsDestroyed * 25);

    // 2. Spawn incoming words
    if (currentTime - this.lastSpawnTime > currentInterval) {
      this.spawnWord();
      this.lastSpawnTime = currentTime;
    }

    // 3. Update Turret Angle & Recoil
    if (this.lockedWord) {
      const activeCharIndex = Math.min(this.lockedWord.typedIndex, this.lockedWord.text.length - 1);
      const pos = this.getCharPosition(this.lockedWord, activeCharIndex);
      this.targetTurretAngle = Math.atan2(pos.y - this.tankY, pos.x - this.tankX);
    } else {
      // Idle turret: smooth neutral -90 degrees
      this.targetTurretAngle = -Math.PI / 2;
    }

    // Smooth rotational lerp
    let angleDiff = this.targetTurretAngle - this.turretAngle;
    // Normalize angle to -PI to PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.turretAngle += angleDiff * 0.22;

    // Constrain turret to 180° arc (-Math.PI to 0)
    if (this.turretAngle > 0) this.turretAngle = 0;
    if (this.turretAngle < -Math.PI) this.turretAngle = -Math.PI;

    // Recoil dampening
    if (this.recoilDistance > 0) {
      this.recoilDistance = Math.max(0, this.recoilDistance - 0.7);
    }

    // 4. Update Falling Words & Perimeter Breaches
    for (let i = this.words.length - 1; i >= 0; i--) {
      const word = this.words[i];
      word.y += word.speed * (dt / 16.667);

      // Check perimeter breach
      if (word.y >= this.perimeterY) {
        word.isBreached = true;
        const breachDamage = word.isBonus ? 30 : 20;
        this.hull = Math.max(0, this.hull - breachDamage);

        // Sound & Screen Shake
        if (window.soundEngine) {
          window.soundEngine.playDamage();
        }
        this.triggerScreenShake(14, 300);
        this.createBreachDetonation(word.x, this.perimeterY, word.isBonus);

        // Release bonus exclusion if breach was bonus
        if (word.isBonus) {
          this.exclusionManager.resolveBonus(word.text.charAt(0));
        }

        // Release lock if this word breached
        if (this.lockedWord === word) {
          this.lockedWord = null;
        }

        this.words.splice(i, 1);
        this.updateStatsHUD();

        // Hull critical breach: 0% integrity
        if (this.hull <= 0) {
          this.createWordExplosion(this.tankX, this.tankY, true);
          this.endSortie(false);
          return;
        }
      }
    }

    // 5. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.prevX = b.x;
      b.prevY = b.y;
      b.x += b.vx;
      b.y += b.vy;
      b.life++;

      // Check bullet impact
      const distToTarget = Math.hypot(b.x - b.targetX, b.y - b.targetY);
      if (distToTarget < 18 || b.life >= b.maxLife) {
        this.createHitSparks(b.targetX, b.targetY, b.targetWord && b.targetWord.isBonus);
        this.bullets.splice(i, 1);
      }
    }

    // 6. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.type === "text") {
        p.y += p.vy;
        p.alpha -= p.decay;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
      }
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 7. Screen Shake & Tank Shudder decay
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
    }

    if (this.tankGlitchTime > 0) {
      this.tankGlitchTime -= dt;
      // Calculate rapid lateral jitter
      const progress = Math.max(0, this.tankGlitchTime / 220);
      const jitterMag = 7 * progress;
      this.tankShakeOffsetX = (Math.random() - 0.5) * 2 * jitterMag;
      this.tankShakeOffsetY = (Math.random() - 0.5) * jitterMag * 0.6;
    } else {
      this.tankShakeOffsetX = 0;
      this.tankShakeOffsetY = 0;
    }
  }

  // ================= RENDERING =================
  render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen Shake Offset
    if (this.screenShakeTime > 0) {
      const intensity = (this.screenShakeTime / 250) * this.screenShakeIntensity;
      const offsetX = (Math.random() - 0.5) * intensity;
      const offsetY = (Math.random() - 0.5) * intensity;
      ctx.translate(offsetX, offsetY);
    }

    // Clear Canvas with authentic dark DOS terminal background
    ctx.fillStyle = "#020402";
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw Radar & Tactical Grid Lines
    this.drawTacticalGrid(ctx);

    // Draw Defense Perimeter
    this.drawDefensePerimeter(ctx);

    // Draw Tank & 180° Turret
    this.drawTank(ctx);

    // Draw Ballistic Bullets & Tracer Lines
    this.drawBullets(ctx);

    // Draw Hostile Words
    this.drawWords(ctx);

    // Draw Particles
    this.drawParticles(ctx);

    ctx.restore();
  }

  drawTacticalGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 255, 102, 0.05)";
    ctx.lineWidth = 1;

    // Horizontal radar lines
    for (let y = 40; y < this.perimeterY; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Sector vertical markings
    for (let x = 60; x < this.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.perimeterY);
      ctx.stroke();
    }

    // Radar arcs around tank
    ctx.strokeStyle = "rgba(0, 255, 102, 0.04)";
    const radii = [120, 240, 360];
    radii.forEach(r => {
      ctx.beginPath();
      ctx.arc(this.tankX, this.tankY, r, -Math.PI, 0);
      ctx.stroke();
    });

    ctx.restore();
  }

  drawDefensePerimeter(ctx) {
    ctx.save();
    const y = this.perimeterY;

    // Perimeter line with phosphor glow
    ctx.shadowColor = "#00ff66";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#00ff66";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(this.width, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Warning marker labels
    ctx.fillStyle = "rgba(0, 255, 102, 0.6)";
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.fillText("[ PERIMETER DEFENSE LINE // HULL SHIELD BARRIER ]", 14, y + 16);

    ctx.restore();
  }

  drawTank(ctx) {
    ctx.save();
    // Apply tank-specific glitch shake offset when typing error occurs
    const isGlitching = this.tankGlitchTime > 0;
    const x = this.tankX + this.tankShakeOffsetX;
    const y = this.tankY + this.tankShakeOffsetY;

    // Error highlight theme vs normal green phosphor theme
    const themeGlow = isGlitching ? "#ff2244" : "#00ff66";
    const themeStroke = isGlitching ? "#ff4466" : "#00ff66";
    const bodyFill = isGlitching ? "#25060a" : "#061309";
    const turretFill = isGlitching ? "#35080e" : "#081d0d";
    const barrelFill = isGlitching ? "#2e070c" : "#0b2612";
    const barrelStroke = isGlitching ? "#ff6688" : "#33ff77";

    // 1. TANK CHASSIS / TREAD BASE
    ctx.shadowColor = themeGlow;
    ctx.shadowBlur = isGlitching ? 14 : 6;
    ctx.fillStyle = bodyFill;
    ctx.strokeStyle = themeStroke;
    ctx.lineWidth = 2;

    const baseWidth = 84;
    const baseHeight = 16;
    ctx.fillRect(x - baseWidth / 2, y, baseWidth, baseHeight);
    ctx.strokeRect(x - baseWidth / 2, y, baseWidth, baseHeight);

    // Tread notches
    ctx.fillStyle = themeStroke;
    for (let tx = x - baseWidth / 2 + 6; tx < x + baseWidth / 2 - 4; tx += 9) {
      ctx.fillRect(tx, y + 2, 4, baseHeight - 4);
    }

    // 2. 180° ROTATING CANNON BARREL
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.turretAngle);

    const barrelLength = 48 - this.recoilDistance;
    const barrelWidth = 10;

    // Barrel body
    ctx.fillStyle = barrelFill;
    ctx.strokeStyle = barrelStroke;
    ctx.lineWidth = 1.5;
    ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);
    ctx.strokeRect(0, -barrelWidth / 2, barrelLength, barrelWidth);

    // Muzzle brake ring
    ctx.fillStyle = themeStroke;
    ctx.fillRect(barrelLength - 6, -barrelWidth / 2 - 2, 6, barrelWidth + 4);

    ctx.restore();

    // 3. SEMICIRCULAR DOME TURRET
    ctx.beginPath();
    ctx.arc(x, y, 26, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = turretFill;
    ctx.fill();
    ctx.stroke();

    // Armor rivets & hatch
    ctx.beginPath();
    ctx.arc(x, y - 10, 8, Math.PI, 0, false);
    ctx.fillStyle = themeStroke;
    ctx.fill();

    // Status core light
    const coreColor = isGlitching ? "#ff2244" : (this.hull > 50 ? "#00ff66" : (this.hull > 25 ? "#ffb000" : "#ff2244"));
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = isGlitching ? 16 : 10;
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(x, y - 4, isGlitching ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();

    // Visual warning tag cleanly positioned at base below the tank when misfiring
    if (isGlitching) {
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = "#ff3355";
      ctx.shadowColor = "#ff2244";
      ctx.shadowBlur = 8;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("! MISFIRE !", x, y + baseHeight + 3);
    }

    ctx.restore();
  }

  drawBullets(ctx) {
    ctx.save();
    ctx.lineWidth = 2.5;

    for (const b of this.bullets) {
      const isBonus = b.targetWord && b.targetWord.isBonus;
      const bulletColor = isBonus ? "#ff3355" : "#00ff66";
      const coreColor = "#ffffff";

      // Tracer trail line
      ctx.shadowColor = bulletColor;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = bulletColor;
      ctx.beginPath();
      ctx.moveTo(b.prevX, b.prevY);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Bright bullet head
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawWords(ctx) {
    ctx.save();
    ctx.font = "16px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const word of this.words) {
      const charWidth = 14;
      const totalWidth = word.text.length * charWidth;
      const startX = word.x - totalWidth / 2;
      const isLocked = (this.lockedWord === word);

      // 1. Draw target reticle box if locked
      if (isLocked) {
        ctx.save();
        ctx.strokeStyle = word.isBonus ? "#ff2244" : "#00ff66";
        ctx.shadowColor = word.isBonus ? "#ff2244" : "#00ff66";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.5;

        const padX = 10;
        const padY = 8;
        const boxX = startX - padX;
        const boxY = word.y - 12 - padY;
        const boxW = totalWidth + padX * 2;
        const boxH = 24 + padY;

        // Angular DOS corner brackets
        const cLen = 6;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + cLen);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + cLen, boxY);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(boxX + boxW - cLen, boxY);
        ctx.lineTo(boxX + boxW, boxY);
        ctx.lineTo(boxX + boxW, boxY + cLen);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + boxH - cLen);
        ctx.lineTo(boxX, boxY + boxH);
        ctx.lineTo(boxX + cLen, boxY + boxH);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(boxX + boxW - cLen, boxY + boxH);
        ctx.lineTo(boxX + boxW, boxY + boxH);
        ctx.lineTo(boxX + boxW, boxY + boxH - cLen);
        ctx.stroke();

        // Lock tag centered clearly ABOVE the reticle box
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = word.isBonus ? "#ff2244" : "#00ff66";
        ctx.fillText("[LOCKED]", word.x, boxY - 5);

        ctx.restore();
      }

      // 2. Draw bonus aura & bonus label if Crimson Bonus target
      if (word.isBonus) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 34, 68, 0.12)";
        ctx.fillRect(startX - 6, word.y - 12, totalWidth + 12, 24);

        // Place 3.5X BONUS centered BELOW the word/box so it never collides with [LOCKED] above
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff3355";
        ctx.shadowColor = "#ff2244";
        ctx.shadowBlur = 6;
        const bonusY = isLocked ? (word.y + 24) : (word.y + 20);
        ctx.fillText("★ 3.5X BONUS ★", word.x, bonusY);

        ctx.restore();
      }

      // 3. Render Characters: Typed vs Untyped with ballistic fade effect
      for (let i = 0; i < word.text.length; i++) {
        const char = word.text.charAt(i);
        const charX = startX + i * charWidth + charWidth / 2;
        const isTyped = (i < word.typedIndex);
        const isCurrentActive = (i === word.typedIndex);

        ctx.save();

        if (isTyped) {
          // Typed characters immediately fade to ~35-40% opacity
          ctx.globalAlpha = 0.38;
          ctx.fillStyle = word.isBonus ? "#ff5577" : "#00ff66";
          ctx.fillText(char, charX, word.y);
        } else {
          // Untyped characters stay crisp and bright
          ctx.globalAlpha = 1.0;
          if (word.isBonus) {
            ctx.fillStyle = "#ff3355";
            ctx.shadowColor = "#ff2244";
            ctx.shadowBlur = 8;
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "#00ff66";
            ctx.shadowBlur = 6;
          }

          ctx.fillText(char, charX, word.y);

          // Glowing cursor/underline beneath active character
          if (isCurrentActive && isLocked) {
            ctx.fillStyle = word.isBonus ? "#ff2244" : "#00ff66";
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.fillRect(charX - 5, word.y + 10, 10, 2);
          }
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.type === "text") {
        ctx.font = "bold 14px 'Share Tech Mono', monospace";
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.glow || p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// Global export
window.TypeTankGame = TypeTankGame;
