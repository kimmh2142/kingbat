import { TEX } from '../assets/keys';
import type { Facing, NpcLook, Point, Pose, Range } from '../npc/types';

// 회색 엑스트라 직원 (배경 인물). 들킴·점수와는 관계없고, 사무실을 채우고 통로를 막는다.
// 수치는 초기값이며 플레이 테스트로 조정한다.

export const EXTRA_RULES = {
  /** 처음 자리에 앉아 있는 사람 수 */
  seated: 7,
  /** 처음 돌아다니는 사람 수 */
  walking: 2,
  /** 동시에 돌아다니는 최대 인원 */
  maxWalking: 3,
  /** 앉아 있다가 일어나기까지 (초) */
  sitTime: [20, 45] as Range,
  /** 목적지에서 머무는 시간 (초) */
  stayTime: [3, 6] as Range,
  /** 걷는 속도 (px/초). 대리(95)보다 살짝 느리게 */
  speed: 80,
  /** 앞에 플레이어가 이 거리(px) 안에 있으면 멈춰 기다린다 */
  blockDistance: 44,
  /** 막힌 채 이 시간(초)이 지나면 한 번 더 말한다 */
  nagAfter: 2.5,
  /** 앉은 자리에서 하는 일 바꾸는 간격 (초) */
  activityTime: [4, 9] as Range,
  lines: { blocked: '앗, 실례~', nag: '저기요~' },
};

/** 진하기 3단계 (색 곱하기) */
export const EXTRA_TINTS = [0xffffff, 0xe6e6ea, 0xcfcdd4];

/** 머리 3종. 몸은 공용 */
export const EXTRA_LOOKS: NpcLook[] = [
  [TEX.extraHeadA, TEX.extraHeadABack],
  [TEX.extraHeadB, TEX.extraHeadBBack],
  [TEX.extraHeadC, TEX.extraHeadCBack],
].map(([front, back]) => ({
  body: TEX.extraBody,
  bodyBack: TEX.extraBodyBack,
  headFront: front,
  headBack: back,
  hand: TEX.extraHand,
  rank: '',
  rankColor: 0,
}));

/** 앉아서 하는 일 (비중) */
export const EXTRA_SEATED: { pose: Pose; weight: number }[] = [
  { pose: { face: TEX.faceNormal, hands: 'keyboard', typing: 0.9 }, weight: 5 },
  { pose: { face: TEX.facePhone, hands: 'phone' }, weight: 2 },
  { pose: { face: TEX.faceSleepy, hands: 'keyboard', typing: 0, nod: true }, weight: 1 },
  { pose: { face: TEX.faceHappy, hands: 'cup' }, weight: 2 },
];

export const EXTRA_WALK_POSE: Pose = { face: TEX.faceNormal, hands: 'side' };

/** 들르는 곳 */
export const EXTRA_PLACES: { id: string; at: Point; facing: Facing; pose: Pose }[] = [
  { id: 'pantry', at: { x: 330, y: 300 }, facing: 'up', pose: { face: TEX.faceHappy, hands: 'cup' } },
  { id: 'toilet', at: { x: 150, y: 640 }, facing: 'up', pose: { face: TEX.faceNormal, hands: 'side' } },
  { id: 'elevator', at: { x: 230, y: 1080 }, facing: 'up', pose: { face: TEX.facePhone, hands: 'phone' } },
  { id: 'printer', at: { x: 1610, y: 1300 }, facing: 'down', pose: { face: TEX.faceNormal, hands: 'side' } },
];

/**
 * 걸어다니는 통로 (책상·소품을 피해 그은 선). 선 위의 점은 자동으로 이어진다.
 * 가로: 맨 위(동기 줄 뒤), 1·2줄 사이, 2·3줄 사이, 맨 아래. 세로: 왼쪽, 가운데 두 줄, 오른쪽.
 * x 1300 세로 통로는 화분 숨기 자리(1268, 420)를 살짝 비켜 간다.
 */
export const AISLES = {
  rows: [215, 500, 830, 1150],
  rowX: [570, 1610] as const,
  cols: [570, 908, 1300, 1610],
  colY: [215, 1150] as const,
};

/** 통로 밖으로 이어지는 길 (탕비실 문, 화장실 앞 복도, 출입구, 프린터) */
export const EXTRA_LINKS: [Point, Point][] = [
  [{ x: 570, y: 340 }, { x: 420, y: 340 }],
  [{ x: 420, y: 340 }, { x: 330, y: 300 }],
  [{ x: 570, y: 700 }, { x: 420, y: 720 }],
  [{ x: 420, y: 720 }, { x: 150, y: 640 }],
  [{ x: 570, y: 1150 }, { x: 380, y: 1150 }],
  [{ x: 380, y: 1150 }, { x: 230, y: 1080 }],
  [{ x: 1610, y: 1150 }, { x: 1610, y: 1300 }],
];
