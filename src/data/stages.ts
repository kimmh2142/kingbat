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
}

export const STAGES: Record<number, StageConfig> = {
  // 2·3 스테이지 시각은 기준 문서에 끝 시각이 없어 정해지면 추가한다 (제한시간 4분·5분)
  1: { id: 1, label: 'STAGE 1 · 동기 이동기', timeLimit: 180, clockStart: 16 * 60 + 57, clockEnd: 18 * 60, urgentAt: 30 },
};
