// 대리 김카페 순찰 확인: 상태 전환(자리 → 탕비실 → 자리), 걸을 때 부채꼴, 캡처.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-daeri.mjs
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
// 시간 초과로 끝나지 않게 넉넉히
await page.evaluate(() => window.__kingbatTest.setRemaining(999));

const seen = [];
const shots = new Set();
const t0 = Date.now();
while (Date.now() - t0 < 80000) {
  const s = await k();
  const d = s.daeri;
  if (seen.at(-1)?.state !== d.state) seen.push({ t: ((Date.now() - t0) / 1000).toFixed(0), ...d });
  if (d.state === 'go' && d.x < 1000 && !shots.has('go')) {
    shots.add('go');
    await page.evaluate(([x, y]) => window.__kingbatTest.teleport(x, y + 160), [d.x, d.y]);
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'screenshots/daeri-walk.png' });
  }
  if (d.state === 'stay' && !shots.has('stay')) {
    shots.add('stay');
    await page.evaluate(() => window.__kingbatTest.teleport(330, 330));
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'screenshots/daeri-stay.png' });
  }
  if (d.state === 'work' && seen.length > 3) break;
  await page.waitForTimeout(150);
}
console.log(seen.map((s) => `${s.t}s ${s.state}(${s.x},${s.y})`).join(' → '));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
