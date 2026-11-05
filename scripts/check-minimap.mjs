// 미니맵 확인: PC 오른쪽 아래 작은 지도(나·동기·대리·내 자리·아이템·보이는 화면), M 꾹 크게 → 떼면 닫힘,
// 모바일은 오른쪽 위(버튼과 안 겹침), 미니맵 터치로 크게 → 아무 데나 터치로 닫힘.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-minimap.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const errors = [];
const log = [];

// PC
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE);
await page.waitForSelector('canvas');
await page.waitForFunction(() => window.__kingbat?.items?.onMap.length >= 2, null, { timeout: 40000, polling: 100 });
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/minimap-small.png' });
const small = (await page.evaluate(() => window.__kingbat.minimap));
await page.keyboard.down('KeyM');
await page.waitForTimeout(400);
const held = await page.evaluate(() => window.__kingbat.minimap);
await page.screenshot({ path: 'screenshots/minimap-big.png' });
// 크게 보는 동안에도 게임은 계속 (움직일 수 있다)
const before = await page.evaluate(() => window.__kingbat.player);
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(800);
await page.keyboard.up('ArrowRight');
const after = await page.evaluate(() => window.__kingbat.player);
await page.keyboard.up('KeyM');
await page.waitForTimeout(300);
const released = await page.evaluate(() => window.__kingbat.minimap.big);
log.push(['PC', { 작은지도: small, 'M꾹': held.big, 'M떼면': released, 크게보며이동: after.x - before.x }]);

// 모바일
const mob = await browser.newPage({ viewport: { width: 960, height: 540 }, hasTouch: true });
mob.on('pageerror', (e) => errors.push(String(e)));
await mob.goto(BASE + '?touch=1');
await mob.waitForSelector('canvas');
await mob.waitForFunction(() => window.__kingbat?.items?.onMap.length >= 1, null, { timeout: 40000, polling: 100 });
await mob.waitForTimeout(300);
await mob.screenshot({ path: 'screenshots/minimap-mobile.png' });
const mm = await mob.evaluate(() => window.__kingbat.minimap);
const box = await mob.locator('canvas').boundingBox();
const sc = box.width / 960;
await mob.touchscreen.tap(box.x + (mm.x + mm.w / 2) * sc, box.y + (mm.y + mm.h / 2) * sc);
await mob.waitForTimeout(400);
const opened = await mob.evaluate(() => window.__kingbat.minimap.big);
await mob.screenshot({ path: 'screenshots/minimap-mobile-big.png' });
await mob.touchscreen.tap(box.x + 480 * sc, box.y + 270 * sc);
await mob.waitForTimeout(400);
const closed = !(await mob.evaluate(() => window.__kingbat.minimap.big));
// 오른쪽 아래 버튼(아이템 버튼 위쪽 끝 y≈304)과 안 겹치는지
log.push(['모바일', { 위치: mm, '버튼과 안 겹침': mm.y + mm.h < 300, 터치로열림: opened, 터치로닫힘: closed }]);

for (const [l, v] of log) console.log(l.padEnd(8), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
