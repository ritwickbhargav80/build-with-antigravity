/**
 * Playwright Smoke Test for TYPE//TANK
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const VIEWPORTS = [
  { width: 1024, height: 600, label: '1024x600' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' }
];

const ASPECTS = ['auto', '16:9', '4:3'];
const SCREENS = ['screen-login', 'screen-settings', 'screen-briefing', 'screen-game', 'screen-debrief', 'screen-records'];

const SHOTS_DIR = path.join(__dirname, 'shots');
if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const fileUrl = 'file://' + path.resolve(__dirname, '../index.html');
  const allConsoleErrors = [];
  const allPageErrors = [];
  const overflowIssues = [];
  const testResults = [];

  console.log(`Starting TYPE//TANK automated verification on ${fileUrl}...`);

  for (const vp of VIEWPORTS) {
    for (const aspect of ASPECTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1
      });

      const page = await context.newPage();

      page.on('console', msg => {
        if (msg.type() === 'error') {
          allConsoleErrors.push(`[${vp.label}][${aspect}] ${msg.text()}`);
        }
      });

      page.on('pageerror', err => {
        allPageErrors.push(`[${vp.label}][${aspect}] ${err.message}`);
      });

      // Clear localStorage before testing login
      await page.goto(fileUrl);
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      // Configure Aspect Ratio via Store
      await page.evaluate((asp) => {
        window.Store.updateSettings({ aspect: asp });
        window.App.switchScreen('screen-login');
      }, aspect);

      // Verify each screen layout & capture screenshot
      for (const screen of SCREENS) {
        await page.evaluate((s) => {
          // Switch to screen
          window.App.switchScreen(s);
          if (s === 'screen-game') {
            window.Game.startSortie(1, 'TESTER');
          } else if (s === 'screen-debrief') {
            window.Game.stopConfetti();
          }
        }, screen);

        await page.waitForTimeout(100);

        // Check overflow
        const overflow = await page.evaluate(() => {
          const docScrollHeight = document.documentElement.scrollHeight;
          const bodyScrollHeight = document.body.scrollHeight;
          const innerHeight = window.innerHeight;
          const maxScroll = Math.max(docScrollHeight, bodyScrollHeight);
          return {
            hasOverflow: maxScroll > innerHeight,
            maxScroll,
            innerHeight
          };
        });

        if (overflow.hasOverflow) {
          overflowIssues.push({
            viewport: vp.label,
            aspect,
            screen,
            diff: overflow.maxScroll - overflow.innerHeight
          });
        }

        const shotPath = path.join(SHOTS_DIR, `${vp.label}_${aspect.replace(':', 'x')}_${screen}.png`);
        await page.screenshot({ path: shotPath });
      }

      await context.close();
    }
  }

  // --- Targeting Engine Test ---
  console.log('\nRunning Live Combat Targeting Verification...');
  const testContext = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  const testPage = await testContext.newPage();
  await testPage.goto(fileUrl);
  await testPage.evaluate(() => localStorage.clear());
  await testPage.reload();

  // Establish callsign & launch sortie
  await testPage.evaluate(() => {
    window.Store.setCurrentCallsign('TESTER');
    window.App.switchScreen('screen-game');
    window.Game.startSortie(1, 'TESTER');
  });

  // Wait for countdown to finish and at least 2 hostiles to spawn
  console.log('Waiting for hostiles to spawn...');
  let hostilesCount = 0;
  for (let i = 0; i < 40; i++) {
    await testPage.waitForTimeout(250);
    const state = await testPage.evaluate(() => window.Game.debugState());
    if (state.hostiles && state.hostiles.length >= 2) {
      hostilesCount = state.hostiles.length;
      break;
    }
  }

  const targetingState = await testPage.evaluate(() => {
    const state = window.Game.debugState();
    const live = state.hostiles;
    if (live.length < 2) return { error: `Only ${live.length} hostiles spawned` };

    // Find lowest hostile (greatest y)
    const sorted = [...live].sort((a, b) => b.y - a.y);
    const lowest = sorted[0];
    const keyToType = lowest.text[0];

    // Simulate keydown
    window.Game.handleKeyDown({ key: keyToType, preventDefault: () => {} });

    // Check debug state immediately after
    const after = window.Game.debugState();
    return {
      success: true,
      initialLowestId: lowest.id,
      initialLowestText: lowest.text,
      initialLowestY: lowest.y,
      keyTyped: keyToType,
      lockedWordId: after.lockedWord ? after.lockedWord.id : null,
      lockedWordText: after.lockedWord ? after.lockedWord.text : null,
      combo: after.combo
    };
  });

  await testContext.close();
  await browser.close();

  console.log('\n=== SMOKE TEST SUMMARY ===');
  console.log(`Console Errors: ${allConsoleErrors.length}`);
  allConsoleErrors.forEach(e => console.log('  ERR:', e));

  console.log(`Page Errors: ${allPageErrors.length}`);
  allPageErrors.forEach(e => console.log('  PAGE ERR:', e));

  console.log(`Overflow Issues: ${overflowIssues.length}`);
  overflowIssues.forEach(o => console.log(`  OVERFLOW: [${o.viewport}][${o.aspect}] ${o.screen}: scroll ${o.diff}px > innerHeight`));

  console.log('\nTargeting Test:');
  console.log(JSON.stringify(targetingState, null, 2));

  return {
    consoleErrors: allConsoleErrors,
    pageErrors: allPageErrors,
    overflowIssues,
    targetingState
  };
}

run().then(res => {
  if (res.consoleErrors.length > 0 || res.pageErrors.length > 0 || res.overflowIssues.length > 0 || !res.targetingState.success) {
    process.exit(1);
  }
  process.exit(0);
}).catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
