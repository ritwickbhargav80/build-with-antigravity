/**
 * TYPE//TANK - Munitions & Dictionary Systems
 * Global: window.Words
 */

(function () {
  'use strict';

  // Mode 1: ALPHA (Pure Lowercase Military / Radar / Tactical) - 160+ unique entries
  const MODE_1_WORDS = [
    'tank', 'radar', 'armor', 'cannon', 'turret', 'tread', 'shell', 'flank',
    'scout', 'patrol', 'vector', 'sector', 'target', 'strike', 'combat', 'recon',
    'tracer', 'bunker', 'outpost', 'depot', 'convoy', 'squad', 'platoon', 'brigade',
    'barrage', 'salvo', 'mortar', 'missile', 'rocket', 'charge', 'breach', 'impact',
    'shrapnel', 'sentry', 'watch', 'beacon', 'signal', 'static', 'frequency', 'sonar',
    'optics', 'laser', 'sensor', 'matrix', 'circuit', 'dynamo', 'engine', 'chassis',
    'hull', 'plate', 'shield', 'alloy', 'steel', 'titanium', 'kevlar', 'carbon',
    'ballistic', 'kinetic', 'thermal', 'atomic', 'plasma', 'emp', 'jamming', 'decoder',
    'cipher', 'crypto', 'relay', 'uplink', 'downlink', 'payload', 'ordnance', 'torpedo',
    'howitzer', 'carbine', 'rifle', 'pistol', 'caliber', 'velocity', 'deflect', 'ricochet',
    'pierce', 'rupture', 'shatter', 'crush', 'demolish', 'vaporize', 'decimate', 'raze',
    'scramble', 'deploy', 'engage', 'secure', 'advance', 'retreat', 'regroup', 'fortify',
    'entrench', 'perimeter', 'boundary', 'bastion', 'citadel', 'garrison', 'armory', 'hangar',
    'runway', 'airstrip', 'trench', 'foxhole', 'pillbox', 'redoubt', 'rampart', 'parapet',
    'frontline', 'vanguard', 'rearguard', 'flanker', 'pincer', 'encircle', 'ambush', 'raid',
    'skirmish', 'dogfight', 'sortie', 'mission', 'briefing', 'debrief', 'tactics', 'strategy',
    'doctrine', 'command', 'control', 'liaison', 'courier', 'dispatch', 'intel', 'recon',
    'hazard', 'menace', 'danger', 'alert', 'warning', 'siren', 'breach', 'alarm',
    'critical', 'fatal', 'lethal', 'deadly', 'grim', 'dire', 'urgent', 'hostile',
    'invader', 'raider', 'rebel', 'bandit', 'phantom', 'shadow', 'specter', 'wraith',
    'stalker', 'hunter', 'predator', 'scythe', 'viper', 'cobra', 'panther', 'jaguar'
  ];

  // Mode 2: BRAVO (+ Uppercase / Proper Nouns / Acronyms) - 160+ unique entries
  const MODE_2_WORDS = [
    'Tank', 'RadarX', 'ArmorPlated', 'CannonFire', 'TurretDome', 'TreadDrive', 'ShellCasing', 'FlankSpeed',
    'ScoutUnit', 'PatrolRoute', 'VectorGrid', 'SectorAlpha', 'TargetLocked', 'StrikeForce', 'CombatReady', 'ReconDrone',
    'TracerRound', 'BunkerHill', 'OutpostDelta', 'SupplyDepot', 'ConvoyLeader', 'SquadAlpha', 'PlatoonBravo', 'BrigadeHQ',
    'BarrageFire', 'SalvoLaunch', 'MortarCrew', 'MissileSilo', 'RocketArray', 'ChargePack', 'BreachPoint', 'ImpactZone',
    'ShrapnelBurst', 'SentryGuard', 'NightWatch', 'BeaconTower', 'SignalCode', 'StaticBurst', 'FreqMod', 'SonarPing',
    'OpticsZoom', 'LaserArray', 'SensorScan', 'MatrixNode', 'CircuitBoard', 'DynamoCore', 'EngineBay', 'ChassisRig',
    'HullArmor', 'PlateSteel', 'ShieldWall', 'AlloyForge', 'SteelGrip', 'TitaniumHull', 'KevlarVest', 'CarbonPlate',
    'BallisticArc', 'KineticRound', 'ThermalSight', 'AtomicCore', 'PlasmaBeam', 'EMPBlast', 'JammerPod', 'DecoderKey',
    'CipherCode', 'CryptoKey', 'RelayStation', 'UplinkSat', 'DownlinkFeed', 'PayloadBay', 'OrdnanceDrop', 'TorpedoTube',
    'HowitzerGun', 'CarbineM4', 'SniperRifle', 'HeavyPistol', 'CaliberFifty', 'VelocityMax', 'DeflectAngle', 'RicochetMark',
    'PierceRound', 'RupturePoint', 'ShatterGlass', 'CrushForce', 'DemolishAll', 'VaporizeTarget', 'DecimateGrid', 'RazeGround',
    'ScrambleJets', 'DeployTroops', 'EngageEnemy', 'SecurePerimeter', 'AdvanceGuard', 'RetreatOrder', 'RegroupNow', 'FortifyBase',
    'EntrenchPosition', 'PerimeterLine', 'BoundaryFence', 'BastionFort', 'CitadelTower', 'GarrisonTroops', 'ArmoryVault', 'HangarBay',
    'RunwayClear', 'AirstripBase', 'TrenchLine', 'FoxholeGuard', 'PillboxNest', 'RedoubtPost', 'RampartWall', 'ParapetShield',
    'FrontlineInf', 'VanguardLeader', 'RearguardPost', 'FlankerWing', 'PincerMove', 'EncircleFoe', 'AmbushSquad', 'RaidTeam',
    'SkirmishLine', 'DogfightAce', 'SortieFlight', 'MissionBrief', 'BriefingRoom', 'DebriefReport', 'TacticsManual', 'StrategyPlan',
    'DoctrineMil', 'CommandPost', 'ControlTower', 'LiaisonOfficer', 'CourierFast', 'DispatchDesk', 'IntelReport', 'ReconFlight',
    'HazardZone', 'MenaceLevel', 'DangerClose', 'AlertRed', 'WarningSign', 'SirenBlast', 'BreachAlert', 'AlarmSystem',
    'CriticalHit', 'FatalDamage', 'LethalForce', 'DeadlyAim', 'GrimReaper', 'DireStraits', 'UrgentCall', 'HostileTarget',
    'InvaderCraft', 'RaiderShip', 'RebelForces', 'BanditSix', 'PhantomJet', 'ShadowOps', 'SpecterGun', 'WraithFlight'
  ];

  // Mode 3: CHARLIE (+ Numbers / Military Designations) - 160+ unique entries
  const MODE_3_WORDS = [
    'Squad5', 'Tank99', 'B52', 'v2', 'F16', 'F22', 'M1A2', 'T90',
    'Sector7G', 'Unit101', 'Route66', 'Grid88', 'Alpha9', 'Bravo2', 'Charlie3', 'Delta4',
    'Echo5', 'Foxtrot6', 'Golf7', 'Hotel8', 'India9', 'Juliet0', 'Kilo1', 'Lima2',
    'Mike3', 'November4', 'Oscar5', 'Papa6', 'Quebec7', 'Romeo8', 'Sierra9', 'Tango0',
    'Uniform1', 'Victor2', 'Whiskey3', 'Xray4', 'Yankee5', 'Zulu6', 'AK47', 'M16A4',
    'MP5SD', 'G36C', 'P90', 'DesertEagle50', 'RPG7', 'AT4', 'Javelin9', 'Stinger2',
    'SAM7', 'Patriot3', 'Tomahawk4', 'Hellfire9', 'Sidewinder8', 'AMRAAM120', 'JDAM84', 'C4Charge',
    'Level10', 'Stage99', 'Code404', 'Error500', 'Gate13', 'Hangar18', 'Area51', 'Base32',
    'Post9', 'Silo01', 'Bunker44', 'Tower7', 'Pad39A', 'Radar24', 'Sonar4', 'Radio108',
    'UHF450', 'VHF144', 'Ghz5', 'Mhz100', 'Khz44', 'Watts500', 'Volts240', 'Amps50',
    'Ohm10', 'RPM6000', 'PSI300', 'Bar20', 'Mach3', 'Knot45', 'MPH120', 'KMH200',
    'Cal308', 'Cal762', 'Cal556', 'Cal9mm', 'Cal45ACP', 'Cal12Gauge', 'Cal50BMG', 'Cal20mm',
    'Cal30mm', 'Cal40mm', 'Cal105mm', 'Cal120mm', 'Cal155mm', 'Warhead5', 'Blast80', 'Range1500',
    'Alt30000', 'Depth400', 'Bearing180', 'Heading270', 'Pitch15', 'Roll45', 'Yaw90', 'Speed88',
    'Target01', 'Target02', 'Target03', 'Target04', 'Target05', 'Hostile99', 'Bandit2', 'Bogey1',
    'Strike21', 'Armor90', 'Hull75', 'Core100', 'Shield80', 'Power95', 'Life42', 'Zero0',
    '1stSquad', '2ndPlatoon', '3rdBrigade', '4thDivision', '5thCorps', '6thFleet', '7thArmy', '8thWing',
    '9thRegiment', '10thMountain', '82ndAirborne', '101stAir', '1stCav', '2ndArmored', '3rdInfantry', '4thMarine',
    'Mark1', 'Mark2', 'Mark3', 'Mark4', 'Mark5', 'Type99', 'Model70', 'Series8',
    'Batch12', 'Block40', 'Gen4', 'Rev2', 'Ver3', 'Build89', 'Release1', 'Patch05'
  ];

  // Mode 4: DELTA (+ Special Characters / Command Syntaxes) - 160+ unique entries
  const MODE_4_WORDS = [
    '[tank-01]', '(8+9)', '{cmd-9}', '!alert!', 'x*y=z', '[radar-x]', '<lock-on>', '#strike1',
    '@target', '$bounty$', '%armor%', '&flank&', '*salvo*', '+repair+', '=zero=', '/breach/',
    '\\escape\\', '|barrier|', '~phantom~', '^apex^', '?status?', '!danger!', ':standby:', ';halt;',
    '[alpha-1]', '[bravo-2]', '[charlie-3]', '[delta-4]', '{core:on}', '{shield:max}', '{treads:go}', '{fire:all}',
    '(angle=45)', '(speed=90)', '(range=100)', '(hull<25)', '<hostile_1>', '<hostile_2>', '<incoming!>', '<warning!>',
    '#sector-09', '#outpost-7', '#bunker-12', '#hangar-3', '$ammo+50$', '$credit*2$', '$bonus:3.5$', '$fund-zero$',
    '%power=100%', '%temp+80%', '%damage-20%', '%crit*4%', '&radio:link&', '&sat:up&', '&net:sync&', '&gps:lock&',
    '*ricochet*', '*piercing*', '*critical*', '*shrapnel*', '+charge+cell+', '+hull+weld+', '+boost+spd+', '+ammo+feed+',
    '=lock:true=', '=mode:kill=', '=auth:pass=', '=link:down=', '/deploy/now/', '/advance/fwd/', '/retreat/back/', '/regroup/here/',
    '\\sys\\root\\', '\\dev\\null\\', '\\usr\\bin\\', '\\opt\\agy\\', '|defend|pos|', '|secure|obj|', '|assault|now|', '|flank|left|',
    '~ghost~unit~', '~shadow~ops~', '~stealth~on~', '~radar~off~', '^elevate^up^', '^climb^high^', '^vector^top^', '^summit^now^',
    '?query:id?', '?ping:sat?', '?scan:grid?', '?freq:find?', '!breach!sub!', '!alarm!loud!', '!flare!now!', '!eject!safe!',
    ':wait:seq:', ':arm:fuse:', ':align:gun:', ':prime:bomb:', ';code:end;', ';exit:done;', ';halt:core;', ';kill:proc;',
    '[m1a2-v2]', '(p*v=n*r*t)', '{f=m*a}', '!emp-blast!', 'x/y+z=0', '<turret:360>', '#kill-count#', '$score+1000$',
    '%accuracy:100%', '&telemetry:ok&', '*hyper-shell*', '+turbo-drive+', '=overdrive:max=', '/fire-control/', '\\black-box\\', '|blast-door|',
    '~sonar-echo~', '^zenith-arc^', '?threat-level?', '!red-alert!', ':chassis-lock:', ';system-halt;', '[squad:leader]', '(5*5=25)',
    '{volt:440}', '<range:1500m>', '#b52-carpet#', '$payout*3.5$', '%hull:critical%', '&channel:108.5&', '*laser-focal*', '+nano-patch+',
    '[target:acquired]', '(x+y=10)', '{sub-routine}', '!high-voltage!', '<alpha:omega>', '#kill-zone#', '$credit:max$', '%freq:sync%',
    '&carrier:lost&', '*emp-shockwave*', '+armor:weld+', '=status:nominal=', '/abort:now/', '\\memory:dump\\', '|firewall:breach|', '~ghost:pilot~',
    '^orbital:strike^', '?identify:foe?', ':overheat:warn:', ';terminate:task;', '[defense:grid]', '(100-35=65)', '{payload:arm}', '!breach:hull!'
  ];

  // Ensure unique words per dictionary
  const DICTIONARIES = {
    1: Array.from(new Set(MODE_1_WORDS)),
    2: Array.from(new Set(MODE_2_WORDS)),
    3: Array.from(new Set(MODE_3_WORDS)),
    4: Array.from(new Set(MODE_4_WORDS))
  };

  /**
   * SpawnExclusion Manager
   * Enforces rules:
   * 1. While a crimson word is alive, no new word may spawn starting with the same first char (case-sensitive).
   * 2. A crimson word will not spawn if ANY live word shares its first char.
   * 3. After the crimson word is destroyed or breaches, that char stays excluded for 3 seconds.
   */
  const SpawnExclusion = {
    // Map of character -> expiration timestamp (ms)
    cooldowns: new Map(),
    // Active crimson word's starting char, or null
    activeCrimsonChar: null,

    // Register a newly spawned crimson word
    onCrimsonSpawned(firstChar) {
      this.activeCrimsonChar = firstChar;
    },

    // Register crimson destruction or breach -> begin 3s cooldown
    onCrimsonEnded(firstChar) {
      if (this.activeCrimsonChar === firstChar) {
        this.activeCrimsonChar = null;
      }
      const cooldownUntil = Date.now() + 3000;
      this.cooldowns.set(firstChar, cooldownUntil);
    },

    // Clean up expired cooldowns
    pruneCooldowns() {
      const now = Date.now();
      for (const [char, until] of this.cooldowns.entries()) {
        if (now >= until) {
          this.cooldowns.delete(char);
        }
      }
    },

    // Check if character is currently on crimson cooldown or is the active crimson char
    isCharBlockedByCrimson(char) {
      this.pruneCooldowns();
      if (this.activeCrimsonChar === char) {
        return true;
      }
      const until = this.cooldowns.get(char);
      if (until && Date.now() < until) {
        return true;
      }
      return false;
    },

    // Check if a normal word starting with char can spawn
    canSpawnNormalWord(char) {
      return !this.isCharBlockedByCrimson(char);
    },

    // Check if a crimson word starting with char can spawn
    canSpawnCrimsonWord(char, liveWords) {
      if (this.activeCrimsonChar !== null) {
        return false; // Max one crimson on screen at a time
      }
      if (this.isCharBlockedByCrimson(char)) {
        return false;
      }
      // Check that NO existing live word shares this starting char
      const conflict = liveWords.some(w => w.text && w.text[0] === char);
      return !conflict;
    },

    // Reset state for new sortie
    reset() {
      this.cooldowns.clear();
      this.activeCrimsonChar = null;
    }
  };

  /**
   * Words System Interface
   */
  const Words = {
    DICTIONARIES,
    SpawnExclusion,

    /**
     * Get array of random preview words for a given mode
     */
    getPreviewWords(mode = 1, count = 6) {
      const list = DICTIONARIES[mode] || DICTIONARIES[1];
      const shuffled = [...list].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    },

    /**
     * Select a word for combat spawning adhering to exclusion and level length bias
     * @param {number} mode 1..4
     * @param {boolean} isCrimson whether this spawn intends to be crimson
     * @param {Array} liveWords current active hostile entities on screen
     * @param {number} level current game threat level (influences word length)
     * @returns {string|null} selected word string or null if no valid word found
     */
    selectSpawnWord(mode, isCrimson, liveWords, level = 1) {
      const dict = DICTIONARIES[mode] || DICTIONARIES[1];
      
      // Collect currently active first chars to avoid excessive collisions
      const activeFirstChars = new Set(liveWords.map(w => w.text ? w.text[0] : ''));

      // Filter words matching length bias:
      // Early levels (1-3): bias towards shorter words (<= 6 chars)
      // Mid levels (4-6): medium words (4-10 chars)
      // High levels (7+): all lengths
      let candidatePool = dict.filter(word => {
        if (level <= 2) return word.length <= 6;
        if (level <= 4) return word.length <= 8;
        return true;
      });

      if (candidatePool.length === 0) {
        candidatePool = dict;
      }

      // Shuffle candidate pool
      const shuffled = [...candidatePool].sort(() => 0.5 - Math.random());

      for (const word of shuffled) {
        const firstChar = word[0];

        // Rule for crimson: no live word may share its first char, and cannot be on cooldown
        if (isCrimson) {
          if (SpawnExclusion.canSpawnCrimsonWord(firstChar, liveWords)) {
            return word;
          }
        } else {
          // Rule for normal word: cannot collide with active crimson char or cooldown
          if (SpawnExclusion.canSpawnNormalWord(firstChar)) {
            // Also prefer words whose first char isn't already duplicated on screen if possible
            if (!activeFirstChars.has(firstChar) || shuffled.length < 10) {
              return word;
            }
          }
        }
      }

      // Fallback pass: relax duplicate first char preference for normal words if screen is crowded
      if (!isCrimson) {
        for (const word of shuffled) {
          const firstChar = word[0];
          if (SpawnExclusion.canSpawnNormalWord(firstChar)) {
            return word;
          }
        }
      }

      return null;
    }
  };

  // Expose global namespace
  window.Words = Words;
})();
