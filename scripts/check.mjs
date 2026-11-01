// Playwright 실행 확인: 화면 캡처 + 콘솔 에러 수집.
// 사용법: npm run dev 를 켠 상태에서  npm run check [-- 주소쿼리]
//   예) npm run check -- "?debug=1"     npm run check -- "?overview=1"
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
const query = process.argv[2] ?? '';
const name = (query.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'default');
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

// 이동 확인: 오른쪽·위로 걸어 본다
const before = await page.evaluate(() => window.__kingbat?.player);
await page.keyboard.down('ArrowRight');
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(900);
await page.keyboard.up('ArrowRight');
await page.keyboard.up('ArrowUp');
await page.waitForTimeout(300);
const after = await page.evaluate(() => window.__kingbat?.player);
await page.screenshot({ path: `screenshots/${name}-moved.png` });

console.log('player before:', JSON.stringify(before), 'after:', JSON.stringify(after));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
