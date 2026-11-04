// 그림 목록표 뽑기: 지금 임시 그림을 PNG로 저장하고(docs/art/placeholder/), 그림 담당용 목록표 HTML을 만든다.
// 사용법: npm run dev 를 켠 상태에서  node scripts/export-art-list.mjs [목록표.html 저장 경로]
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const BASE = process.env.GAME_URL ?? 'http://localhost:5173/';
const OUT_HTML = process.argv[2] ?? 'docs/art/그림_목록표.html';
const PNG_DIR = 'docs/art/placeholder';
mkdirSync(PNG_DIR, { recursive: true });

// 게임 안 크기 (placeholderTextures.ts의 w, h)
const src = readFileSync('src/assets/placeholderTextures.ts', 'utf8');
const sizes = {};
for (const m of src.matchAll(/\[TEX\.(\w+)\]: \{\s*(?:\/\/[^\n]*\n\s*)?w: (\d+),\s*h: (\d+)/g)) sizes[m[1]] = { w: +m[2], h: +m[3] };
const keys = {};
for (const m of readFileSync('src/assets/keys.ts', 'utf8').matchAll(/^\s+(\w+): '(\w+)',/gm)) keys[m[1]] = m[2];

const A = { foot: '아래 가운데 (발·바닥)', center: '가운데', tile: '반복 타일 (네 변 이음매가 맞게)', face: '가운데 (머리 위에 겹침)' };
// [키, 이름, 설명, 기준점, 단계]
const GROUPS = [
  {
    title: '바닥',
    note: '같은 그림이 바둑판처럼 반복됩니다. 가장자리가 이어지게 그려 주세요.',
    items: [
      ['floorOffice', '사무실 바닥', '7층 직원석 전체', 'tile'],
      ['floorPantry', '탕비실 바닥', '', 'tile'],
      ['floorHall', '복도 바닥', '화장실 앞·엘리베이터 쪽', 'tile'],
    ],
  },
  {
    title: '가구 · 사무실 소품',
    note: '조금 위에서 내려다본 앞모습(3/4 시점)입니다. 캐릭터가 뒤로 지나가면 가려지므로 물건 하나에 파일 하나로 주세요.',
    items: [
      ['desk', '책상', '모든 자리 공용. 의자·모니터는 따로 얹음', 'foot'],
      ['monitor', '모니터', '책상 위 왼쪽에 얹힘', 'foot'],
      ['chair', '의자', '책상 뒤', 'foot'],
      ['plantBig', '큰 화분', '숨기 장소', 'foot'],
      ['partition', '파티션', '숨기 장소', 'foot'],
      ['paperPile', '서류 더미', '숨기 장소, 컷신에서 떠넘기는 서류', 'foot'],
      ['printer', '복합기', '', 'foot'],
      ['counter', '탕비실 카운터', '', 'foot'],
      ['coffeeMachine', '커피머신', '카운터 위', 'foot'],
      ['water', '정수기', '', 'foot'],
      ['fridge', '냉장고', '숨기 장소(냉장고 옆)', 'foot'],
      ['snackTable', '간식 테이블', '동기가 간식 가지러 오는 곳', 'foot'],
      ['elevator', '엘리베이터', '', 'foot'],
      ['toiletDoor', '화장실 문', '', 'foot'],
      ['meetingTable', '회의 테이블', '관리자 구역', 'foot', 2],
      ['bossDesk', '관리자 책상', '관리자 구역', 'foot', 2],
      ['lock', '자물쇠', '아직 안 열린 구역 표시', 'center'],
    ],
  },
  {
    title: '주인공',
    note: '몸과 머리를 따로 움직입니다(걷기 흔들림, 숨기). 머리는 몸 위에 얹히고, 앞모습과 뒷모습(위로 걸을 때)이 필요합니다.',
    items: [
      ['playerBody', '몸', '', 'foot'],
      ['playerHeadFront', '머리 (앞)', '얼굴 포함', 'foot'],
      ['playerHeadBack', '머리 (뒤)', '', 'foot'],
      ['shadow', '발밑 그림자', '모든 캐릭터 공용', 'center'],
    ],
  },
  {
    title: '동기 이동기 (STAGE 1 목표 대상)',
    note: '앞모습은 업무 중 모습, 뒷모습은 등 돌리고 일할 때(콕 찌르는 쪽)입니다. 표정은 아래 "NPC 표정"을 얼굴 자리에 겹쳐 씁니다.',
    items: [
      ['dongiBody', '몸 (앞)', '', 'foot'],
      ['dongiBodyBack', '몸 (뒤)', '', 'foot'],
      ['dongiHeadFront', '머리 (앞)', '얼굴 없이 (표정을 따로 겹침)', 'foot'],
      ['dongiHeadBack', '머리 (뒤)', '', 'foot'],
      ['dongiHairSpike', '머리카락 쭈뼛', '진짜로 돌아보기 직전 전조. 머리 위에 겹침', 'foot'],
      ['dongiBag', '동기 가방', '껌 붙이는 곳', 'center'],
    ],
  },
  {
    title: '대리 김카페 (방해 NPC)',
    note: '커피를 들고 순찰합니다. 동기와 같은 파츠 구성입니다.',
    items: [
      ['daeriBody', '몸 (앞)', '', 'foot'],
      ['daeriBodyBack', '몸 (뒤)', '', 'foot'],
      ['daeriHeadFront', '머리 (앞)', '얼굴 없이', 'foot'],
      ['daeriHeadBack', '머리 (뒤)', '', 'foot'],
      ['coffeeCup', '커피컵', '손에 듦', 'center'],
    ],
  },
  {
    title: '회색 엑스트라 직원',
    note: '배경 인물 9명. 몸은 공용, 머리 3종을 섞어 씁니다. 주요 인물보다 눈에 덜 띄게 회색 톤으로.',
    items: [
      ['extraBody', '몸 (앞)', '공용', 'foot'],
      ['extraBodyBack', '몸 (뒤)', '공용', 'foot'],
      ['extraHeadA', '머리 A (앞)', '', 'foot'],
      ['extraHeadABack', '머리 A (뒤)', '', 'foot'],
      ['extraHeadB', '머리 B (앞)', '', 'foot'],
      ['extraHeadBBack', '머리 B (뒤)', '', 'foot'],
      ['extraHeadC', '머리 C (앞)', '', 'foot'],
      ['extraHeadCBack', '머리 C (뒤)', '', 'foot'],
      ['extraHand', '손', '', 'center'],
    ],
  },
  {
    title: 'NPC 표정 · 손 · 소품',
    note: '표정은 눈·입만 있는 얼굴 조각이고 모든 NPC가 같이 씁니다. 캐릭터마다 다른 표정을 원하면 캐릭터 이름을 붙여 따로 주세요.',
    items: [
      ['faceNormal', '평소', '', 'face'],
      ['faceSleepy', '졸림', '꾸벅꾸벅', 'face'],
      ['faceSuspicious', '의심', '"흐음?" 갸웃', 'face'],
      ['facePhone', '휴대폰 보기', '몰래 쇼핑', 'face'],
      ['faceHappy', '기쁨', '', 'face'],
      ['faceShock', '놀람', '들켰을 때·장난 당했을 때', 'face'],
      ['hand', '손', '타이핑, 무릎에 내리기', 'center'],
      ['phone', '휴대폰', '손에 듦', 'center'],
      ['snack', '간식', '탕비실에서 가져옴', 'center'],
    ],
  },
  {
    title: '아이템 · 장난 흔적',
    note: '아이템 아이콘은 바닥과 아래 아이템 칸에 같이 쓰입니다.',
    items: [
      ['itemPostit', '포스트잇 (아이템)', '', 'center'],
      ['itemGum', '껌 (아이템)', '', 'center'],
      ['parcel', '택배 상자', '아이템이 나오는 곳', 'foot'],
      ['postitNote', '등에 붙은 포스트잇', '"오늘도 월급루팡"', 'center'],
      ['gumBlob', '가방에 붙은 껌', '', 'center'],
    ],
  },
  {
    title: '화면 표시 (UI)',
    note: '',
    items: [
      ['angerMark', '분노 마크', '킹받음 단계에 따라 크기가 커짐', 'center'],
      ['targetIcon', '타깃 아이콘', '목표 대상 이름표 옆', 'center'],
      ['stripe', '임시 점수 줄무늬', '게이지 안에서 반복', 'tile'],
      ['heartFull', '하트 (있음)', '', 'center'],
      ['heartEmpty', '하트 (없음)', '', 'center'],
      ['cutinArrow', '들킴 원인 화살표', '들킴 컷인에서 원인 지점을 가리킴', 'center'],
    ],
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(BASE);
await page.waitForSelector('canvas');
await page.waitForFunction(() => !!window.__kingbatTexture && !!window.__kingbat, null, { timeout: 15000 });
await page.waitForTimeout(1500);
const shot = (await page.screenshot({ type: 'jpeg', quality: 82 })).toString('base64');

const listed = new Set(GROUPS.flatMap((g) => g.items.map((i) => i[0])));
const missing = Object.keys(keys).filter((k) => !listed.has(k));
if (missing.length) console.log('목록표에 없는 키:', missing.join(', '));

const img = {};
for (const k of listed) {
  const data = await page.evaluate((key) => window.__kingbatTexture(key), keys[k]);
  img[k] = data;
  writeFileSync(`${PNG_DIR}/${keys[k]}.png`, Buffer.from(data.split(',')[1], 'base64'));
}
await browser.close();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const total = listed.size;
const card = ([k, name, desc, anchor, stage]) => {
  const s = sizes[k];
  const file = keys[k] + '.png';
  const view = Math.min(3, Math.max(1, Math.floor(150 / Math.max(s.w, s.h)))) || 1;
  return `<article class="card">
  <div class="stage-box"><div class="art a-${anchor}" style="width:${s.w * view}px;height:${s.h * view}px"><img src="${img[k]}" alt="${esc(name)} 임시 그림" width="${s.w * view}" height="${s.h * view}"></div></div>
  <div class="meta">
    <h3>${esc(name)}${stage ? ` <span class="pill">STAGE ${stage}부터</span>` : ''}</h3>
    ${desc ? `<p class="desc">${esc(desc)}</p>` : ''}
    <dl>
      <dt>파일 이름</dt><dd><code>${file}</code></dd>
      <dt>게임 안 크기</dt><dd class="num">${s.w} × ${s.h}</dd>
      <dt>그려 줄 크기</dt><dd class="num strong">${s.w * 2} × ${s.h * 2}</dd>
      <dt>기준점</dt><dd>${A[anchor]}</dd>
    </dl>
  </div>
</article>`;
};

const html = `<title>킹받게 하기 그림 목록표</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* 레이아웃: 위에 받는 방법 요약, 아래에 분류별 그림 카드 격자. 게임과 같은 파스텔 핑크 + 굵은 외곽선 */
:root {
  --bg: #fdf3f6; --surface: #ffffff; --ink: #3d2a33; --muted: #8a7480; --line: #5a3a4a;
  --accent: #ff4f8b; --accent-soft: #ffe1ec; --check-a: #f4e6ec; --check-b: #ffffff; --mark: #2f9e8f;
  --display: 'Jua', 'Noto Sans KR', system-ui, sans-serif;
  --body: 'Noto Sans KR', system-ui, -apple-system, 'Malgun Gothic', sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #221a1f; --surface: #2e242a; --ink: #f6eaf0; --muted: #b8a3ad; --line: #e9c9d6;
  --accent: #ff7aa8; --accent-soft: #4a2a38; --check-a: #3a2f35; --check-b: #2e242a; --mark: #5fd3c2; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #221a1f; --surface: #2e242a; --ink: #f6eaf0; --muted: #b8a3ad; --line: #e9c9d6;
  --accent: #ff7aa8; --accent-soft: #4a2a38; --check-a: #3a2f35; --check-b: #2e242a; --mark: #5fd3c2; color-scheme: dark }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font-family: var(--body); font-size: 15px; line-height: 1.6; }
.wrap { max-width: 1120px; margin: 0 auto; padding-block: 40px 72px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
header { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 28px; align-items: center; }
h1 { font-family: var(--display); font-weight: 400; font-size: clamp(30px, 5vw, 46px); line-height: 1.15; margin: 0 0 10px; text-wrap: balance; }
h1 em { font-style: normal; color: var(--accent); }
.lead { margin: 0; color: var(--muted); max-width: 52ch; }
.shot { margin: 0; border: 3px solid var(--line); border-radius: 16px; overflow: hidden; box-shadow: 0 5px 0 var(--line); }
.shot img { display: block; width: 100%; height: auto; }
.shot figcaption { font-size: 12px; color: var(--muted); padding: 6px 10px; background: var(--surface); }
.rules { margin-top: 36px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
.rule { background: var(--surface); border: 2px solid var(--line); border-radius: 14px; padding: 14px 16px; min-width: 0; }
.rule h2 { font-family: var(--display); font-weight: 400; font-size: 19px; margin: 0 0 4px; color: var(--accent); }
.rule p { margin: 0; font-size: 14px; }
.rule code, dd code { font-family: var(--mono); font-size: 12.5px; background: var(--accent-soft); padding: 1px 6px; border-radius: 6px; word-break: break-all; }
.count { margin: 40px 0 0; font-size: 14px; color: var(--muted); }
.count b { color: var(--ink); font-variant-numeric: tabular-nums; }
section { margin-top: 44px; }
section > h2 { font-family: var(--display); font-weight: 400; font-size: 26px; margin: 0; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
section > h2 small { font-family: var(--body); font-size: 13px; color: var(--muted); }
.gnote { margin: 4px 0 16px; color: var(--muted); max-width: 70ch; font-size: 14px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
.card { background: var(--surface); border: 2px solid var(--line); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; min-width: 0; }
.stage-box { height: 180px; display: grid; place-items: center; border-bottom: 2px solid var(--line);
  background-color: var(--check-b);
  background-image: linear-gradient(45deg, var(--check-a) 25%, transparent 25%, transparent 75%, var(--check-a) 75%),
    linear-gradient(45deg, var(--check-a) 25%, transparent 25%, transparent 75%, var(--check-a) 75%);
  background-size: 16px 16px; background-position: 0 0, 8px 8px; }
.art { position: relative; max-width: 100%; }
.art img { display: block; max-width: 100%; height: auto; image-rendering: pixelated; outline: 1px dashed color-mix(in srgb, var(--muted) 60%, transparent); }
.art::after { content: ""; position: absolute; width: 10px; height: 10px; border-radius: 50%; background: var(--mark);
  border: 2px solid var(--surface); transform: translate(-50%, -50%); left: 50%; }
.a-foot::after { top: 100%; }
.a-center::after, .a-face::after { top: 50%; }
.a-tile::after { display: none; }
.meta { padding: 12px 14px 14px; }
.meta h3 { font-size: 16px; margin: 0; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pill { font-size: 11px; font-weight: 600; color: var(--accent); background: var(--accent-soft); border-radius: 999px; padding: 1px 8px; }
.desc { margin: 2px 0 0; font-size: 13px; color: var(--muted); }
dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 12px; margin: 10px 0 0; font-size: 13px; }
dt { color: var(--muted); }
dd { margin: 0; min-width: 0; }
.num { font-variant-numeric: tabular-nums; }
.strong { font-weight: 700; color: var(--accent); }
.legend { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 10px; height: 10px; border-radius: 50%; background: var(--mark); display: inline-block; }
.future ul { margin: 6px 0 0; padding-left: 20px; }
.future li { margin: 2px 0; }
@media (max-width: 720px) { header { grid-template-columns: minmax(0, 1fr); } }
</style>
<div class="wrap">
<header>
  <div>
    <h1>직장인 킹받게 하기<br><em>그림 목록표</em></h1>
    <p class="lead">지금 게임 화면은 코드로 그린 임시 그림입니다. 아래 그림을 같은 파일 이름의 PNG로 주시면 그대로 갈아 끼웁니다. 한 번에 다 줄 필요 없이, 받은 것부터 바뀌고 나머지는 임시 그림으로 남습니다.</p>
  </div>
  <figure class="shot"><img src="data:image/jpeg;base64,${shot}" alt="지금 게임 화면 (임시 그림)"><figcaption>지금 화면 (임시 그림, 960 × 540)</figcaption></figure>
</header>

<div class="rules">
  <div class="rule"><h2>PNG, 배경 투명</h2><p>PSD·클립 스튜디오 원본은 레이어별로 PNG로 내보내 주세요.</p></div>
  <div class="rule"><h2>게임 크기의 2배</h2><p>카드의 <b>그려 줄 크기</b>대로 그리면 선명하게 들어갑니다. 비율만 맞으면 조금 달라도 괜찮아요.</p></div>
  <div class="rule"><h2>파일 이름 그대로</h2><p>카드에 적힌 이름으로 저장해 주세요. 예: <code>desk.png</code></p></div>
  <div class="rule"><h2>물건 하나에 파일 하나</h2><p>배경을 한 장으로 합치면 캐릭터가 책상 뒤로 가려지는 순서와 부딪힘이 깨집니다.</p></div>
  <div class="rule"><h2>파츠는 같은 기준으로</h2><p>몸·머리·표정을 따로 움직입니다. <span class="legend"><i></i>초록 점</span>이 기준점(위치를 맞추는 곳)이에요.</p></div>
  <div class="rule"><h2>그림체</h2><p>파스텔 핑크 톤, 굵은 외곽선, 2~2.5등신, 과장된 표정. 조금 위에서 내려다본 앞모습.</p></div>
</div>

<p class="count">지금 필요한 그림 <b>${total}</b>개 · 분류 ${GROUPS.length}개 · 바둑판무늬는 투명한 부분, 점선은 그림 크기</p>

${GROUPS.map((g) => `<section>
  <h2>${esc(g.title)} <small>${g.items.length}개</small></h2>
  ${g.note ? `<p class="gnote">${esc(g.note)}</p>` : ''}
  <div class="grid">${g.items.map(card).join('\n')}</div>
</section>`).join('\n')}

<section class="future">
  <h2>앞으로 추가될 그림 <small>아직 목록에 없음</small></h2>
  <p class="gnote">STAGE 2·3과 연출이 만들어지면 이 목록에 같은 방식으로 추가됩니다.</p>
  <div class="rule"><ul>
    <li>STAGE 2 과장 박통화, STAGE 3 대표 나대표 (몸·머리 앞뒤)</li>
    <li>방해 NPC: 부장 홍분노, 비서, 이사, 인사팀</li>
    <li>주인공 표정: 화남, 비장함, 놀람 (지금은 웃는 얼굴 하나뿐)</li>
    <li>8층 임원층 가구, Lv2·Lv3 아이템 (모니터 끄기, 방귀 방석 등)</li>
    <li>타이틀 로고, 클리어·실패 화면 일러스트</li>
  </ul></div>
</section>
</div>
`;
writeFileSync(OUT_HTML, html);
console.log(`그림 ${total}개 PNG 저장: ${PNG_DIR}/`);
console.log(`목록표: ${OUT_HTML}`);
