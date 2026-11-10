// STAGE 2 특별 미션 "전 직원 칼퇴 승인서" (기준 문서 STAGE 2).
// 복사실에서 가짜 서류를 E로 줍고, 과장이 자리를 비운 사이 과장 책상 결재 더미 앞에서 E → 방향키 3장 미니게임.
// 끼우는 동안 보이면 들킨다(서류는 복사실로 돌아감). 성공하면 바로 확정 점수, 과장이 서류를 들고 부장실 앞으로 간다.
// 수치는 초기값이며 플레이 테스트로 조정한다.

export type Arrow = 'up' | 'down' | 'left' | 'right';

export const APPROVAL = {
  /** 가짜 서류가 놓인 곳 (복사실 복사기 오른쪽 바닥) */
  paper: { x: 2010, y: 1330 },
  /** 과장 책상 위 결재 더미 (기준점 = 책상 앞 바닥) */
  pile: { x: 2252, y: 820 },
  /** 이 거리 안에서 E */
  pickRange: 70,
  pileRange: 90,
  /** 끼울 서류 장수 */
  sheets: 3,
  /** 방향을 틀리면 이 시간(초) 동안 입력을 안 받는다 */
  wrongLock: 0.35,
  /** 끼우는 중 과장이 돌아오는 길이면 이 거리 안에서 들킨다 */
  walkSeeRange: 200,
  /** 성공 연출: 과장이 서류를 들고 가는 길 (과장 trip.routes 순서, 1 = 회의실 앞 = 부장실 옆) */
  deliverRoute: 1,
  /** 부장 고함이 뜨는 곳: 도착한 과장 기준 오른쪽 위 (부장실 쪽). 부장실 안은 카메라 밖일 때가 많아서 과장 곁에 */
  bossVoice: { dx: 110, dy: -170 },
  /** 상단 미션 칸 단계 안내 ({e} = E 또는 [숨기]) */
  steps: {
    pick: '① 복사실 가짜 서류 줍기 ({e})',
    wait: '② 과장이 자리 비울 때까지 숨어서 기다리기',
    file: '② 과장 자리 비었다! 결재 더미 앞에서 {e}',
    sort: '③ 화살표 3개를 순서대로!',
  },
  lines: {
    picked: '가짜 서류 GET! 과장 자리 비울 때 결재 더미에 E',
    needAway: '과장이 자리 비웠을 때!',
    wrong: '삐끗!',
    sheet: '스윽',
    done: '쏙!',
    backToCopy: '서류는 복사실로 돌아갔다…',
    gwajangFind: '어디 보자~ 결재 올려야지~',
    boss: '부장: 이게 뭐야아아!!',
    gwajangExcuse: '제, 제가 올린 게 아닙니다!',
  },
} as const;

export const ARROW_GLYPH: Record<Arrow, string> = { up: '↑', down: '↓', left: '←', right: '→' };
