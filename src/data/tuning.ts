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
