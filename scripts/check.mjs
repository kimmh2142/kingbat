// Playwright 실행 확인: 화면 캡처 + 콘솔 에러 + 이동·충돌 확인.
// 사용법: npm run dev 를 켠 상태에서  npm run check [-- 주소쿼리]
//   예) npm run check -- "?debug=1"     npm run check -- "?overview=1"
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
const query = process.argv[2] ?? '';
const name = query.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'default';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE + query);
await page.waitForSelector('canvas');
await page.waitForTimeout(1200);
await page.screenshot({ path: `screenshots/${name}-start.png` });

const pos = () => page.evaluate(() => window.__kingbat?.player);
async function hold(keys, ms) {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
  for (const k of keys) await page.keyboard.up(k);
  await page.waitForTimeout(150);
  return pos();
}

const results = [];
const start = await pos();
results.push(['시작', start]);
// 내 자리 의자에서 아래로 가면 책상에 막혀야 한다
results.push(['아래(책상에 막힘)', await hold(['s'], 800)]);
// 오른쪽 위로 걸어간다
results.push(['오른쪽 위', await hold(['ArrowRight', 'ArrowUp'], 900)]);
await page.screenshot({ path: `screenshots/${name}-moved.png` });
// 왼쪽으로 오래 걸으면 출입구 쪽 바깥 벽에 막혀야 한다
results.push(['왼쪽 끝까지', await hold(['a'], 3500)]);
await page.screenshot({ path: `screenshots/${name}-left.png` });

for (const [label, p] of results) console.log(label.padEnd(14), JSON.stringify(p));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
