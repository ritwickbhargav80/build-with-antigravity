/**
 * TYPE//TANK - Application Controller & State Machine
 * Coordinates screen routing, aspect ratio recalibration, keyboard events,
 * debriefing, record celebration, and flight logs.
 */

(function () {
  // DOM Elements
  const appContainer = document.getElementById("arcade-cabinet");
  const marqueeCallsign = document.getElementById("header-callsign");
  const btnSwitchCallsign = document.getElementById("btn-switch-callsign");
  const btnToggleCrt = document.getElementById("btn-toggle-crt");
  const btnToggleAudio = document.getElementById("btn-toggle-audio");
  const btnToggleAspect = document.getElementById("btn-toggle-aspect");

  // Screens
  const screens = {
    login: document.getElementById("screen-login"),
    settings: document.getElementById("screen-settings"),
    instructions: document.getElementById("screen-instructions"),
    game: document.getElementById("screen-game"),
    result: document.getElementById("screen-result"),
    records: document.getElementById("screen-records")
  };

  // Login Screen elements
  const loginInput = document.getElementById("callsign-input");
  const btnLoginSubmit = document.getElementById("btn-login-submit");

  // Settings Screen elements
  const modeCards = document.querySelectorAll(".mode-card");
  const chkUpper = document.getElementById("chk-upper");
  const chkNumbers = document.getElementById("chk-numbers");
  const chkSpecials = document.getElementById("chk-specials");
  const aspectButtons = document.querySelectorAll(".aspect-btn");
  const sampleWordsMarquee = document.getElementById("sample-words-stream");
  const btnProceedBriefing = document.getElementById("btn-proceed-briefing");

  // Instructions elements
  const btnEngageSortie = document.getElementById("btn-engage-sortie");
  const btnBackSettings = document.getElementById("btn-back-settings");

  // Game Screen elements
  const gameCanvas = document.getElementById("game-canvas");
  const hudOperator = document.getElementById("hud-operator");
  const hudMode = document.getElementById("hud-mode");
  const hudScore = document.getElementById("hud-score");
  const hudCombo = document.getElementById("hud-combo");
  const hudWpm = document.getElementById("hud-wpm");
  const hudAccuracy = document.getElementById("hud-accuracy");
  const hudIntegrityBar = document.getElementById("hud-integrity-bar");
  const hudIntegrityText = document.getElementById("hud-integrity-text");
  const btnAbortCombat = document.getElementById("btn-abort-combat");

  // Result Screen elements
  const debriefBanner = document.getElementById("debrief-record-banner");
  const debriefTitle = document.getElementById("debrief-title");
  const resScore = document.getElementById("res-score");
  const resWpm = document.getElementById("res-wpm");
  const resAccuracy = document.getElementById("res-accuracy");
  const resWords = document.getElementById("res-words");
  const resCombo = document.getElementById("res-combo");
  const resMode = document.getElementById("res-mode");
  const resPbComparison = document.getElementById("res-pb-comparison");
  const btnPlayAgain = document.getElementById("btn-play-again");
  const btnViewRecords = document.getElementById("btn-view-records");
  const btnResultSettings = document.getElementById("btn-result-settings");
  const celebrationCanvas = document.getElementById("celebration-canvas");

  // Records Screen elements
  const recLifetimeBest = document.getElementById("rec-lifetime-best");
  const recLifetimeWpm = document.getElementById("rec-lifetime-wpm");
  const recLifetimeAcc = document.getElementById("rec-lifetime-acc");
  const recLifetimeWords = document.getElementById("rec-lifetime-words");
  const quadScore1 = document.getElementById("quad-score-1");
  const quadWpm1 = document.getElementById("quad-wpm-1");
  const quadScore2 = document.getElementById("quad-score-2");
  const quadWpm2 = document.getElementById("quad-wpm-2");
  const quadScore3 = document.getElementById("quad-score-3");
  const quadWpm3 = document.getElementById("quad-wpm-3");
  const quadScore4 = document.getElementById("quad-score-4");
  const quadWpm4 = document.getElementById("quad-wpm-4");
  const filterChips = document.querySelectorAll(".filter-chip");
  const logsTableBody = document.getElementById("logs-table-body");
  const btnPurgeLogs = document.getElementById("btn-purge-logs");
  const btnRecordsBack = document.getElementById("btn-records-back");

  // App State
  let currentScreen = "login";
  let activeFilterMode = "ALL";
  let gameInstance = null;
  let confettiAnimationId = null;

  // Initialize Audio & Storage
  const storage = window.storageEngine;
  const audio = window.soundEngine;

  // 1. Initial State Load
  function initApp() {
    // Callsign
    const savedCallsign = storage.getCallsign();
    marqueeCallsign.textContent = savedCallsign;
    loginInput.value = savedCallsign;

    // Aspect Ratio
    const savedAspect = storage.getAspectRatio();
    applyAspectRatio(savedAspect);

    // CRT Scanlines
    const crtEnabled = storage.isCrtEnabled();
    applyCrtState(crtEnabled);

    // Audio Mute State
    updateAudioButton();

    // Mode
    const savedMode = storage.getMode();
    applyModeSelection(savedMode);

    // Instantiate Canvas Game Engine
    gameInstance = new TypeTankGame(gameCanvas, {
      onSortieEnd: handleSortieEnd,
      onStatsUpdate: handleStatsUpdate
    });

    // Wire Event Listeners
    setupEventListeners();

    // Navigate to Login or Settings
    showScreen("login");
  }

  // 2. Aspect Ratio Controller
  function applyAspectRatio(ratio) {
    storage.setAspectRatio(ratio);
    appContainer.classList.remove("aspect-auto", "aspect-16-9", "aspect-4-3");

    if (ratio === "16:9") {
      appContainer.classList.add("aspect-16-9");
      btnToggleAspect.textContent = "ASPECT: 16:9";
    } else if (ratio === "4:3") {
      appContainer.classList.add("aspect-4-3");
      btnToggleAspect.textContent = "ASPECT: 4:3";
    } else {
      appContainer.classList.add("aspect-auto");
      btnToggleAspect.textContent = "ASPECT: AUTO";
    }

    // Update buttons on Settings screen
    aspectButtons.forEach(btn => {
      if (btn.dataset.aspect === ratio) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Recalibrate canvas
    if (gameInstance) {
      setTimeout(() => gameInstance.resize(), 50);
    }
  }

  function cycleAspectRatio() {
    const current = storage.getAspectRatio();
    const cycle = { "auto": "16:9", "16:9": "4:3", "4:3": "auto" };
    applyAspectRatio(cycle[current] || "auto");
    audio.playClick();
  }

  // 3. CRT Controller
  function applyCrtState(enabled) {
    storage.setCrtEnabled(enabled);
    if (enabled) {
      document.body.classList.add("crt-active");
      btnToggleCrt.textContent = "CRT: ON";
      btnToggleCrt.classList.add("active");
    } else {
      document.body.classList.remove("crt-active");
      btnToggleCrt.textContent = "CRT: OFF";
      btnToggleCrt.classList.remove("active");
    }
  }

  function toggleCrt() {
    const newState = !storage.isCrtEnabled();
    applyCrtState(newState);
    audio.playClick();
  }

  // 4. Audio Controller
  function updateAudioButton() {
    if (audio.isMuted) {
      btnToggleAudio.textContent = "AUDIO: OFF";
      btnToggleAudio.classList.remove("active");
    } else {
      btnToggleAudio.textContent = "AUDIO: ON";
      btnToggleAudio.classList.add("active");
    }
  }

  function toggleAudio() {
    audio.toggleMute();
    updateAudioButton();
    if (!audio.isMuted) {
      audio.playLaserShot();
    }
  }

  // 5. Screen Navigation
  function showScreen(screenKey) {
    if (!screens[screenKey]) return;

    // Stop confetti if leaving result screen
    if (currentScreen === "result" && screenKey !== "result") {
      stopConfetti();
    }

    // Stop game if leaving game screen
    if (currentScreen === "game" && screenKey !== "game" && gameInstance.isRunning) {
      gameInstance.stop();
    }

    currentScreen = screenKey;

    Object.keys(screens).forEach(key => {
      if (key === screenKey) {
        screens[key].classList.add("active");
        screens[key].classList.remove("hidden");
      } else {
        screens[key].classList.remove("active");
        screens[key].classList.add("hidden");
      }
    });

    // Screen specific setup
    if (screenKey === "login") {
      loginInput.focus();
      loginInput.select();
    } else if (screenKey === "settings") {
      updateSampleWordsMarquee();
    } else if (screenKey === "game") {
      const mode = storage.getMode();
      const callsign = storage.getCallsign();
      hudOperator.textContent = callsign;
      hudMode.textContent = `MODE ${mode}`;
      gameInstance.start(mode, callsign);
    } else if (screenKey === "records") {
      renderRecordsScreen();
    }
  }

  // 6. Mode Selection & Character Matrix Sync
  function applyModeSelection(modeNum) {
    const mode = Math.max(1, Math.min(4, parseInt(modeNum, 10) || 1));
    storage.setMode(mode);

    // Update Mode Cards UI
    modeCards.forEach(card => {
      if (parseInt(card.dataset.mode, 10) === mode) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });

    // Bi-directionally sync granular character matrix toggles
    // Mode 1: Lower only
    // Mode 2: Lower + Upper
    // Mode 3: Lower + Upper + Numbers
    // Mode 4: Lower + Upper + Numbers + Specials
    chkUpper.checked = (mode >= 2);
    chkNumbers.checked = (mode >= 3);
    chkSpecials.checked = (mode >= 4);

    updateSampleWordsMarquee();
  }

  function handleMatrixToggleChange() {
    // Calculate mode from granular toggles
    let computedMode = 1;
    if (chkSpecials.checked) {
      computedMode = 4;
      chkUpper.checked = true;
      chkNumbers.checked = true;
    } else if (chkNumbers.checked) {
      computedMode = 3;
      chkUpper.checked = true;
    } else if (chkUpper.checked) {
      computedMode = 2;
    } else {
      computedMode = 1;
    }

    applyModeSelection(computedMode);
    audio.playClick();
  }

  function updateSampleWordsMarquee() {
    const mode = storage.getMode();
    let samples = [];
    if (mode === 1) samples = window.WORDS_MODE_1.slice(0, 10);
    else if (mode === 2) samples = window.WORDS_MODE_2.slice(0, 10);
    else if (mode === 3) samples = window.WORDS_MODE_3.slice(0, 10);
    else if (mode === 4) samples = window.WORDS_MODE_4.slice(0, 10);

    sampleWordsMarquee.textContent = samples.join("   •   ");
  }

  // 7. Sortie Debrief & Record Celebration
  function handleStatsUpdate(stats) {
    hudScore.textContent = stats.score.toString().padStart(6, "0");
    hudCombo.textContent = `x${stats.combo.toFixed(1)}`;
    hudWpm.textContent = stats.wpm;
    hudAccuracy.textContent = `${stats.accuracy.toFixed(0)}%`;

    // Hull Integrity Bar
    hudIntegrityBar.style.width = `${stats.hull}%`;
    hudIntegrityText.textContent = `${stats.hull}%`;

    hudIntegrityBar.classList.remove("bar-green", "bar-amber", "bar-red");
    if (stats.hull > 50) {
      hudIntegrityBar.classList.add("bar-green");
    } else if (stats.hull > 25) {
      hudIntegrityBar.classList.add("bar-amber");
    } else {
      hudIntegrityBar.classList.add("bar-red");
    }
  }

  function handleSortieEnd(sortieData) {
    const outcome = storage.recordSortie(sortieData);

    // Populate Debrief Screen
    debriefTitle.textContent = sortieData.wasAborted
      ? "+---[ SORTIE ABORTED - TACTICAL WITHDRAWAL ]---+"
      : "+---[ SORTIE DEBRIEFING - PERIMETER BREACH ]---+";

    resScore.textContent = sortieData.score.toString().padStart(6, "0");
    resWpm.textContent = sortieData.wpm;
    resAccuracy.textContent = `${sortieData.accuracy.toFixed(1)}%`;
    resWords.textContent = sortieData.wordsDestroyed;
    resCombo.textContent = sortieData.maxCombo;
    resMode.textContent = `MODE ${sortieData.mode}`;

    if (outcome.isNewRecord) {
      // NEW RECORD CELEBRATION!
      debriefBanner.classList.remove("hidden");
      resPbComparison.innerHTML = `
        <span class="highlight-green">★ NEW ALL-TIME RECORD FOR MODE ${sortieData.mode}! ★</span><br>
        PREVIOUS BEST: ${outcome.prevBestScore} PTS (BEATEN BY +${outcome.scoreDelta} PTS)
      `;
      audio.playFanfare();
      startConfetti();
    } else {
      debriefBanner.classList.add("hidden");
      resPbComparison.innerHTML = `
        PERSONAL BEST: <span class="highlight-white">${outcome.prevBestScore} PTS</span> (${outcome.prevBestWpm} WPM)<br>
        DELTA: <span class="highlight-amber">${Math.abs(outcome.scoreDelta)} PTS NEEDED TO SURPASS RECORD</span>
      `;
    }

    showScreen("result");
  }

  // 8. Confetti Celebration Effect
  function startConfetti() {
    celebrationCanvas.classList.remove("hidden");
    const rect = celebrationCanvas.parentElement.getBoundingClientRect();
    celebrationCanvas.width = rect.width;
    celebrationCanvas.height = rect.height;
    const ctx = celebrationCanvas.getContext("2d");

    const confettiPieces = [];
    const colors = ["#00ff66", "#33ff77", "#ff2244", "#ffb000", "#ffffff", "#00e5ff"];

    for (let i = 0; i < 90; i++) {
      confettiPieces.push({
        x: Math.random() * celebrationCanvas.width,
        y: Math.random() * -celebrationCanvas.height,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 5,
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 8
      });
    }

    function renderConfetti() {
      ctx.clearRect(0, 0, celebrationCanvas.width, celebrationCanvas.height);

      confettiPieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rSpeed;

        if (p.y > celebrationCanvas.height) {
          p.y = -10;
          p.x = Math.random() * celebrationCanvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      confettiAnimationId = requestAnimationFrame(renderConfetti);
    }

    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    renderConfetti();
  }

  function stopConfetti() {
    if (confettiAnimationId) {
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
    celebrationCanvas.classList.add("hidden");
    const ctx = celebrationCanvas.getContext("2d");
    ctx.clearRect(0, 0, celebrationCanvas.width, celebrationCanvas.height);
  }

  // 9. Records / Flight Log Screen
  function renderRecordsScreen() {
    const callsign = storage.getCallsign();
    const stats = storage.getLifetimeStats(callsign);
    const quad = storage.getModeBestsQuad(callsign);

    // Lifetime overview
    recLifetimeBest.textContent = stats.bestScore.toString().padStart(6, "0");
    recLifetimeWpm.textContent = stats.maxWpm;
    recLifetimeAcc.textContent = `${stats.peakAccuracy}%`;
    recLifetimeWords.textContent = stats.totalWords;

    // Mode Quad
    quadScore1.textContent = quad[1].score;
    quadWpm1.textContent = `${quad[1].wpm} WPM`;
    quadScore2.textContent = quad[2].score;
    quadWpm2.textContent = `${quad[2].wpm} WPM`;
    quadScore3.textContent = quad[3].score;
    quadWpm3.textContent = `${quad[3].wpm} WPM`;
    quadScore4.textContent = quad[4].score;
    quadWpm4.textContent = `${quad[4].wpm} WPM`;

    renderLogsTable();
  }

  function renderLogsTable() {
    const logs = storage.getFlightLogs();
    logsTableBody.innerHTML = "";

    const filtered = logs.filter(l => {
      if (activeFilterMode === "ALL") return true;
      return l.mode === parseInt(activeFilterMode, 10);
    });

    if (filtered.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="6" class="text-center empty-log">[ NO FLIGHT LOG RECORDS RECORDED ]</td>`;
      logsTableBody.appendChild(row);
      return;
    }

    filtered.forEach(log => {
      const row = document.createElement("tr");
      const pbBadge = log.isPersonalBest ? `<span class="badge-pb">★ PB</span>` : "";
      row.innerHTML = `
        <td>${log.dateStr}</td>
        <td><span class="mode-badge">M-${log.mode}</span></td>
        <td class="log-score">${log.score.toString().padStart(6, "0")} ${pbBadge}</td>
        <td>${log.wpm}</td>
        <td>${log.accuracy}%</td>
        <td>${log.maxCombo}</td>
      `;
      logsTableBody.appendChild(row);
    });
  }

  // 10. Event Listeners Setup
  function setupEventListeners() {
    // Header controls
    btnToggleAspect.addEventListener("click", cycleAspectRatio);
    btnToggleCrt.addEventListener("click", toggleCrt);
    btnToggleAudio.addEventListener("click", toggleAudio);

    btnSwitchCallsign.addEventListener("click", () => {
      audio.playClick();
      showScreen("login");
    });

    // Login Screen
    btnLoginSubmit.addEventListener("click", () => {
      confirmCallsign();
    });

    loginInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        confirmCallsign();
      }
    });

    function confirmCallsign() {
      const call = storage.setCallsign(loginInput.value);
      marqueeCallsign.textContent = call;
      audio.playClick();
      showScreen("settings");
    }

    // Settings Mode Cards
    modeCards.forEach(card => {
      card.addEventListener("click", () => {
        const mode = parseInt(card.dataset.mode, 10);
        applyModeSelection(mode);
        audio.playClick();
      });
    });

    // Character Matrix toggles
    chkUpper.addEventListener("change", handleMatrixToggleChange);
    chkNumbers.addEventListener("change", handleMatrixToggleChange);
    chkSpecials.addEventListener("change", handleMatrixToggleChange);

    // Aspect buttons in Settings
    aspectButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        applyAspectRatio(btn.dataset.aspect);
        audio.playClick();
      });
    });

    // Briefing Proceed
    btnProceedBriefing.addEventListener("click", () => {
      audio.playClick();
      showScreen("instructions");
    });

    // Instructions
    btnEngageSortie.addEventListener("click", () => {
      audio.playClick();
      showScreen("game");
    });

    btnBackSettings.addEventListener("click", () => {
      audio.playClick();
      showScreen("settings");
    });

    // Game Abort button
    btnAbortCombat.addEventListener("click", () => {
      audio.playClick();
      if (gameInstance && gameInstance.isRunning) {
        gameInstance.abortSortie();
      }
    });

    // Result Screen
    btnPlayAgain.addEventListener("click", () => {
      audio.playClick();
      showScreen("game");
    });

    btnViewRecords.addEventListener("click", () => {
      audio.playClick();
      showScreen("records");
    });

    btnResultSettings.addEventListener("click", () => {
      audio.playClick();
      showScreen("settings");
    });

    // Records Screen
    btnRecordsBack.addEventListener("click", () => {
      audio.playClick();
      showScreen("settings");
    });

    filterChips.forEach(chip => {
      chip.addEventListener("click", () => {
        filterChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeFilterMode = chip.dataset.filter;
        audio.playClick();
        renderLogsTable();
      });
    });

    btnPurgeLogs.addEventListener("click", () => {
      if (confirm("[!] CAUTION: PURGE ALL LOCAL FLIGHT LOG ARCHIVES?")) {
        storage.purgeLogs();
        audio.playDamage();
        renderRecordsScreen();
      }
    });

    // Global Keyboard Navigation
    window.addEventListener("keydown", (e) => {
      // Audio trigger on first interaction
      if (!audio.hasInitialized) {
        audio.init();
      }

      // If active in Game screen, let TypeTankGame handle keys
      if (currentScreen === "game" && gameInstance.isRunning) {
        if (e.key === "Escape") {
          e.preventDefault();
          gameInstance.abortSortie();
        }
        return;
      }

      // Navigation shortcuts outside of game
      if (currentScreen === "instructions") {
        if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          audio.playClick();
          showScreen("game");
        } else if (e.key === "Escape") {
          e.preventDefault();
          audio.playClick();
          showScreen("settings");
        }
      } else if (currentScreen === "settings") {
        if (e.key === "Enter" || e.code === "Space") {
          if (document.activeElement.tagName !== "BUTTON" && document.activeElement.tagName !== "INPUT") {
            e.preventDefault();
            audio.playClick();
            showScreen("instructions");
          }
        }
      } else if (currentScreen === "result") {
        if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          audio.playClick();
          showScreen("game");
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          audio.playClick();
          showScreen("records");
        } else if (e.key === "Escape" || e.key === "s" || e.key === "S") {
          e.preventDefault();
          audio.playClick();
          showScreen("settings");
        }
      } else if (currentScreen === "records") {
        if (e.key === "Escape" || e.key === "Enter") {
          e.preventDefault();
          audio.playClick();
          showScreen("settings");
        }
      }
    });
  }

  // Launch on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
