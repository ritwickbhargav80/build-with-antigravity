Build a polished browser game called **Type Tank - Typing Master Defense** (branded in-game as **TYPE//TANK**) using only **HTML, CSS, and vanilla JavaScript**. No React, backend, database, npm packages, external libraries, or external APIs. All sound effects must be synthesized natively using the Web Audio API, and all graphics rendered using HTML5 Canvas and CSS. Include a custom SVG tank favicon (`favicon.svg`) embedded in both the browser tab and the marquee header.

---

### Flow & Navigation
**Login (Callsign)** → **Settings (Arsenal & Screen Aspect)** → **Instructions (Combat Briefing)** → **Game (Turret Battlefield)** → **Result (Sortie Debrief)** → **My Records (Flight Logs)**

Provide full keyboard accessibility throughout:
- Enter/Space to advance screens and confirm
- Real-time keystrokes during gameplay
- Esc to abort combat sortie
- 'R' on Result screen to open My Records
- Header buttons for CRT scanline toggle, Audio mute toggle, Aspect Ratio toggle, and Callsign switch

---

### Visual Style & Retro Aesthetic
Use an authentic **dark retro DOS / arcade terminal aesthetic** throughout the entire application:
- Deep black/dark-green background (`#020402` to `#060a06`)
- Authentic retro arcade fonts (e.g. `'Press Start 2P'`, `'VT323'`, and `'Share Tech Mono'`)
- CRT-style glow, phosphor bloom, and subtle scanline overlay with a CRT ON/OFF toggle
- Green and white interface text with crimson-red bonus highlights and amber warnings
- Angular DOS-style bracketed containers, ASCII headers (`+---[ TITLE ]---+`), and glowing reticles
- No generic modern SaaS cards, rounded gradient pills, or corporate web forms
- Universal visibility class `.hidden` defined with `display: none !important; opacity: 0 !important; pointer-events: none !important;` to ensure conditionally hidden elements never appear prematurely.

---

### Screen Aspect Ratio & Viewport Fit Architecture (Crucial Requirement)
The game must look and function like a real arcade cabinet that dynamically adapts to the user's screen and browser window without cut-offs or overflow:

1. **Aspect Ratio Modes (Switchable in Header & Settings)**:
   - **`AUTO [SCREEN FIT]` (Default)**: Fluidly scales to fill the current browser window and screen resolution without letterboxing.
   - **`16:9 [WIDESCREEN]`**: Centers the arcade cabinet with an authentic 16:9 widescreen ratio, side bezels, and deep cathode shadows.
   - **`4:3 [CLASSIC CRT]`**: Centers the cabinet in a classic 4:3 retro arcade monitor ratio with vintage arcade side pillarboxing.
   - **No Side-Clipping or Cropping**: Cabinet wrapper uses inward padding (`padding: 0 12px`) and `pointer-events: none` on side bezels in 16:9 and 4:3 modes so screen content and canvas edges are never covered, cropped, or clipped.
   - **Responsive Marquee & Arena HUD**: Top marquee header and combat HUD must support horizontal scrolling without scrollbars (`scrollbar-width: none`) on constrained widths so buttons and stats remain fully accessible.
   - Mode selection must be saved to `localStorage` and persist across sessions.
   - Resizing or toggling aspect ratio must trigger dynamic canvas and physics coordinate recalibration.

2. **100% Zoom Viewport Fit (No Zoom-Out Needed)**:
   - Every single screen (Login, Settings, Instructions, Game Arena, Debrief, My Records) must fit completely on standard laptop and desktop viewports (e.g. 1366×768, 1920×1080, and 1024×600) at **100% zoom without vertical scroll clipping**.
   - Use compact multi-column layouts (e.g. 2-column or 4-column grids), compact chips, and fluid `clamp(...)` sizing.
   - Avoid flex centering scroll-traps: ensure scrollable screen wrappers use `justify-content: flex-start` with `margin: auto` on boxes so that on smaller screens content can still be scrolled without top-edge clipping.

---

### 1. Login (Operator Authentication)
- Prompt for an operator callsign / username with a DOS command line: `CALLSIGN> [_________]`.
- **Dynamic Typing Block Cursor**:
  - The typing cursor must act as an authentic retro solid block / thick line cursor (`width: 9px`, `height: 20px`, phosphor green glow).
  - It must track immediately behind the entered characters in real time (using an off-screen mirror element for sub-pixel measurement), accurately representing text input position and blinking when idle.
- Store the username in `localStorage` and display it in the header HUD throughout the entire session.
- Include a "SWITCH CALLSIGN" option in the marquee header to change users anytime.

---

### 2. Settings (Arsenal & Display Configuration)
Lowercase is always enabled and permanently armed. Allow exactly these **4 distinct modes**:
1. **Mode 1 [Alpha]**: Lowercase (`tank`, `radar`, `artillery`)
2. **Mode 2 [Bravo]**: Lowercase + Uppercase (`Tank`, `RadarX`, `DeltaForce`)
3. **Mode 3 [Charlie]**: Lowercase + Uppercase + Numbers (`Squad5`, `Tank99`, `(8+9)`, `v2.0`)
4. **Mode 4 [Delta]**: Lowercase + Uppercase + Numbers + Special Characters with **capitalized words** (`[Tank-01]`, `(8+9)`, `{CMD-9}`, `!Alert!`, `[Target-X]`, `<Shield.v2>`, `[Core.Sys]`, `#Status_OK#`, hyphens, brackets, math operators)

Features:
- 4 interactive mode cards with live preview samples reflecting actual dictionary capitalization and symbols.
- Granular character matrix toggles (Uppercase, Numbers, Specials) synced bi-directionally with the 4 modes.
- Aspect ratio selection buttons (`AUTO`, `16:9`, `4:3`).
- Dynamic preview bar displaying sample words for the selected arsenal mode.

---

### 3. Instructions (Tactical Briefing)
Present a concise, high-density **2-column tactical directive grid** that fits entirely on the screen without scrolling:
- **Hostile Words Fall from Top**: Neutralize threats before they breach the defense perimeter.
- **Turret Targeting & Intelligent Switching**: Type characters to fire. Each incoming word features a unique starting character so targeting is clear. If re-aiming is needed, players can switch locks anytime by typing another word's prefix or starting letter.
- **Ballistic Fire & Fade Effect**: Every correct keystroke fires a visible bullet from the 180° cannon. Typed characters immediately **fade to ~35–40% opacity** while remaining letters stay crisp.
- **Red Bonus Targets**: Descend faster, styled in glowing crimson, and grant **3.5× score multipliers**. While a red word is active/falling, conflicting words starting with the same character are temporarily suppressed, followed by a cooldown exclusion window after resolution.
- **Perimeter Defense & Hull Integrity**: Missed words that hit the bottom defense line detonate and damage tank health. Sortie terminates when tank integrity reaches 0%.
- Ready prompt with keyboard trigger (`PRESS SPACEBAR OR ENTER TO ENGAGE`).

---

### 4. Game (Real-Time Ballistic Defense Arena)
Create an authentic real-time Canvas 2D typing defense combat simulation:

- **Semicircular Tank & 180° Rotating Turret**:
  - Anchored at bottom-center of the canvas (`y: height - 30`, with defense perimeter line at `height - 75`).
  - Semicircular dome turret with armor plates, tread chassis base, and an active cannon barrel.
  - The cannon smoothly rotates across a **180° arc** (-180° to 0°) pointing directly at the active targeted word.
  - Recoil pushback animation and muzzle flash particle burst on every shot fired.

- **Tactile Visual Error Cues on Misfires / Wrong Keystrokes**:
  - When the player presses an incorrect key that matches no valid target or continuation:
    - **Tank Shudder**: Tank performs an energetic lateral jitter / shudder animation over 220ms (`tankShakeOffsetX` & `tankShakeOffsetY`).
    - **Crimson Glitch Flash**: The tank body, turret dome, barrel, and core flash in bright crimson red (`#ff2244`) with heightened glow blur.
    - **Electrical Error Sparks**: Red and white spark particles emit upward from the tank core and treads.
    - **Non-Overlapping `! MISFIRE !` Warning**: An arcade-style `! MISFIRE !` label renders directly **below the tank treads** (`y + baseHeight + 3`), preventing any overlap with the cannon barrel, turret dome, or falling words.
    - Combined with screen shake and error audio chime.

- **Target Lock, Unique Starting Letters, & Flexible Target Switching**:
  - **No Duplicate First Letters on Screen**: The spawner strictly prevents two falling words from sharing the same initial character at the same time.
  - **Auto Lock**: The tank locks onto the word matching the typed initial letter.
  - **Prefix Branch Switching**: If two words happen to share an initial prefix (e.g. `Crossfire` vs `Caliber`), typing `C` locks `Crossfire`, but subsequent typing of `A` immediately switches lock to `Caliber` without a miss penalty.
  - **Manual Target Re-Lock**: If the player wants to abandon a locked word (e.g. about to breach or prioritizing higher threat), typing the starting letter of any other active word immediately transfers lock to that target.

- **Non-Overlapping Crimson Bonus & Lock Reticle Labels**:
  - When a crimson bonus target is locked, label collisions are avoided through vertical separation:
    - Lock reticle displays **`[LOCKED]`** centered **ABOVE** the reticle box (`boxY - 5`).
    - Bonus indicator displays **`★ 3.5X BONUS ★`** centered **BELOW** the word/box (`word.y + 24`).
    - The floating bonus label above the word is hidden when locked, completely preventing text stacking on any word length.

- **Ballistic Bullet Physics & Keystrokes**:
  - Every correct keystroke immediately shoots a visible projectile bullet towards that specific character in the word.
  - Tracer lines, impact sparks, and synthesized laser SFX accompany every shot.
  - Typed characters immediately drop to **~35–40% opacity** with an active glowing cursor under the current letter.

- **Red Bonus Targets & Spawning Rules**:
  - Periodically spawn high-threat red bonus targets that fall significantly faster and give 3.5× score.
  - While a red bonus word is falling, **temporarily prevent any new word with the same starting character from spawning**.
  - Enforce a short exclusion cooldown window (~3 seconds) after the red word is destroyed or missed before that initial character can spawn again.

- **Perimeter Breach & Hull Damage**:
  - Words reaching the bottom perimeter detonate with screen shake, alarm SFX, and hull damage (20% normal, 30% bonus).
  - Tank health bar with color-reactive states (green > 50%, amber 25–50%, critical red < 25%).
  - Destruction of tank triggers death particle explosions and transitions to debriefing.

- **Progressive Difficulty & Real-Time Stats HUD**:
  - Fall speed and spawn rate scale up progressively with elapsed time and completed words.
  - Compact single-row top HUD bar displaying Operator, Mode, 6-digit zero-padded Score, Combo multiplier, live WPM, Accuracy %, and Tank Integrity bar.

---

### 5. Result (Sortie Debrief & Record Celebration)
- Metrics grid: Final Score, Average WPM, Accuracy %, Words Destroyed, Max Combo, Mode Played.
- Compare result against the active operator's personal best for that specific mode from `localStorage`.
- **Arcade Record Celebration**:
  - If a **New Personal Best** is achieved: Trigger the flashing arcade celebration banner (**“★ NEW ALL-TIME RECORD ACHIEVED! ★”**), play a victory fanfare sound, and launch full-screen multi-color confetti.
  - If **Not** a new record: Ensure the celebration banner and confetti are completely hidden (`.hidden` display none), and display the previous personal best and exact score/WPM delta needed to surpass it without false celebration triggers.
- Keyboard shortcuts: `[ENTER / SPACE]` to play again, `[R]` to inspect My Records.

---

### 6. My Records / Performance History (Flight Logs)
Do NOT call this a global leaderboard. Create an operator **Performance History & Flight Log** screen using `localStorage`:
- Lifetime Operator Overview: Lifetime PB Score, Maximum WPM, Peak Accuracy, Total Words Neutralized (strictly scoped to current operator).
- Mode Bests Quad: 4 dedicated summary cards displaying personal best score and WPM for each of the 4 arsenal modes.
- Filterable Flight Log Table: Filterable by **ALL MODES**, **MODE 1**, **MODE 2**, **MODE 3**, and **MODE 4**.
- **Personal Best Badge Distinction**:
  - In **`ALL MODES`** view: Display **`★ OVERALL PB`** on the single all-time highest score across all modes for the operator. No duplicate PB badges in all-modes view.
  - In individual mode views (**`MODE 1`**, **`MODE 2`**, etc.): Display simply **`★ PB`** on the single highest score for that selected mode.
- Displays timestamp, mode badge, score, WPM, accuracy %, and max combo.
- Include a "PURGE LOGS" confirmation button to reset history.

---

### 7. Native Synthesized Web Audio (Zero Audio Assets)
Synthesize all retro sounds procedurally with the browser's Web Audio API (`AudioContext`):
- High-frequency laser shot for normal keystrokes
- Heavy metallic thump / explosion on word elimination
- High-pitched dual-tone chime on red bonus word spawn
- Low crunch / screen shake buzz on damage impact
- Multi-tone triumphant fanfare for new records
- Soft retro terminal click on UI buttons and menus
- Audio ON/OFF mute toggle with persistent state

---

### Technical Constraints & File Organization
Organize cleanly into dedicated files:
- `index.html`: Complete semantic structure, HUD, canvas containers, and terminal screen sections.
- `style.css`: CRT scanlines, phosphor glow, responsive layout, aspect ratio constraints (Auto, 16:9, 4:3), universal hidden utility, and compact typography.
- `js/words.js`: Word dictionaries for all 4 modes, expressions, arithmetic combinations, uppercase additions for Mode 4, and exclusion manager preventing duplicate first letters on screen.
- `js/audio.js`: Web Audio API sound synthesizer and volume control.
- `js/storage.js`: Pure `localStorage` engine for player profile, attempt history, and record tracking scoped to operator callsigns.
- `js/game.js`: 60 FPS Canvas 2D engine, turret rotation, bullet physics, lowest-first targeting, prefix-branch and target switching, visual misfire/shudder cues, and particle system.
- `js/app.js`: State machine, aspect ratio controller, keyboard routing, screen transitions, debriefing, and flight log filtering.

Keep the game keyboard-first, responsive, and performant. Deliver the authentic tactile experience of an 80s/90s DOS arcade military typing terminal.
