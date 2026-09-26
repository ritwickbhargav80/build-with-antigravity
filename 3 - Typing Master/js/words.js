/**
 * TYPE//TANK - Word Repositories & Exclusion Manager
 * Mode 1: Lowercase
 * Mode 2: Lowercase + Uppercase
 * Mode 3: Lowercase + Uppercase + Numbers
 * Mode 4: Lowercase + Uppercase + Numbers + Special Characters
 */

const WORDS_MODE_1 = [
  "tank", "radar", "artillery", "turret", "armor", "chassis", "breach", "ballistics",
  "perimeter", "sortie", "recon", "patrol", "squadron", "barrage", "flank", "target",
  "missile", "bunker", "defense", "vector", "cipher", "matrix", "sector", "havoc",
  "strike", "phantom", "vulcan", "mortar", "howitzer", "gladius", "bastion", "citadel",
  "vanguard", "sentinel", "warden", "outpost", "overwatch", "payload", "shrapnel",
  "crossfire", "assault", "combat", "scout", "tracer", "garrison", "convoy", "intercept",
  "sonar", "command", "protocol", "barricade", "ambush", "infantry", "corps", "sniper",
  "ballistic", "tread", "caliber", "recoil", "muzzle", "impact", "velocity", "trajectory",
  "neutralize", "evacuate", "extract", "defend", "deploy", "engage", "firepower",
  "armored", "barrage", "beacon", "blast", "cadence", "cannon", "citadel", "clash",
  "column", "decoy", "dynamite", "deflector", "flare", "fortress", "frontline", "grenade",
  "gunner", "interceptor", "magazine", "mines", "payload", "propellant", "rampart",
  "salvo", "shrapnel", "smoke", "sentry", "torpedo", "trench", "vanguard", "warhead"
];

const WORDS_MODE_2 = [
  "Tank", "RadarX", "DeltaForce", "AegisV", "Viper", "SkyNet", "Mantis", "Titan",
  "Ghost", "Goliath", "Specter", "Centurion", "Paladin", "WarHawk", "BlackBird",
  "IronDome", "FireStorm", "Valkyrie", "Nemesis", "Havoc", "Overlord", "Raptor",
  "Predator", "Apache", "Crusader", "Leviathan", "ThunderBolt", "RedAlert", "Phantom",
  "BioHazard", "NightStalker", "StormBreaker", "IronClad", "Shadow", "ZeroHour",
  "Vortex", "Omega", "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot",
  "StrikeForce", "DeathMarch", "CyberWar", "SteelRain", "SkyGuard", "Vindicator",
  "Behemoth", "Juggernaut", "Panzer", "Abrams", "Challenger", "Leopard", "Dreadnought",
  "IronFist", "HellFire", "StarFall", "BloodHound", "NightHawk", "WildCat", "GrimReaper",
  "WarHound", "ArchAngel", "FireFly", "DarkStar", "ThunderBird", "ShockWave", "StormCat"
];

const WORDS_MODE_3 = [
  "Squad5", "Tank99", "v2.0", "Code88", "B52", "M1A2", "F22", "T90", "Su57",
  "AK47", "Sector7", "Unit101", "Delta4", "X86", "HMMWV", "BMP3", "RPG7", "MK19",
  "C130", "AH64", "F35B", "A10", "Zone9", "Grid42", "Base88", "Callsign9", "Level4",
  "Gate13", "Echo7", "Fox3", "Warhead8", "TaskForce9", "Route66", "Type99", "B2",
  "M4A1", "MP5", "G36", "P90", "UAV7", "SAM8", "ICBM9", "Radar8", "Pulse4",
  "Core64", "Node32", "Byte8", "Patch1", "Mod5", "Speed80", "Alpha9", "Zero9",
  "Site51", "Armored4", "Cannon77", "Shell105", "Ammo50", "Target9", "Rounds30",
  "Base01", "Outpost9", "Tower3", "Hangar5", "Silo12", "Sub88", "Fleet6", "Squadron11"
];

const WORDS_MODE_4 = [
  "[tank-01]", "(8+9)", "{cmd-9}", "!alert!", "#fire*", "<lock#>", "[mk-4]",
  "(4*3)", "[grid_8]", "!threat!", "{code:9}", "[target-x]", "$bounty$", "<t-90>",
  "(12-5)", "[core.sys]", "*strike*", "!danger!", "#status_ok#", "<echo/3>",
  "[def-99]", "{run_01}", "(99+1)", "[ping#2]", "!breach!", "<shield.v2>",
  "[base_07]", "{lock:on}", "*blitz*", "#apex-1#", "[unit_44]", "<overkill!>",
  "(36/6)", "{kill_99}", "[armor+5]", "!launch!", "#reboot#", "<tread-x>",
  "(7*8)", "[zero_day]", "{mod+4}", "!critical!", "*omega*", "[alpha#1]",
  "<radar:on>", "{freq.9}", "[hostile#]", "!strike-1!", "$cash*2$", "(15+25)",
  "[p-38]", "{ammo:max}", "<squad-4>", "!scramble!", "#vector-0#", "[blast*3]"
];

// Fallback generator for arithmetic/symbols in Mode 3 and 4
function generateDynamicSymbolWord(mode) {
  if (mode === 3) {
    const ops = ["+", "-"];
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const op = ops[Math.floor(Math.random() * ops.length)];
    const templates = [
      `(${a}${op}${b})`,
      `v${a}.${b}`,
      `Squad${a}${b}`,
      `M${a}A${b}`,
      `Code${a * 10 + b}`,
      `Grid${a}${b}`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  } else if (mode === 4) {
    const brackets = [["[", "]"], ["{", "}"], ["<", ">"], ["(", ")"]];
    const pair = brackets[Math.floor(Math.random() * brackets.length)];
    const symbols = ["!", "#", "$", "*", "-", "_", "+", ":", "."];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const midTerms = ["cmd", "fire", "tank", "lock", "grid", "node", "aim", "def", "mk", "sub", "core", "run"];
    const term = midTerms[Math.floor(Math.random() * midTerms.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    const patterns = [
      `${pair[0]}${term}${sym}${num}${pair[1]}`,
      `${sym}${term}${sym}`,
      `${pair[0]}${num}${sym}${term}${pair[1]}`,
      `!${term}-${num}!`
    ];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }
  return null;
}

/**
 * Tactical Exclusion Manager:
 * Manages active bonus words and cool-down exclusion windows (3.0 seconds)
 * to ensure no overlapping starting characters during or after crimson bonus threats.
 */
class WordExclusionManager {
  constructor() {
    this.activeBonusChars = new Set();
    this.cooldownMap = new Map(); // char -> expiryTimestampMs
    this.cooldownDurationMs = 3000;
  }

  reset() {
    this.activeBonusChars.clear();
    this.cooldownMap.clear();
  }

  registerActiveBonus(startingChar) {
    if (startingChar) {
      this.activeBonusChars.add(startingChar);
    }
  }

  resolveBonus(startingChar) {
    if (startingChar) {
      this.activeBonusChars.delete(startingChar);
      this.cooldownMap.set(startingChar, Date.now() + this.cooldownDurationMs);
    }
  }

  isCharExcluded(startingChar) {
    if (!startingChar) return false;
    
    // Check if currently active as bonus
    if (this.activeBonusChars.has(startingChar)) {
      return true;
    }

    // Check if in cool-down window
    const expiry = this.cooldownMap.get(startingChar);
    if (expiry) {
      if (Date.now() < expiry) {
        return true;
      } else {
        this.cooldownMap.delete(startingChar);
      }
    }

    return false;
  }

  /**
   * Select a candidate word adhering to exclusion rules and current on-screen starting letters
   * @param {number} mode 1, 2, 3, or 4
   * @param {boolean} isBonus whether this candidate is a bonus word
   * @param {Array<string>} existingStartingChars array of 1st characters of currently active falling words
   */
  pickWord(mode, isBonus, existingStartingChars = []) {
    let pool;
    switch (mode) {
      case 1: pool = WORDS_MODE_1; break;
      case 2: pool = WORDS_MODE_2; break;
      case 3: pool = WORDS_MODE_3; break;
      case 4: pool = WORDS_MODE_4; break;
      default: pool = WORDS_MODE_1;
    }

    const existingSet = new Set(existingStartingChars);

    // Filter valid words from pool
    const candidates = pool.filter(word => {
      const firstChar = word.charAt(0);
      if (this.isCharExcluded(firstChar)) return false;
      // Bonus words should ideally not collide with existing on-screen words at spawn time
      if (isBonus && existingSet.has(firstChar)) return false;
      return true;
    });

    if (candidates.length > 0) {
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      if (isBonus) {
        this.registerActiveBonus(selected.charAt(0));
      }
      return selected;
    }

    // If pool exhausted or filtered, attempt dynamic generation for Mode 3/4 or fallback
    const dynamic = generateDynamicSymbolWord(mode);
    if (dynamic && !this.isCharExcluded(dynamic.charAt(0))) {
      if (isBonus) {
        this.registerActiveBonus(dynamic.charAt(0));
      }
      return dynamic;
    }

    // Ultimate fallback from pool without strict filter
    const fallback = pool[Math.floor(Math.random() * pool.length)];
    if (isBonus) {
      this.registerActiveBonus(fallback.charAt(0));
    }
    return fallback;
  }
}

// Export for app usage
window.WordExclusionManager = WordExclusionManager;
window.WORDS_MODE_1 = WORDS_MODE_1;
window.WORDS_MODE_2 = WORDS_MODE_2;
window.WORDS_MODE_3 = WORDS_MODE_3;
window.WORDS_MODE_4 = WORDS_MODE_4;
