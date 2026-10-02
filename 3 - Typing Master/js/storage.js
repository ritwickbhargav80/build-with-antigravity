/**
 * TYPE//TANK - Local Storage & Flight Log Engine
 * Tracks operator profiles, game settings, and historical sortie records.
 */

class StorageEngine {
  constructor() {
    this.KEYS = {
      CALLSIGN: "typetank_callsign",
      ASPECT_RATIO: "typetank_aspect_ratio",
      CRT_ENABLED: "typetank_crt_enabled",
      AUDIO_MUTED: "typetank_audio_muted",
      MODE: "typetank_mode",
      FLIGHT_LOGS: "typetank_flight_logs"
    };
  }

  // --- Callsign ---
  getCallsign() {
    return localStorage.getItem(this.KEYS.CALLSIGN) || "COMMANDER";
  }

  setCallsign(callsign) {
    const cleaned = (callsign || "").trim().toUpperCase().replace(/[^A-Z0-9_\-]/g, "").slice(0, 14) || "COMMANDER";
    localStorage.setItem(this.KEYS.CALLSIGN, cleaned);
    return cleaned;
  }

  // --- Aspect Ratio ---
  getAspectRatio() {
    return localStorage.getItem(this.KEYS.ASPECT_RATIO) || "auto";
  }

  setAspectRatio(ratio) {
    const valid = ["auto", "16:9", "4:3"];
    const mode = valid.includes(ratio) ? ratio : "auto";
    localStorage.setItem(this.KEYS.ASPECT_RATIO, mode);
    return mode;
  }

  // --- CRT Mode ---
  isCrtEnabled() {
    const val = localStorage.getItem(this.KEYS.CRT_ENABLED);
    return val === null ? true : val === "true";
  }

  setCrtEnabled(enabled) {
    localStorage.setItem(this.KEYS.CRT_ENABLED, (!!enabled).toString());
    return !!enabled;
  }

  // --- Arsenal Mode ---
  getMode() {
    const val = parseInt(localStorage.getItem(this.KEYS.MODE), 10);
    return isNaN(val) || val < 1 || val > 4 ? 1 : val;
  }

  setMode(mode) {
    const val = Math.max(1, Math.min(4, parseInt(mode, 10) || 1));
    localStorage.setItem(this.KEYS.MODE, val.toString());
    return val;
  }

  // --- Flight Logs ---
  getFlightLogs() {
    try {
      const data = localStorage.getItem(this.KEYS.FLIGHT_LOGS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse flight logs:", e);
      return [];
    }
  }

  saveFlightLogs(logs) {
    try {
      localStorage.setItem(this.KEYS.FLIGHT_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to save flight logs:", e);
    }
  }

  /**
   * Get previous personal best for an operator and mode before saving
   */
  getPersonalBestForMode(mode, callsign) {
    const logs = this.getFlightLogs();
    const operator = (callsign || this.getCallsign()).toUpperCase();
    const modeNum = parseInt(mode, 10);

    const matches = logs.filter(l => l.mode === modeNum && l.callsign.toUpperCase() === operator && l.score > 0);
    if (matches.length === 0) return null;

    matches.sort((a, b) => b.score - a.score);
    return matches[0];
  }

  /**
   * Save sortie result and check if it's a new Personal Best for that mode
   */
  recordSortie(result) {
    const logs = this.getFlightLogs();
    const callsign = (result.callsign || this.getCallsign()).toUpperCase();
    const mode = parseInt(result.mode, 10) || 1;
    const score = parseInt(result.score, 10) || 0;
    const wpm = parseFloat(result.wpm) || 0;
    const accuracy = parseFloat(result.accuracy) || 0;
    const wordsDestroyed = parseInt(result.wordsDestroyed, 10) || 0;
    const maxCombo = result.maxCombo || "x1.0";

    const prevPB = this.getPersonalBestForMode(mode, callsign);
    const isNewRecord = score > 0 && (!prevPB || score > prevPB.score);

    const recordEntry = {
      id: "SORTIE-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
      dateStr: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      callsign: callsign,
      mode: mode,
      score: score,
      wpm: Math.round(wpm),
      accuracy: accuracy.toFixed(1),
      wordsDestroyed: wordsDestroyed,
      maxCombo: maxCombo,
      isPersonalBest: isNewRecord
    };

    // If new record, remove old 'isPersonalBest' tag from previous entries of same mode/callsign
    if (isNewRecord) {
      logs.forEach(l => {
        if (l.mode === mode && (l.callsign || "").toUpperCase() === callsign) {
          l.isPersonalBest = false;
        }
      });
    }

    logs.unshift(recordEntry);
    // Keep max 200 logs to prevent unbounded storage
    if (logs.length > 200) {
      logs.length = 200;
    }
    this.saveFlightLogs(logs);

    return {
      record: recordEntry,
      isNewRecord: isNewRecord,
      prevBestScore: prevPB ? prevPB.score : 0,
      prevBestWpm: prevPB ? prevPB.wpm : 0,
      scoreDelta: prevPB ? score - prevPB.score : score,
      wpmDelta: prevPB ? Math.round(wpm - prevPB.wpm) : Math.round(wpm)
    };
  }

  /**
   * Get lifetime stats for an operator
   */
  getLifetimeStats(callsign) {
    const logs = this.getFlightLogs();
    const operator = (callsign || this.getCallsign()).toUpperCase();
    const operatorLogs = logs.filter(l => l.callsign.toUpperCase() === operator);

    if (operatorLogs.length === 0) {
      return {
        bestScore: 0,
        maxWpm: 0,
        peakAccuracy: 0,
        totalWords: 0,
        totalSorties: 0
      };
    }

    let bestScore = 0;
    let maxWpm = 0;
    let peakAccuracy = 0;
    let totalWords = 0;

    operatorLogs.forEach(l => {
      if (l.score > bestScore) bestScore = l.score;
      if (l.wpm > maxWpm) maxWpm = l.wpm;
      const acc = parseFloat(l.accuracy) || 0;
      if (acc > peakAccuracy) peakAccuracy = acc;
      totalWords += l.wordsDestroyed || 0;
    });

    return {
      bestScore,
      maxWpm,
      peakAccuracy: peakAccuracy.toFixed(1),
      totalWords,
      totalSorties: operatorLogs.length
    };
  }

  /**
   * Mode Bests Quad: returns personal best for each of the 4 modes
   */
  getModeBestsQuad(callsign) {
    const quad = {
      1: { score: 0, wpm: 0 },
      2: { score: 0, wpm: 0 },
      3: { score: 0, wpm: 0 },
      4: { score: 0, wpm: 0 }
    };

    for (let m = 1; m <= 4; m++) {
      const pb = this.getPersonalBestForMode(m, callsign);
      if (pb) {
        quad[m] = { score: pb.score, wpm: pb.wpm };
      }
    }

    return quad;
  }

  purgeLogs() {
    localStorage.removeItem(this.KEYS.FLIGHT_LOGS);
  }
}

// Global instance
window.storageEngine = new StorageEngine();
