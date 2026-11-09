// ?stage=N 바로 시작 확인: ?stage=1 → 타이틀·컷신 없이 게임(스테이지 1), ?stage=2 → 과장 스테이지, 아직 없는 스테이지(?stage=3) → 예고 화면,
// ?stage=1&title=1 이어도 타이틀을 건너뛰는지, 다시 도전해도 같은 스테이지인지.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-stage.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const errors = [];
const log = [];
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE + '?stage=1&title=1');
const s1 = await page.waitForFunction(() => window.__kingbat?.stage === 1, null, { timeout: 15000 }).then(() => true, () => false);
log.push(['?stage=1', { 게임시작: s1, 타이틀없음: !(await page.evaluate(() => !!window.__kingbatTitle)) }]);
await page.screenshot({ path: 'screenshots/stage-1.png' });

await page.evaluate(() => window.__kingbatTest.loseAll());
await page.waitForTimeout(1500);
await page.keyboard.press('Space');
await page.waitForTimeout(1500);
log.push(['다시 도전', { stage: await page.evaluate(() => window.__kingbat?.stage) }]);

await page.goto(BASE + '?stage=2');
const s2 = await page.waitForFunction(() => window.__kingbat?.stage === 2, null, { timeout: 15000 }).then(() => true, () => false);
log.push(['?stage=2', { 과장스테이지: s2, 대상: (await page.evaluate(() => window.__kingbat?.target?.state)) !== undefined }]);

await page.goto(BASE + '?stage=3');
const soon = await page.waitForFunction(() => !!window.__kingbatComingSoon, null, { timeout: 15000 }).then(() => true, () => false);
log.push(['?stage=3', { 예고화면: soon }]);

for (const [l, v] of log) console.log(l.padEnd(10), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
