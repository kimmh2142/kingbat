// 모바일 가로 화면 터치 확인: 조이스틱 이동, [콕] 버튼, 조이스틱+버튼 동시 터치, 세로 안내.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-mobile.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE);
await page.waitForSelector('canvas');
await page.waitForTimeout(1000);

// 게임 좌표(960x540) → 화면 좌표
const box = await page.locator('canvas').boundingBox();
const s = box.width / 960;
const at = (gx, gy) => ({ x: box.x + gx * s, y: box.y + gy * s });
const cdp = await ctx.newCDPSession(page);
const touch = (type, points) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((p, i) => ({ ...at(p.x, p.y), id: p.id ?? i })),
  });
const k = () => page.evaluate(() => window.__kingbat);

const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
await page.screenshot({ path: 'screenshots/mobile-start.png' });

// 1) 조이스틱: 왼쪽 아래를 누르고 위로 끌기
const p0 = (await k()).player;
await touch('touchStart', [{ x: 180, y: 400 }]);
await touch('touchMove', [{ x: 180, y: 330 }]);
await page.waitForTimeout(700);
await page.screenshot({ path: 'screenshots/mobile-joystick.png' });
await touch('touchEnd', []);
const p1 = (await k()).player;

// 2) 동기 등 뒤로 순간이동 후 [콕] 버튼 꾹
await page.evaluate(() => window.__kingbatTest.teleport(1152, 240));
await page.waitForTimeout(300);
const t0 = (await k()).score.temp;
await touch('touchStart', [{ x: 960 - 86, y: 540 - 86 }]);
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/mobile-poke.png' });
await touch('touchEnd', []);
const t1 = (await k()).score.temp;

// 3) 조이스틱 + 버튼 동시 (두 손가락): 이동은 찌르는 동안 멈추므로 둘 다 눌림만 확인
await page.evaluate(() => window.__kingbatTest.teleport(800, 470));
await page.waitForTimeout(200);
const q0 = (await k()).player;
await touch('touchStart', [{ x: 200, y: 400, id: 1 }, { x: 960 - 86, y: 540 - 86, id: 2 }]);
await touch('touchMove', [{ x: 260, y: 400, id: 1 }, { x: 960 - 86, y: 540 - 86, id: 2 }]);
await page.waitForTimeout(500);
await touch('touchEnd', []);
const q1 = (await k()).player;

// 4) 세로 화면 안내
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
const rotateShown = await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display !== 'none');
await page.screenshot({ path: 'screenshots/mobile-portrait.png' });

console.log('pointer: coarse', coarse);
console.log('조이스틱 위로     ', JSON.stringify(p0), '→', JSON.stringify(p1));
console.log('[콕] 0.9초       점수 +', (t1 - t0).toFixed(1));
console.log('두 손가락(이동+콕)', JSON.stringify(q0), '→', JSON.stringify(q1), '(찌를 대상 없음 → 이동돼야 함)');
console.log('세로 안내 표시    ', rotateShown);
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
