// 배경 음악 확인 (11/10 "귀엽고 통통거리는 BGM"): 첫 클릭 뒤 음악 박자가 흐르는지, 🔊 버튼으로 끄고 켜지는지, 저장되는지.
// 사용법: npm run dev 를 켠 상태에서  node scripts/check-bgm.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const log = [];

await page.goto(BASE + '?title=1');
await page.waitForFunction(() => !!window.__kingbatBgm && !!window.__kingbatTitle);
await page.mouse.click(300, 300);
await page.waitForTimeout(1500);
const s0 = await page.evaluate(() => window.__kingbatBgm.step);
await page.waitForTimeout(1500);
const s1 = await page.evaluate(() => window.__kingbatBgm.step);
log.push(['타이틀 음악', { 박자1: s0, 박자2: s1, 흐름: s1 > s0 }]);
await page.screenshot({ path: 'screenshots/bgm-title.png' });

// 🔊 버튼 (오른쪽 위)
await page.mouse.click(930, 30);
await page.waitForTimeout(200);
const off = await page.evaluate(() => ({ muted: window.__kingbatBgm.muted, saved: localStorage.getItem('kingbat.sound.off') }));
await page.mouse.click(930, 30);
await page.waitForTimeout(200);
const on = await page.evaluate(() => ({ muted: window.__kingbatBgm.muted, saved: localStorage.getItem('kingbat.sound.off') }));
log.push(['소리 버튼', { 끔: off, 켬: on }]);

// 게임 화면: 상단 줄에 🔊 버튼, 장면이 바뀌어도 음악이 이어진다
await page.goto(BASE + '?stage=1');
await page.waitForFunction(() => !!window.__kingbat);
await page.mouse.click(480, 300);
await page.waitForTimeout(1500);
const g0 = await page.evaluate(() => window.__kingbatBgm.step);
await page.waitForTimeout(1000);
const g1 = await page.evaluate(() => window.__kingbatBgm.step);
await page.screenshot({ path: 'screenshots/bgm-hud.png' });
log.push(['게임 음악', { 흐름: g1 > g0 }]);

for (const [l, v] of log) console.log(l.padEnd(8), JSON.stringify(v));
console.log(errors.length ? `콘솔 에러 ${errors.length}개:\n` + errors.join('\n') : '콘솔 에러 없음');
await browser.close();
process.exit(errors.length ? 1 : 0);
