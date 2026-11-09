// STAGE 3 특별 미션 "대정전과 최후의 방석" (기준 문서 STAGE 3).
// 라운지에서 방귀 방석을 E로 줍고 → 배전반 복도 끝 배전반에서 E (층 전체 정전) → 대표가 확인하러 대표실을 나간 사이
// 대표 의자 옆에서 E로 방석을 깐다 (까는 동안 보이면 들킴, 방석은 라운지로) → 불이 켜지고 대표가 앉으면 "뿌우우욱!"
// 비서 유인(복사기 알림)·정전 중 손전등은 2차에서 붙인다. 수치는 초기값.

export const BLACKOUT = {
  /** 방귀 방석이 놓인 곳 (임원 라운지 간식 테이블 아래) */
  cushion: { x: 360, y: 470 },
  /** 배전반 앞 바닥 */
  panel: { x: 2300, y: 1110 },
  /** 대표 의자 (방석을 까는 곳) */
  chair: { x: 1940, y: 398 },
  pickRange: 70,
  panelRange: 80,
  chairRange: 95,
  /** 정전 시간 (초) */
  darkSeconds: 15,
  /** 불이 켜진 뒤 다시 내릴 수 있을 때까지 (초) */
  cooldown: 8,
  /** 방석 까는 데 걸리는 시간 (초) */
  placeTime: 1.0,
  /** 까는 중 대표가 돌아오는 길이면 이 거리 안에서 들킨다 */
  walkSeeRange: 220,
  /** 정전 때 대표가 가는 곳 (대표 trip.routes 순서, 3 = 정전 확인) */
  checkRoute: 3,
  lines: {
    picked: '방귀 방석 GET! 배전반에서 E로 불을 끄자',
    needCushion: '방석부터 챙기자 (라운지)',
    panel: '철컥!',
    dark: '정전!',
    voices: ['(7층) 동기: 어? 뭐야! 정전이야?', '(7층) 과장: 내 회의 자료!', '(7층) 부장: 누가 전원 껐어!!'],
    daepyoDark: '흠? 정전인가?',
    needAway: '대표가 자리를 비웠을 때!',
    placing: '슬쩍…',
    placed: '설치 완료!',
    lightsOn: '불이 켜졌다!',
    cooling: '배전반이 아직 뜨겁다…',
    backToLounge: '방석은 라운지로 돌아갔다…',
    fart: '뿌우우욱!!',
    daepyoShock: '…!!!',
  },
} as const;
