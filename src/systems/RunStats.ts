import type { CaughtReasonId } from '../data/caughtReasons';

/** 한 스테이지를 깼을 때의 기록 (다시 도전해서 깼다면 깬 판의 기록) */
export interface StageRecord {
  stage: number;
  /** 확정 킹받음 */
  confirmed: number;
  /** 들킨 횟수 */
  caught: number;
  caughtBy: Partial<Record<CaughtReasonId, number>>;
  /** 깨는 데 걸린 시간 (초) */
  seconds: number;
  hearts: number;
}

const records = new Map<number, StageRecord>();

/** 이번 출근(타이틀 → 엔딩)의 스테이지별 기록. 엔딩 결과 화면이 모아서 보여 준다 */
export const RunStats = {
  record(r: StageRecord): void {
    records.set(r.stage, r);
  },
  all(): StageRecord[] {
    return [...records.values()].sort((a, b) => a.stage - b.stage);
  },
  /** 타이틀에서 새로 출근할 때 */
  reset(): void {
    records.clear();
  },
};
