// 스테이지별 기본 수치 (기준 문서 2-4, PART 3). 플레이 테스트로 조정한다.
// 새 스테이지는 여기에 한 칸 추가하면 OfficeScene이 그 번호로 돌아간다 (?stage=N 으로 바로 시작).
import { DONGI } from '../npc/patterns/dongi';
import { CHAJANG } from '../npc/patterns/chajang';
import { DAERI } from '../npc/patterns/daeri';
import { GWAJANG } from '../npc/patterns/gwajang';
import type { PatrolPattern, TargetPattern } from '../npc/types';
import { FLOOR_7F, type FloorMap } from './office7f';

export interface StageConfig {
  id: number;
  /** HUD에 보이는 이름 */
  label: string;
  /** 이 스테이지의 층 맵 */
  floor: FloorMap;
  /** 공략 대상 (자리는 맵에서 owner가 pattern.id인 책상) */
  target: TargetPattern;
  /** 순찰하는 방해 NPC (자리는 owner가 pattern.id인 책상) */
  patrols: PatrolPattern[];
  /** 제한시간 (실제 초) */
  timeLimit: number;
  /** 퇴근 시계가 보여주는 시작·끝 시각 (24시간제 분) */
  clockStart: number;
  clockEnd: number;
  /** 남은 시간이 이만큼(초) 되면 시계가 째깍거린다 */
  urgentAt: number;
  /** 특별 미션 (클리어 조건: 킹받음 100 확정 + 미션 성공). id로 어떤 미션 판정을 쓸지 고른다 */
  mission: { id: 'parade' | 'approval'; name: string; goal: string; points: number };
  /** 튜토리얼 스테이지 (단계 안내 칸·속마음 안내창). STAGE 1만 */
  tutorial: boolean;
  /** 결과 화면 대사 */
  lines: { clear: string; next: string; clearMe: string; caught: string };
}

export const STAGES: Record<number, StageConfig> = {
  // 2·3 스테이지 시각은 기준 문서에 끝 시각이 없어 정해지면 추가한다 (제한시간 4분·5분)
  // STAGE 1: 기준 문서 초기값 3분 → 플레이 테스트(11/1) 후 2분 → 팀원 플레이(11/5) 뒤 2분 30초 (맵·아이템 익힐 시간)
  // 미션 점수: 기준 문서 +30 → 포스트잇(15)과 합쳐 한 번에 45점이 너무 커서 +15 (11/5 결정)
  1: {
    id: 1,
    label: 'STAGE 1 · 동기 이동기',
    floor: FLOOR_7F,
    target: DONGI,
    patrols: [DAERI],
    timeLimit: 150,
    clockStart: 16 * 60 + 57,
    clockEnd: 18 * 60,
    urgentAt: 30,
    tutorial: true,
    mission: { id: 'parade', name: '월급루팡 퍼레이드', goal: '포스트잇 붙인 채로 동기를 탕비실까지', points: 15 },
    lines: {
      clear: '아! 진짜 오늘 왜 이러는 거야!!',
      next: '동기 공략 성공! 다음 타깃: 과장',
      clearMe: '이 회사… 생각보다 재밌는데?',
      caught: '야! 너였구나!',
    },
  },
  // STAGE 2: 기준 문서 제한시간 4분, 퇴근 시계 오후 5:55부터 (과장이 업무를 던지는 순간)
  2: {
    id: 2,
    label: 'STAGE 2 · 과장 박통화',
    floor: FLOOR_7F,
    target: GWAJANG,
    patrols: [DAERI, CHAJANG],
    timeLimit: 240,
    clockStart: 17 * 60 + 55,
    clockEnd: 18 * 60,
    urgentAt: 30,
    tutorial: false,
    mission: { id: 'approval', name: '전 직원 칼퇴 승인서', goal: '복사실 가짜 서류를 과장 결재 더미에', points: 25 },
    lines: {
      clear: '회의 자료보다 더 신경 쓰이는 일이 생겼어!',
      next: '과장 공략 성공! 최종 타깃: 대표',
      clearMe: '다음은… 8층이다.',
      caught: '이거 인사고과에 반영할 거야!',
    },
  },
};

/** 주소의 ?stage=N (연습·개발용 바로 시작). 없으면 null */
export function stageFromUrl(): number | null {
  const v = new URLSearchParams(location.search).get('stage');
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** 다음 스테이지 번호. 아직 없으면 null */
export function nextStage(id: number): number | null {
  return STAGES[id + 1] ? id + 1 : null;
}
