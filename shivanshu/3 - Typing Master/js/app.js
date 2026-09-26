/**
 * TYPE//TANK - Application State Machine & Controller
 * Global: window.App
 */

(function () {
  'use strict';

  // State Machine Screens
  const SCREENS = {
    LOGIN: 'screen-login',
    SETTINGS: 'screen-settings',
    BRIEFING: 'screen-briefing',
    GAME: 'screen-game',
    DEBRIEF: 'screen-debrief',
    RECORDS: 'screen-records'
  };

  let currentScreen = SCREENS.LOGIN;
  let previousScreen = SCREENS.SETTINGS;
  let activeFilter = 'all';

  // Cached DOM Elements
  const DOM = {};

  function queryElements() {
    DOM.cabinet = document.getElementById('cabinet');
    DOM.crtOverlay = document.getElementById('crt-overlay');
    DOM.marqueeCallsign = document.getElementById('marquee-callsign');
    DOM.btnToggleCrt = document.getElementById('btn-toggle-crt');
    DOM.btnToggleSfx = document.getElementById('btn-toggle-sfx');
    DOM.btnToggleAspect = document.getElementById('btn-toggle-aspect');
    DOM.btnSwitchCallsign = document.getElementById('btn-switch-callsign');

    // Login Elements
    DOM.inputCallsign = document.getElementById('input-callsign');
    DOM.btnLoginSubmit = document.getElementById('btn-login-submit');
    DOM.loginError = document.getElementById('login-error');

    // Settings Elements
    DOM.modeCards = document.querySelectorAll('.mode-card');
    DOM.toggleUppercase = document.getElementById('toggle-uppercase');
    DOM.toggleNumbers = document.getElementById('toggle-numbers');
    DOM.toggleSpecials = document.getElementById('toggle-specials');
    DOM.aspectChips = document.querySelectorAll('.chip-aspect');
    DOM.previewBar = document.getElementById('arsenal-preview-bar');
    DOM.btnSettingsProceed = document.getElementById('btn-settings-proceed');
    DOM.btnSettingsRecords = document.getElementById('btn-settings-records');

    // Briefing Elements
    DOM.btnEngageCombat = document.getElementById('btn-engage-combat');

    // Game Elements
    DOM.gameCanvas = document.getElementById('game-canvas');
    DOM.confettiCanvas = document.getElementById('confetti-canvas');
    DOM.btnPauseResume = document.getElementById('btn-pause-resume');
    DOM.btnPauseMute = document.getElementById('btn-pause-mute');
    DOM.btnPauseAbort = document.getElementById('btn-pause-abort');

    // Debrief Elements
    DOM.debriefStatus = document.getElementById('debrief-status');
    DOM.debriefPbBanner = document.getElementById('debrief-pb-banner');
    DOM.debriefPbDelta = document.getElementById('debrief-pb-delta');
    DOM.metricScore = document.getElementById('metric-score');
    DOM.metricWpm = document.getElementById('metric-wpm');
    DOM.metricAccuracy = document.getElementById('metric-accuracy');
    DOM.metricWords = document.getElementById('metric-words');
    DOM.metricCombo = document.getElementById('metric-combo');
    DOM.metricMode = document.getElementById('metric-mode');
    DOM.btnDebriefReengage = document.getElementById('btn-debrief-reengage');
    DOM.btnDebriefRecords = document.getElementById('btn-debrief-records');
    DOM.btnDebriefSettings = document.getElementById('btn-debrief-settings');

    // Records Elements
    DOM.statPeakScore = document.getElementById('stat-peak-score');
    DOM.statMaxWpm = document.getElementById('stat-max-wpm');
    DOM.statPeakAcc = document.getElementById('stat-peak-acc');
    DOM.statTotalKills = document.getElementById('stat-total-kills');
    DOM.statTotalSorties = document.getElementById('stat-total-sorties');
    DOM.filterChips = document.querySelectorAll('.filter-chip');
    DOM.flightLogTbody = document.getElementById('flight-log-tbody');
    DOM.btnRecordsBack = document.getElementById('btn-records-back');
    DOM.btnRecordsPurge = document.getElementById('btn-records-purge');
    DOM.btnRecordsEngage = document.getElementById('btn-records-engage');

    // Purge Modal
    DOM.purgeModal = document.getElementById('purge-modal');
    DOM.purgeTargetCallsign = document.getElementById('purge-target-callsign');
    DOM.inputPurgeConfirm = document.getElementById('input-purge-confirm');
    DOM.btnCancelPurge = document.getElementById('btn-cancel-purge');
    DOM.btnConfirmPurge = document.getElementById('btn-confirm-purge');
  }

  // --- Aspect Ratio Controller ---
  function updateCabinetAspect() {
    const settings = window.Store.getSettings();
    const aspect = settings.aspect || 'auto';
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let targetW = winW;
    let targetH = winH;

    if (aspect === '16:9') {
      const ratio = 16 / 9;
      if (winW / winH > ratio) {
        targetH = winH;
        targetW = winH * ratio;
      } else {
        targetW = winW;
        targetH = winW / ratio;
      }
    } else if (aspect === '4:3') {
      const ratio = 4 / 3;
      if (winW / winH > ratio) {
        targetH = winH;
        targetW = winH * ratio;
      } else {
        targetW = winW;
        targetH = winW / ratio;
      }
    }

    const cabW = Math.floor(targetW);
    const cabH = Math.floor(targetH);

    document.documentElement.style.setProperty('--cab-w', `${cabW}px`);
    document.documentElement.style.setProperty('--cab-h', `${cabH}px`);

    if (window.Game && window.Game.resize) {
      window.Game.resize();
    }
  }

  // --- Screen State Transitions (150ms CRT Flicker / Fade) ---
  function switchScreen(nextScreenId) {
    if (currentScreen === nextScreenId) return;

    previousScreen = currentScreen;
    const prevEl = document.getElementById(currentScreen);
    const nextEl = document.getElementById(nextScreenId);

    if (prevEl) {
      prevEl.classList.remove('active');
    }

    if (nextEl) {
      nextEl.classList.add('active');
      nextEl.classList.add('screen-transitioning');
      setTimeout(() => {
        nextEl.classList.remove('screen-transitioning');
      }, 150);
    }

    currentScreen = nextScreenId;

    // Header buttons availability: disabled during combat
    const inCombat = (currentScreen === SCREENS.GAME);
    const headerBtns = [
      DOM.btnToggleCrt,
      DOM.btnToggleSfx,
      DOM.btnToggleAspect,
      DOM.btnSwitchCallsign
    ];
    headerBtns.forEach(btn => {
      if (btn) {
        btn.disabled = inCombat;
        btn.tabIndex = inCombat ? -1 : 0;
      }
    });

    // Screen-specific setup
    if (nextScreenId === SCREENS.SETTINGS) {
      refreshSettingsUI();
    } else if (nextScreenId === SCREENS.RECORDS) {
      renderRecordsScreen();
    } else if (nextScreenId === SCREENS.LOGIN) {
      if (DOM.inputCallsign) {
        DOM.inputCallsign.value = window.Store.getCurrentCallsign() || '';
        DOM.inputCallsign.focus();
      }
    }
  }

  // --- Header Marquee Controller ---
  function updateHeaderMarquee() {
    const callsign = window.Store.getCurrentCallsign();
    if (DOM.marqueeCallsign) {
      DOM.marqueeCallsign.textContent = callsign || 'UNASSIGNED';
    }

    const settings = window.Store.getSettings();

    // CRT Toggle Button
    if (DOM.btnToggleCrt) {
      DOM.btnToggleCrt.textContent = settings.crt ? '[CRT:ON]' : '[CRT:OFF]';
    }
    if (DOM.crtOverlay) {
      DOM.crtOverlay.className = settings.crt ? 'crt-active' : '';
    }

    // SFX Toggle Button
    if (DOM.btnToggleSfx) {
      DOM.btnToggleSfx.textContent = settings.sfx ? '[SFX:ON]' : '[SFX:OFF]';
    }
    if (window.Sfx) {
      window.Sfx.setMuted(!settings.sfx);
    }

    // Aspect Toggle Button
    if (DOM.btnToggleAspect) {
      const labels = {
        'auto': '[ASPECT:AUTO]',
        '16:9': '[ASPECT:16:9]',
        '4:3': '[ASPECT:4:3]'
      };
      DOM.btnToggleAspect.textContent = labels[settings.aspect] || '[ASPECT:AUTO]';
    }

    updateCabinetAspect();
  }

  // --- 1. Login Screen Handling ---
  function handleLoginSubmit() {
    const rawVal = DOM.inputCallsign.value.trim().toUpperCase();
    DOM.inputCallsign.value = rawVal;

    // Validation: 3-12 characters, A-Z, 0-9, _, -
    const regex = /^[A-Z0-9_-]{3,12}$/;
    if (!regex.test(rawVal)) {
      DOM.loginError.textContent = 'ERR: INVALID CALLSIGN. USE 3-12 CHARACTERS (A-Z, 0-9, _, -)';
      window.Sfx.miss();
      return;
    }

    DOM.loginError.textContent = '';
    window.Store.setCurrentCallsign(rawVal);
    window.Sfx.uiClick();
    updateHeaderMarquee();
    switchScreen(SCREENS.SETTINGS);
  }

  // --- 2. Settings Screen (Arsenal & Display) ---
  function refreshSettingsUI() {
    const settings = window.Store.getSettings();
    const mode = settings.mode || 1;

    // Highlight selected mode card
    DOM.modeCards.forEach(card => {
      const cardMode = Number(card.dataset.mode);
      const isSelected = (cardMode === mode);
      card.classList.toggle('selected', isSelected);
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });

    // Synchronize cumulative character matrix toggles
    // Mode 1: all off
    // Mode 2: uppercase on
    // Mode 3: uppercase + numbers on
    // Mode 4: uppercase + numbers + specials on
    if (DOM.toggleUppercase) {
      const active = mode >= 2;
      DOM.toggleUppercase.classList.toggle('active', active);
      DOM.toggleUppercase.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (DOM.toggleNumbers) {
      const active = mode >= 3;
      DOM.toggleNumbers.classList.toggle('active', active);
      DOM.toggleNumbers.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (DOM.toggleSpecials) {
      const active = mode >= 4;
      DOM.toggleSpecials.classList.toggle('active', active);
      DOM.toggleSpecials.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    // Aspect buttons sync
    DOM.aspectChips.forEach(chip => {
      const chipAspect = chip.dataset.aspect;
      const isSelected = (chipAspect === settings.aspect);
      chip.classList.toggle('active', isSelected);
      chip.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });

    // Refresh Live Words Preview Bar (6 sample words)
    if (DOM.previewBar && window.Words) {
      const samples = window.Words.getPreviewWords(mode, 6);
      DOM.previewBar.innerHTML = '';
      samples.forEach(w => {
        const span = document.createElement('span');
        span.className = 'preview-chip';
        span.textContent = w;
        DOM.previewBar.appendChild(span);
      });
    }
  }

  function setArsenalMode(targetMode) {
    const validMode = Math.max(1, Math.min(4, targetMode));
    window.Store.updateSettings({ mode: validMode });
    window.Sfx.uiClick();
    refreshSettingsUI();
  }

  // --- 4. Game Orchestration ---
  function startCombatSortie(skipBriefing = false) {
    if (skipBriefing) {
      switchScreen(SCREENS.GAME);
      const settings = window.Store.getSettings();
      const callsign = window.Store.getCurrentCallsign();
      window.Game.startSortie(settings.mode, callsign);
    } else {
      switchScreen(SCREENS.BRIEFING);
    }
  }

  function onSortieConcluded(runStats) {
    // Save to storage
    const outcome = window.Store.saveRun(runStats);
    renderDebriefScreen(runStats, outcome);
    switchScreen(SCREENS.DEBRIEF);
  }

  // --- 5. Debrief Screen Presentation ---
  function renderDebriefScreen(runStats, outcome) {
    const isAborted = runStats.aborted;
    const modeNames = { 1: 'MODE 1 ALPHA', 2: 'MODE 2 BRAVO', 3: 'MODE 3 CHARLIE', 4: 'MODE 4 DELTA' };

    DOM.debriefStatus.textContent = isAborted
      ? 'SORTIE TERMINATED — MISSION ABORTED'
      : 'SORTIE COMPLETE — DEFENSE PERIMETER HULL DESTROYED';

    DOM.metricScore.textContent = String(runStats.score).padStart(6, '0');
    DOM.metricWpm.textContent = String(runStats.wpm);
    DOM.metricAccuracy.textContent = `${runStats.acc.toFixed(1)}%`;
    DOM.metricWords.textContent = String(runStats.words);
    DOM.metricCombo.textContent = `×${(1 + Math.floor(runStats.maxCombo / 5) * 0.5).toFixed(1)} (${runStats.maxCombo})`;
    DOM.metricMode.textContent = modeNames[runStats.mode] || 'MODE 1 ALPHA';

    // Personal Best Banner & Delta
    if (outcome.isNewPB) {
      DOM.debriefPbBanner.classList.remove('hidden');
      DOM.debriefPbDelta.textContent = outcome.previousBest.score > 0
        ? `PREVIOUS BEST: ${outcome.previousBest.score} PTS | BEATEN BY +${outcome.deltaScore} PTS`
        : 'INITIAL FLIGHT LOG BENCHMARK RECORDED';

      window.Sfx.fanfare();
      window.Game.startConfetti();
    } else {
      DOM.debriefPbBanner.classList.add('hidden');
      if (outcome.previousBest && outcome.previousBest.score > 0) {
        const deficit = outcome.previousBest.score - runStats.score;
        DOM.debriefPbDelta.textContent = `PERSONAL BEST: ${outcome.previousBest.score} PTS (${deficit} PTS TO BEAT) | WPM Δ ${outcome.deltaWpm >= 0 ? '+' : ''}${outcome.deltaWpm}`;
      } else {
        DOM.debriefPbDelta.textContent = '';
      }
      window.Game.stopConfetti();
    }
  }

  // --- 6. Records / Flight Log Presentation ---
  function renderRecordsScreen() {
    const callsign = window.Store.getCurrentCallsign() || 'OPERATOR';
    const profile = window.Store.getProfile(callsign) || { history: [], bests: {} };
    const lifetime = window.Store.getLifetimeStats(callsign);

    // Lifetime Overview Bar
    DOM.statPeakScore.textContent = String(lifetime.peakScore);
    DOM.statMaxWpm.textContent = String(lifetime.maxWpm);
    DOM.statPeakAcc.textContent = `${lifetime.peakAcc.toFixed(1)}%`;
    DOM.statTotalKills.textContent = String(lifetime.totalWords);
    DOM.statTotalSorties.textContent = String(lifetime.totalSorties);

    // Mode Bests Quad
    for (let m = 1; m <= 4; m++) {
      const best = profile.bests[String(m)];
      const elScore = document.getElementById(`best-score-${m}`);
      const elWpm = document.getElementById(`best-wpm-${m}`);

      if (best && best.score > 0) {
        if (elScore) elScore.textContent = `${best.score} PTS`;
        if (elWpm) elWpm.textContent = `PEAK WPM: ${best.wpm}`;
      } else {
        if (elScore) elScore.textContent = '— NO DATA —';
        if (elWpm) elWpm.textContent = '';
      }
    }

    // Filter Chips
    DOM.filterChips.forEach(chip => {
      const filter = chip.dataset.filter;
      const isSel = (filter === activeFilter);
      chip.classList.toggle('active', isSel);
      chip.setAttribute('aria-checked', isSel ? 'true' : 'false');
    });

    // Populate Table
    const tbody = DOM.flightLogTbody;
    tbody.innerHTML = '';

    const history = profile.history || [];
    const filtered = history.filter(run => {
      if (activeFilter === 'all') return true;
      return String(run.mode) === String(activeFilter);
    });

    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="7" style="text-align:center; color:var(--phosphor-dim); padding:16px;">— NO MISSION LOGS RECORDED FOR PROTOCOL —</td>`;
      tbody.appendChild(tr);
      return;
    }

    filtered.forEach(run => {
      const tr = document.createElement('tr');
      const dateStr = formatTimestamp(run.ts);
      const modeStr = `M${run.mode}`;
      const pbMark = run.pb ? ' <span class="pb-flag">★ PB</span>' : '';
      const statusStr = run.aborted ? '<span style="color:var(--amber);">ABORTED</span>' : 'COMPLETE';

      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${modeStr}</td>
        <td>${run.score}${pbMark}</td>
        <td>${run.wpm}</td>
        <td>${run.acc.toFixed(1)}%</td>
        <td>${run.maxCombo}</td>
        <td>${statusStr}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function formatTimestamp(ts) {
    const d = new Date(ts);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hr = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yr}-${mo}-${day} ${hr}:${min}`;
  }

  // --- Purge Confirmation Modal ---
  function openPurgeModal() {
    const callsign = window.Store.getCurrentCallsign();
    DOM.purgeTargetCallsign.textContent = callsign;
    DOM.inputPurgeConfirm.value = '';
    DOM.purgeModal.classList.add('active');
    DOM.inputPurgeConfirm.focus();
    window.Sfx.uiClick();
  }

  function closePurgeModal() {
    DOM.purgeModal.classList.remove('active');
    window.Sfx.uiClick();
  }

  function executePurge() {
    const val = DOM.inputPurgeConfirm.value.trim().toUpperCase();
    if (val === 'PURGE') {
      window.Store.purgeCurrentProfile();
      closePurgeModal();
      renderRecordsScreen();
      window.Sfx.explosion();
    } else {
      window.Sfx.miss();
    }
  }

  // --- Global Keyboard Router ---
  function setupKeyboardRouter() {
    window.addEventListener('keydown', (e) => {
      // 1. If currently inside a text input (callsign or purge input), do not trigger game shortcuts
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // Allow Enter on callsign input
      if (activeEl === DOM.inputCallsign) {
        if (e.key === 'Enter') {
          handleLoginSubmit();
        }
        return;
      }

      // Allow Enter/Esc on purge input
      if (activeEl === DOM.inputPurgeConfirm) {
        if (e.key === 'Enter') {
          executePurge();
        } else if (e.key === 'Escape') {
          closePurgeModal();
        }
        return;
      }

      if (isInputActive) {
        return;
      }

      // 2. Game screen keyboard controls routed directly to engine
      if (currentScreen === SCREENS.GAME) {
        window.Game.handleKeyDown(e);
        return;
      }

      // 3. Purge modal escape
      if (DOM.purgeModal.classList.contains('active')) {
        if (e.key === 'Escape') {
          closePurgeModal();
        }
        return;
      }

      // 4. Global Marquee shortcuts (disabled in game)
      if (e.key === 'c' || e.key === 'C') {
        const settings = window.Store.getSettings();
        window.Store.updateSettings({ crt: !settings.crt });
        updateHeaderMarquee();
        window.Sfx.uiClick();
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        const settings = window.Store.getSettings();
        window.Store.updateSettings({ sfx: !settings.sfx });
        updateHeaderMarquee();
        window.Sfx.uiClick();
        return;
      }

      // 5. Screen-Specific Key Routing
      switch (currentScreen) {
        case SCREENS.LOGIN:
          if (e.key === 'Enter') {
            handleLoginSubmit();
          }
          break;

        case SCREENS.SETTINGS:
          if (e.key === 'Enter') {
            switchScreen(SCREENS.BRIEFING);
            window.Sfx.uiClick();
          } else if (e.key === 'r' || e.key === 'R') {
            switchScreen(SCREENS.RECORDS);
            window.Sfx.uiClick();
          } else if (e.key >= '1' && e.key <= '4') {
            setArsenalMode(Number(e.key));
          }
          break;

        case SCREENS.BRIEFING:
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            switchScreen(SCREENS.GAME);
            const settings = window.Store.getSettings();
            window.Game.startSortie(settings.mode, window.Store.getCurrentCallsign());
          } else if (e.key === 'Escape') {
            switchScreen(SCREENS.SETTINGS);
            window.Sfx.uiClick();
          }
          break;

        case SCREENS.DEBRIEF:
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            window.Game.stopConfetti();
            startCombatSortie(true); // Replay (skip briefing)
          } else if (e.key === 'r' || e.key === 'R') {
            window.Game.stopConfetti();
            switchScreen(SCREENS.RECORDS);
            window.Sfx.uiClick();
          } else if (e.key === 's' || e.key === 'S') {
            window.Game.stopConfetti();
            switchScreen(SCREENS.SETTINGS);
            window.Sfx.uiClick();
          }
          break;

        case SCREENS.RECORDS:
          if (e.key === 'Escape' || e.key === 'Backspace') {
            switchScreen(previousScreen === SCREENS.GAME ? SCREENS.DEBRIEF : previousScreen);
            window.Sfx.uiClick();
          } else if (e.key === 'Enter') {
            switchScreen(SCREENS.BRIEFING);
            window.Sfx.uiClick();
          } else if (e.key >= '0' && e.key <= '4') {
            activeFilter = (e.key === '0') ? 'all' : e.key;
            renderRecordsScreen();
            window.Sfx.uiClick();
          }
          break;
      }
    });
  }

  // --- Attach Event Listeners ---
  function attachDOMListeners() {
    // Header controls
    DOM.btnToggleCrt.addEventListener('click', () => {
      const settings = window.Store.getSettings();
      window.Store.updateSettings({ crt: !settings.crt });
      updateHeaderMarquee();
      window.Sfx.uiClick();
    });

    DOM.btnToggleSfx.addEventListener('click', () => {
      const settings = window.Store.getSettings();
      window.Store.updateSettings({ sfx: !settings.sfx });
      updateHeaderMarquee();
      window.Sfx.uiClick();
    });

    DOM.btnToggleAspect.addEventListener('click', () => {
      const settings = window.Store.getSettings();
      const nextAspect = { 'auto': '16:9', '16:9': '4:3', '4:3': 'auto' }[settings.aspect] || 'auto';
      window.Store.updateSettings({ aspect: nextAspect });
      updateHeaderMarquee();
      window.Sfx.uiClick();
    });

    DOM.btnSwitchCallsign.addEventListener('click', () => {
      switchScreen(SCREENS.LOGIN);
      window.Sfx.uiClick();
    });

    // Login listeners
    DOM.btnLoginSubmit.addEventListener('click', handleLoginSubmit);

    // Settings Mode cards
    DOM.modeCards.forEach(card => {
      card.addEventListener('click', () => {
        setArsenalMode(Number(card.dataset.mode));
      });
    });

    // Cumulative Character Matrix Toggles:
    // Mode 1: all off
    // Mode 2: uppercase
    // Mode 3: uppercase + numbers
    // Mode 4: uppercase + numbers + specials
    DOM.toggleUppercase.addEventListener('click', () => {
      const current = window.Store.getSettings().mode;
      const nextMode = (current >= 2) ? 1 : 2;
      setArsenalMode(nextMode);
    });

    DOM.toggleNumbers.addEventListener('click', () => {
      const current = window.Store.getSettings().mode;
      const nextMode = (current >= 3) ? 2 : 3;
      setArsenalMode(nextMode);
    });

    DOM.toggleSpecials.addEventListener('click', () => {
      const current = window.Store.getSettings().mode;
      const nextMode = (current >= 4) ? 3 : 4;
      setArsenalMode(nextMode);
    });

    // Aspect buttons in Settings
    DOM.aspectChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const aspect = chip.dataset.aspect;
        window.Store.updateSettings({ aspect });
        updateHeaderMarquee();
        refreshSettingsUI();
        window.Sfx.uiClick();
      });
    });

    DOM.btnSettingsProceed.addEventListener('click', () => {
      switchScreen(SCREENS.BRIEFING);
      window.Sfx.uiClick();
    });

    DOM.btnSettingsRecords.addEventListener('click', () => {
      switchScreen(SCREENS.RECORDS);
      window.Sfx.uiClick();
    });

    // Briefing listeners
    DOM.btnEngageCombat.addEventListener('click', () => {
      switchScreen(SCREENS.GAME);
      const settings = window.Store.getSettings();
      window.Game.startSortie(settings.mode, window.Store.getCurrentCallsign());
    });

    // Pause menu listeners
    DOM.btnPauseResume.addEventListener('click', () => {
      window.Game.resume();
    });

    DOM.btnPauseMute.addEventListener('click', () => {
      const settings = window.Store.getSettings();
      window.Store.updateSettings({ sfx: !settings.sfx });
      updateHeaderMarquee();
    });

    DOM.btnPauseAbort.addEventListener('click', () => {
      window.Game.abort();
    });

    // Debrief listeners
    DOM.btnDebriefReengage.addEventListener('click', () => {
      window.Game.stopConfetti();
      startCombatSortie(true); // Re-engage immediately
    });

    DOM.btnDebriefRecords.addEventListener('click', () => {
      window.Game.stopConfetti();
      switchScreen(SCREENS.RECORDS);
      window.Sfx.uiClick();
    });

    DOM.btnDebriefSettings.addEventListener('click', () => {
      window.Game.stopConfetti();
      switchScreen(SCREENS.SETTINGS);
      window.Sfx.uiClick();
    });

    // Records listeners
    DOM.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.filter;
        renderRecordsScreen();
        window.Sfx.uiClick();
      });
    });

    DOM.btnRecordsBack.addEventListener('click', () => {
      switchScreen(previousScreen === SCREENS.GAME ? SCREENS.DEBRIEF : previousScreen);
      window.Sfx.uiClick();
    });

    DOM.btnRecordsPurge.addEventListener('click', openPurgeModal);
    DOM.btnCancelPurge.addEventListener('click', closePurgeModal);
    DOM.btnConfirmPurge.addEventListener('click', executePurge);

    DOM.btnRecordsEngage.addEventListener('click', () => {
      switchScreen(SCREENS.BRIEFING);
      window.Sfx.uiClick();
    });

    // Window Resize Observer for Cabinet & Arena
    window.addEventListener('resize', () => {
      updateCabinetAspect();
    });
  }

  // --- Bootstrap Initialization ---
  function boot() {
    queryElements();
    attachDOMListeners();
    setupKeyboardRouter();

    // Initialize Game engine with canvas and callbacks
    window.Game.init(
      DOM.gameCanvas,
      DOM.confettiCanvas,
      onSortieConcluded,
      onSortieConcluded
    );

    // Subscribe to Store state changes to keep header marquee in sync
    window.Store.subscribe(() => {
      updateHeaderMarquee();
    });

    updateHeaderMarquee();

    // If callsign is already stored, boot straight to SETTINGS; else LOGIN
    const savedCallsign = window.Store.getCurrentCallsign();
    if (savedCallsign) {
      switchScreen(SCREENS.SETTINGS);
    } else {
      switchScreen(SCREENS.LOGIN);
    }

    // Lazy audio activation on first click or key
    const initAudioGesture = () => {
      window.Sfx.init();
      window.removeEventListener('click', initAudioGesture);
      window.removeEventListener('keydown', initAudioGesture);
    };
    window.addEventListener('click', initAudioGesture);
    window.addEventListener('keydown', initAudioGesture);
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose global namespace
  window.App = {
    switchScreen,
    updateHeaderMarquee,
    boot
  };
})();
