// 숨기·확정 확인: 찌르기 → 화분 뒤 숨기 → 0.5초 뒤 확정, 내 자리 일하는 척, 범위 밖 Shift.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-hide.mjs
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
const tp = (x, y) => page.evaluate(([x, y]) => window.__kingbatTest.teleport(x, y), [x, y]);
const out = [];

// 1) 업무 복귀 직후에 찔러서 임시 점수 얻기 (들키지 않게)
for (let i = 0; i < 400 && (await k()).target.state !== 'back'; i++) await page.waitForTimeout(50);
for (let i = 0; i < 100 && (await k()).target.state !== 'work'; i++) await page.waitForTimeout(50);
await tp(1152, 240);
await page.keyboard.down('Space');
await page.waitForTimeout(1500);
await page.keyboard.up('Space');
out.push(['찌른 뒤', (await k()).score]);

// 2) 오른쪽 아래 화분(1268, 420) 근처로 가서 Shift 꾹
await tp(1235, 380);
await page.waitForTimeout(250);
await page.screenshot({ path: 'screenshots/hide-near.png' });
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(300);
const mid = await k();
out.push(['Shift 0.3초', { hidden: mid.hidden, score: mid.score, player: mid.player }]);
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/hide-spot.png' });
const done = await k();
out.push(['Shift 0.8초', { hidden: done.hidden, score: done.score }]);
await page.keyboard.up('ShiftLeft');
await page.waitForTimeout(100);
out.push(['Shift 뗌', { hidden: (await k()).hidden }]);

// 3) 내 자리에서 일하는 척
await tp(664, 930);
await page.waitForTimeout(250);
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/hide-seat.png' });
out.push(['내 자리 Shift', { hidden: (await k()).hidden, player: (await k()).player }]);
await page.keyboard.up('ShiftLeft');

// 4) 숨을 곳 없는 데서 Shift
await tp(1000, 480);
await page.waitForTimeout(250);
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshots/hide-none.png' });
out.push(['범위 밖 Shift', { hidden: (await k()).hidden }]);
await page.keyboard.up('ShiftLeft');

for (const [l, v] of out) console.log(l.padEnd(12), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
