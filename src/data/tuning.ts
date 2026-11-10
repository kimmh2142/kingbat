// 플레이 테스트로 조정할 수치 모음. 코드에 숫자를 직접 쓰지 말고 여기서 가져간다.

export const PLAYER = {
  /** 걷는 속도 (px/초) */
  walkSpeed: 190,
  /** 발밑 충돌 상자 크기 */
  feetW: 26,
  feetH: 14,
};

export const CAMERA = {
  /** 따라가기 부드러움 (0~1, 클수록 바로 붙음) */
  lerp: 0.12,
  /** 이 범위 안에서는 카메라가 움직이지 않는다 */
  deadzoneW: 80,
  deadzoneH: 50,
  /** 맵 확대 배율. 1보다 작으면 더 넓게 보인다 (0.8 = 한 화면에 1200 × 675). HUD는 따로 1배 */
  zoom: 0.8,
  /** 휴대폰은 화면이 작아서 조금 덜 줄인다 */
  zoomTouch: 0.9,
  /** 넓게 보면 작아지는 머리 위 글자(이름표·말풍선·안내·의성어)를 이만큼 키운다 */
  textScale: 1.15,
  /** 화면 위쪽 HUD(상단 줄 + 미션 칸) 높이(화면 px). 맵 맨 위에 서도 이름표·안내가 HUD에 가리지 않게 카메라가 이만큼 더 올라간다 */
  hudTop: 74,
};

export const POKE = {
  /** 등 뒤 이 거리(px) 안에서 찌를 수 있다 */
  range: 84,
  /** 초당 콕 횟수: 처음 → 최대. accelTime초 동안 점점 빨라진다 */
  rateStart: 3,
  rateMax: 10,
  accelTime: 3,
  /** 콕 1번당 킹받음 */
  pointsPerPoke: 1,
  /**
   * 연타 방지를 콕 찌르기에도 적용할지. true면 한 번 점수를 받은 뒤 상대가 확인 사이클을 마칠 때까지 0점.
   * 꺼 두면 콕은 언제든 쌓이고(대신 돌아볼 때 들킬 위험), 연타 방지는 아이템 장난에만 적용한다.
   */
  lockAfterScore: false,
  /** 찌르는 동안 이동 속도 배율 (0 = 제자리) */
  moveMultiplier: 0,
};

export const SCORE = {
  /** 클리어에 필요한 확정 킹받음 */
  goal: 100,
};

export const CAUGHT = {
  /** 들킴 컷인 길이(초). 이 동안 게임(퇴근 시계 포함)이 멈춘다 */
  cutinSeconds: 2.4,
  /** 이 시간(초)이 지나면 Space·터치로 컷인을 넘길 수 있다 */
  skipAfter: 0.8,
};

export const HIDE = {
  /** 숨은 채로(일하는 척) 이 시간(초) 버티면 임시 점수가 확정된다 */
  confirmSeconds: 0.5,
  /** 숨는 자리로 미끄러져 들어가는 시간(초) */
  snapSeconds: 0.15,
};

export const LIFE = {
  /** 시작 하트 수 */
  hearts: 3,
};

export const INTRO = {
  /** 시작 후 카메라가 출발하기까지 (초) */
  delay: 0.3,
  /** 타깃까지 카메라 이동 (초) */
  panTo: 0.9,
  /** 타깃과 스테이지 이름 카드를 보여주는 시간 (초). 카드 글을 읽을 만큼 */
  hold: 2.2,
  /** 내 자리로 돌아오는 카메라 이동 (초) */
  panBack: 0.7,
};

export const TARGET_ARROW = {
  /** 화살표가 붙는 화면 안쪽 여백 (위는 HUD·미션 칸, 아래는 아이템 칸을 피한다) */
  marginX: 40,
  marginTop: 94,
  marginBottom: 84,
};

/** 미니맵 (화면 px) */
export const MINIMAP = {
  /** 작은 미니맵 폭 (높이는 맵 비율대로) */
  width: 190,
  /** 화면 가장자리 여백 */
  margin: 10,
  /** 모바일: 오른쪽 아래는 버튼 자리라 오른쪽 위, HUD 바로 아래 */
  touchTop: 52,
  /** 밑에 나·대상·방해 NPC가 들어가면 이만큼 흐려진다 */
  coveredAlpha: 0.3,
  /** 크게 볼 때 폭 */
  bigWidth: 720,
};
