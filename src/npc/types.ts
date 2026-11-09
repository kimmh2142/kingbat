import type { TextureKey } from '../assets/keys';

/** [최소, 최대] 초. 매번 이 사이에서 무작위로 고른다 (시간을 외워서 이기지 못하게) */
export type Range = readonly [number, number];

export interface Point {
  x: number;
  y: number;
}

export type Facing = 'down' | 'up' | 'left' | 'right';

export type HandsPose = 'keyboard' | 'knees' | 'phone' | 'snack' | 'cup' | 'side' | 'hidden';

/** 캐릭터 한 순간의 모습. 전조는 전부 이 값의 변화로만 보여준다. */
export interface Pose {
  /** 뒤돌아본 상태 (뒤통수와 등이 보임) */
  back?: boolean;
  face?: TextureKey;
  hands?: HandsPose;
  /** 손이 키보드 위에서 움직임 (타닥타닥). 멈추는 것 자체가 전조 */
  typing?: number;
  /** 고개 기울기 (도) */
  tilt?: number;
  /** 꾸벅꾸벅 */
  nod?: boolean;
  /** 머리카락 쭈뼛 */
  spike?: boolean;
  /** 몸을 숙임 (책상 아래로 휴대폰 줍기) px */
  bend?: number;
  /** 눈동자·고개가 흘깃 향하는 쪽 (-1 화면 왼쪽, 1 오른쪽). 돌아볼 방향의 전조 */
  glance?: number;
  /** 머리 위 작은 말풍선 */
  bubble?: string;
}

export interface NpcLook {
  body: TextureKey;
  bodyBack: TextureKey;
  headFront: TextureKey;
  headBack: TextureKey;
  spike?: TextureKey;
  /** 머리 위 직급 라벨. 빈 문자열이면 라벨 없음 (엑스트라 직원) */
  rank: string;
  rankColor: number;
  /** 손 그림 (기본 TEX.hand) */
  hand?: TextureKey;
  /** 몸·머리·손 색 곱하기 (엑스트라 직원 진하기) */
  tint?: number;
}

/** 공략 대상 행동 패턴. 수치·대사·자세는 전부 여기서 정하고 TargetController는 순서만 돌린다. */
export interface TargetPattern {
  id: string;
  name: string;
  appearance: NpcLook;

  /** 평소 업무: 이 중 하나를 골라 한동안 한다 */
  work: { duration: Range; activities: { pose: Pose; weight: number }[] };
  /** 의심 1단계: 진짜·페이크가 똑같이 보이는 구간 */
  suspect: { duration: Range; pose: Pose };
  /** 2단계 페이크: 다시 업무로 */
  fake: { duration: Range; pose: Pose };
  /** 2단계 진짜: 여기서 갈라진 뒤 돌아보기까지가 반응 시간 */
  real: { duration: Range; pose: Pose };
  /** 실제 확인 (뒤돌아봄) */
  look: {
    duration: Range;
    pose: Pose;
    range: number;
    halfAngleDeg: number;
    nearRadius: number;
    /**
     * nearRadius 판정 범위. 'all' = 사방 (돌아볼 때 바짝 붙어 있으면 무조건 보임),
     * 'front' = 돌아본 쪽 절반만 (원래 얼굴 쪽은 돌아보면 등 뒤가 되니 안 보임. 서서 다니는 대상용)
     */
    nearArc: 'all' | 'front';
    /** 어느 쪽 어깨 너머로 돌아볼지 비중 (화면 기준 왼쪽·가운데·오른쪽) */
    sideWeights: { left: number; center: number; right: number };
    /** 어깨 너머로 볼 때 부채꼴이 치우치는 각도 */
    skewDeg: number;
  };
  /** 업무 복귀 */
  back: { duration: Range; pose: Pose; posePuzzled: Pose };
  /** 들켰을 때 반응 */
  react: { duration: Range; pose: Pose };

  /** 페이크 확률 (0~1). 콕 찔려서 짜증난 상태면 낮아진다 */
  fakeChance: number;
  fakeChanceIrritated: number;
  maxConsecutiveFakes: number;

  /** 업무가 끝났을 때 의심 대신 방심 행동(휴대폰 떨어뜨리기 등)을 할 확률 */
  distracted: { chance: number; duration: Range; pose: Pose; startBubble: string; scoreMultiplier: number };

  /** 자리 비우기 (탕비실 다녀오기) */
  trip: {
    interval: Range;
    stay: Range;
    speed: number;
    /** 자리에서 목적지까지 경로. 돌아올 땐 거꾸로 */
    path: Point[];
    /** 목적지가 여러 곳이면: 갈 때마다 비중대로 하나 (path·stayFacing 대신). 돌아올 땐 같은 길을 거꾸로 */
    routes?: { name: string; weight: number; path: Point[]; stayFacing: Facing }[];
    /** 목적지에 서 있는 동안에도 업무처럼 의심 → 확인을 한다 (과장: 서서 통화) */
    checksWhileAway?: boolean;
    /** 목적지를 떠나기 전 통화 종료 인사 → 곧바로 돌아봄. 인사말이 1단계 전조, 그 뒤 진짜 전조로 반응 시간을 준다 */
    hangup?: { chance: number; line: string; duration: Range };
    stayFacing: Facing;
    walkPose: Pose;
    stayPose: Pose;
  };

  /** false면 걷는 동안엔 콕을 못 한다 (멈춰 섰을 때만). 기본 true */
  pokeWhileWalking?: boolean;
  /** 업무 중 콕 찔리면 업무 타이머가 이 배율로 빨리 줄어든다 (뭔가 느낌) */
  pokeSpeedup: number;
  /** 자리 밖에서 이만큼(초) 찔리면 바로 의심을 시작한다 */
  alertToSuspect: number;
}

/** 방해 NPC 순찰 패턴. 자리 ↔ 목적지 왕복. 걸어 다니는 동안 바닥에 시야 부채꼴을 보여준다. */
export interface PatrolPattern {
  id: string;
  name: string;
  appearance: NpcLook;
  /** 자리에서 일하는 시간 (이 동안은 시야 없음) */
  work: { duration: Range; pose: Pose };
  /** 자리에서 목적지까지 경로들. 갈 때마다 비중대로 하나를 고르고, 돌아올 땐 같은 길을 거꾸로 */
  routes: { name: string; weight: number; path: Point[] }[];
  speed: number;
  walkPose: Pose;
  /** 목적지에서 머무는 시간·방향·자세 */
  stay: { duration: Range; facing: Facing; pose: Pose };
  /** 바닥 시야 부채꼴 색 */
  coneColor: number;
  /** 시야 (걷거나 서 있을 때만) */
  vision: { range: number; halfAngleDeg: number; nearRadius: number };
  /** 플레이어를 발견했을 때 */
  react: { duration: Range; pose: Pose };
  /** 지나가다 플레이어를 붙잡기 ("커피 좀 사 올래?") */
  grab?: { chance: number; radius: number; seconds: number; cooldown: number; line: string; thanks: string };
  /** 빈손인 플레이어가 시야에 들어오면 잠깐 세운다 ("뭐 해요?"). cooldown은 풀려난 뒤부터 */
  stop?: { seconds: number; cooldown: number; line: string };
}
