// 퇴근 시계 확인: 흐름, 컷인 중 멈춤, 마지막 30초 연출, 시간 초과 → 야근 확정 → 다시 도전.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-clock.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE);
await page.waitForSelector('canvas');
await page.waitForTimeout(800);
const k = () => page.evaluate(() => window.__kingbat);
const log = [];

// 1) 시계가 흐른다
const r0 = (await k()).remaining;
await page.waitForTimeout(2000);
const r1 = (await k()).remaining;
log.push(['2초 동안', `${r0} → ${r1}`]);
await page.screenshot({ path: 'screenshots/clock-start.png', clip: { x: 0, y: 0, width: 960, height: 50 } });

// 2) 컷인 중에는 멈춘다
await page.evaluate(() => window.__kingbatTest.teleport(1152, 240));
await page.keyboard.down('Space');
while (!(await k()).cutin) await page.waitForTimeout(40);
await page.keyboard.up('Space');
const c0 = (await k()).remaining;
await page.waitForTimeout(1500);
const c1 = (await k()).remaining;
log.push(['컷인 중 1.5초', `${c0} → ${c1}`]);
while ((await k()).cutin) await page.waitForTimeout(50);

// 3) 마지막 30초
await page.evaluate(() => window.__kingbatTest.setRemaining(25));
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/clock-urgent.png', clip: { x: 0, y: 0, width: 960, height: 50 } });

// 4) 시간 초과
await page.evaluate(() => window.__kingbatTest.setRemaining(0.5));
await page.waitForTimeout(1200);
const f = await k();
log.push(['시간 초과', { failed: f.failed, remaining: f.remaining }]);
await page.screenshot({ path: 'screenshots/overtime.png' });
await page.keyboard.press('Enter');
await page.waitForTimeout(800);
const a = await k();
log.push(['다시 도전 후', { failed: a.failed, remaining: a.remaining, hearts: a.hearts }]);

for (const [l, v] of log) console.log(l.padEnd(14), typeof v === 'string' ? v : JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
