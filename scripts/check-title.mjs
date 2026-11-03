// 타이틀 화면 확인 (?title=1): 캡처, ↓/↑ 고르기, [게임 방법] 4쪽 넘기기·Esc 닫기, 모바일 터치로 열고 닫기,
// [게임 시작] → 게임 화면.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-title.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const t = () => page.evaluate(() => ({ open: window.__kingbatTitle?.howToOpen(), page: window.__kingbatTitle?.howToPage(), sel: window.__kingbatTitle?.selected() }));
const log = [];

await page.goto(BASE + '?title=1');
await page.waitForSelector('canvas');
await page.waitForTimeout(1200);
await page.screenshot({ path: 'screenshots/title.png' });
log.push(['처음', await t()]);

await page.keyboard.press('ArrowDown');
log.push(['↓', await t()]);
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await page.screenshot({ path: 'screenshots/title-howto-1.png' });
const opened = await t();
for (let i = 2; i <= 4; i++) {
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  await page.screenshot({ path: `screenshots/title-howto-${i}.png` });
}
const last = await t();
await page.keyboard.press('Escape');
log.push(['게임 방법', { 열림: opened.open, 마지막쪽: last.page, Esc후: (await t()).open }]);

await page.keyboard.press('ArrowUp');
await page.keyboard.press('Space');
await page.waitForTimeout(800);
const game = await page.evaluate(() => ({ title: !!window.__kingbatTitle, intro: window.__kingbat?.intro }));
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/title-start.png' });
log.push(['게임 시작', game]);

// 모바일: 터치로 [게임 방법] 열고 X로 닫기
const mob = await browser.newPage({ viewport: { width: 960, height: 540 }, hasTouch: true });
mob.on('pageerror', (e) => errors.push(String(e)));
await mob.goto(BASE + '?title=1&touch=1');
await mob.waitForSelector('canvas');
await mob.waitForTimeout(1000);
const box = await mob.locator('canvas').boundingBox();
const s = box.width / 960;
await mob.touchscreen.tap(box.x + 710 * s, box.y + 372 * s);
await mob.waitForTimeout(200);
const mOpen = await mob.evaluate(() => window.__kingbatTitle.howToOpen());
await mob.touchscreen.tap(box.x + 800 * s, box.y + 520 * s / 1); // 바깥 어두운 곳은 아무 일 없음
await mob.waitForTimeout(100);
await mob.screenshot({ path: 'screenshots/title-howto-mobile.png' });
await mob.touchscreen.tap(box.x + (480 + 360 - 34) * s, box.y + (270 - 210 + 34) * s);
await mob.waitForTimeout(200);
log.push(['모바일', { 열림: mOpen, X후: await mob.evaluate(() => window.__kingbatTitle.howToOpen()) }]);

for (const [l, v] of log) console.log(l.padEnd(8), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
