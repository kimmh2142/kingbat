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
};

export const POKE = {
  /** Space를 이 시간(초) 이상 누르면 콕 찌르기 (짧게 누르면 나중에 아이템 사용) */
  holdThreshold: 0.15,
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
  /** 들켰을 때 화면이 멈추는 시간(초). 정식 컷인은 다음 단계 */
  freezeSeconds: 1.6,
};
