/**
 * TYPE//TANK - Versioned Storage Layer
 * Global: window.Store
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'typetank:v1';
  const MAX_HISTORY_PER_PROFILE = 200;

  // Default clean state template
  function createDefaultState() {
    return {
      version: 1,
      currentCallsign: null,
      settings: {
        mode: 1,
        aspect: 'auto',
        crt: true,
        sfx: true
      },
      profiles: {}
    };
  }

  // Create clean empty profile structure
  function createEmptyProfile() {
    return {
      history: [],
      bests: {
        '1': { score: 0, wpm: 0 },
        '2': { score: 0, wpm: 0 },
        '3': { score: 0, wpm: 0 },
        '4': { score: 0, wpm: 0 }
      }
    };
  }

  // In-memory data store with fallback capability
  let state = createDefaultState();

  // Test localStorage availability
  function isStorageAvailable() {
    try {
      const testKey = '__typetank_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  const storageSupported = isStorageAvailable();

  /**
   * Persist state to localStorage if available
   */
  function persist() {
    if (!storageSupported) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('TYPE//TANK: Failed to write to localStorage. Using in-memory state.', e);
    }
  }

  /**
   * Hydrate state from localStorage or initialize defaults
   */
  function hydrate() {
    if (!storageSupported) {
      state = createDefaultState();
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state = createDefaultState();
        persist();
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
        console.warn('TYPE//TANK: Unrecognized storage format. Resetting to version 1 defaults.');
        state = createDefaultState();
        persist();
        return;
      }

      // Merge defaults to ensure required keys exist
      state = {
        version: 1,
        currentCallsign: parsed.currentCallsign || null,
        settings: {
          mode: [1, 2, 3, 4].includes(parsed.settings?.mode) ? parsed.settings.mode : 1,
          aspect: ['auto', '16:9', '4:3'].includes(parsed.settings?.aspect) ? parsed.settings.aspect : 'auto',
          crt: typeof parsed.settings?.crt === 'boolean' ? parsed.settings.crt : true,
          sfx: typeof parsed.settings?.sfx === 'boolean' ? parsed.settings.sfx : true
        },
        profiles: parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {}
      };
    } catch (e) {
      console.warn('TYPE//TANK: Error reading localStorage data. Initializing defaults.', e);
      state = createDefaultState();
    }
  }

  // Initial load
  hydrate();

  const listeners = new Set();
  function notifyListeners() {
    listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }

  const Store = {
    /**
     * Subscribe to storage state changes
     */
    subscribe(fn) {
      if (typeof fn === 'function') {
        listeners.add(fn);
        return () => listeners.delete(fn);
      }
      return () => {};
    },

    /**
     * Get settings snapshot
     */
    getSettings() {
      return { ...state.settings };
    },

    /**
     * Update settings and persist
     */
    updateSettings(newSettings) {
      state.settings = {
        ...state.settings,
        ...newSettings
      };
      persist();
      notifyListeners();
      return this.getSettings();
    },

    /**
     * Get currently selected callsign
     */
    getCurrentCallsign() {
      return state.currentCallsign;
    },

    /**
     * Switch or establish an operator callsign
     */
    setCurrentCallsign(callsign) {
      if (!callsign || typeof callsign !== 'string') return;
      const cleanCallsign = callsign.trim().toUpperCase();
      state.currentCallsign = cleanCallsign;

      if (!state.profiles[cleanCallsign]) {
        state.profiles[cleanCallsign] = createEmptyProfile();
      }

      persist();
      notifyListeners();
      return cleanCallsign;
    },

    /**
     * Retrieve full profile object for active callsign
     */
    getProfile(callsign = state.currentCallsign) {
      if (!callsign) return createEmptyProfile();
      const clean = callsign.toUpperCase();
      if (!state.profiles[clean]) {
        state.profiles[clean] = createEmptyProfile();
      }
      return state.profiles[clean];
    },

    /**
     * Record a sortie run to the active profile's flight log
     * Evaluates personal record status and updates bests.
     * @param {Object} runData { mode, score, wpm, acc, words, maxCombo, duration, aborted }
     * @returns {Object} { isNewPB, previousBest, deltaScore, deltaWpm, runEntry }
     */
    saveRun(runData) {
      const callsign = state.currentCallsign;
      if (!callsign) {
        throw new Error('TYPE//TANK: Cannot save sortie without active operator callsign.');
      }

      const profile = this.getProfile(callsign);
      const modeKey = String(runData.mode || 1);
      const previousBest = profile.bests[modeKey] ? { ...profile.bests[modeKey] } : { score: 0, wpm: 0 };

      // Determine PB qualification
      let isNewPB = false;
      if (!runData.aborted) {
        // First completed run or score strictly greater than previous best score
        const hasExistingRecord = previousBest.score > 0 || (profile.history.some(r => r.mode === runData.mode && !r.aborted));
        if (!hasExistingRecord || runData.score > previousBest.score) {
          isNewPB = true;
          profile.bests[modeKey] = {
            score: Math.round(runData.score),
            wpm: Math.round(runData.wpm)
          };
        }
      }

      const deltaScore = runData.score - previousBest.score;
      const deltaWpm = Math.round(runData.wpm - previousBest.wpm);

      const runEntry = {
        ts: Date.now(),
        mode: Number(runData.mode || 1),
        score: Math.round(runData.score || 0),
        wpm: Math.round(runData.wpm || 0),
        acc: Number(Number(runData.acc || 0).toFixed(1)),
        words: Math.round(runData.words || 0),
        maxCombo: Math.round(runData.maxCombo || 0),
        duration: Math.round(runData.duration || 0),
        aborted: !!runData.aborted,
        pb: isNewPB
      };

      // Add to front of history (newest first) and limit to MAX_HISTORY_PER_PROFILE
      profile.history.unshift(runEntry);
      if (profile.history.length > MAX_HISTORY_PER_PROFILE) {
        profile.history = profile.history.slice(0, MAX_HISTORY_PER_PROFILE);
      }

      persist();

      return {
        isNewPB,
        previousBest,
        deltaScore,
        deltaWpm,
        runEntry
      };
    },

    /**
     * Compute aggregated lifetime flight stats for active callsign
     */
    getLifetimeStats(callsign = state.currentCallsign) {
      const profile = this.getProfile(callsign);
      if (!profile || !profile.history || profile.history.length === 0) {
        return {
          peakScore: 0,
          maxWpm: 0,
          peakAcc: 0.0,
          totalWords: 0,
          totalSorties: 0
        };
      }

      let peakScore = 0;
      let maxWpm = 0;
      let peakAcc = 0;
      let totalWords = 0;
      let completedSorties = 0;

      profile.history.forEach(run => {
        if (run.score > peakScore) peakScore = run.score;
        if (run.wpm > maxWpm) maxWpm = run.wpm;
        if (run.acc > peakAcc) peakAcc = run.acc;
        totalWords += (run.words || 0);
        if (!run.aborted) completedSorties++;
      });

      return {
        peakScore,
        maxWpm,
        peakAcc: Number(peakAcc.toFixed(1)),
        totalWords,
        totalSorties: profile.history.length
      };
    },

    /**
     * Purge all flight logs and records for the active callsign only
     */
    purgeCurrentProfile() {
      const callsign = state.currentCallsign;
      if (!callsign || !state.profiles[callsign]) return false;

      state.profiles[callsign] = createEmptyProfile();
      persist();
      return true;
    }
  };

  // Expose global namespace
  window.Store = Store;
})();
