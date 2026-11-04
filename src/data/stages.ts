// 스테이지별 기본 수치 (기준 문서 2-4, PART 3). 플레이 테스트로 조정한다.

export interface StageConfig {
  id: number;
  /** HUD에 보이는 이름 */
  label: string;
  /** 제한시간 (실제 초) */
  timeLimit: number;
  /** 퇴근 시계가 보여주는 시작·끝 시각 (24시간제 분) */
  clockStart: number;
  clockEnd: number;
  /** 남은 시간이 이만큼(초) 되면 시계가 째깍거린다 */
  urgentAt: number;
  /** 특별 미션 (클리어 조건: 킹받음 100 확정 + 미션 성공) */
  mission: { name: string; goal: string; points: number };
  /** 결과 화면 대사 */
  lines: { clear: string; next: string; clearMe: string; caught: string };
}

export const STAGES: Record<number, StageConfig> = {
  // 2·3 스테이지 시각은 기준 문서에 끝 시각이 없어 정해지면 추가한다 (제한시간 4분·5분)
  // STAGE 1: 기준 문서 초기값 3분 → 플레이 테스트(11/1) 후 2분. 대리·아이템·미션을 넣은 뒤 다시 잰다
  // 미션 점수: 기준 문서 +30 → 포스트잇(15)과 합쳐 한 번에 45점이 너무 커서 +15 (11/5 결정)
  1: {
    id: 1,
    label: 'STAGE 1 · 동기 이동기',
    timeLimit: 120,
    clockStart: 16 * 60 + 57,
    clockEnd: 18 * 60,
    urgentAt: 30,
    mission: { name: '월급루팡 퍼레이드', goal: '포스트잇 붙인 채로 동기를 탕비실까지', points: 15 },
    lines: {
      clear: '아! 진짜 오늘 왜 이러는 거야!!',
      next: '동기 공략 성공! 다음 타깃: 과장',
      clearMe: '이 회사… 생각보다 재밌는데?',
      caught: '야! 너였구나!',
    },
  },
};
