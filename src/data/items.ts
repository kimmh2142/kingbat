import { TEX, type TextureKey } from '../assets/keys';
import type { Range } from '../npc/types';

// 아이템 (기준 문서 2-7). 크레이지아케이드처럼 맵에서 줍고, 슬롯 3칸에 담아 1/2/3으로 골라 F(모바일 [아이템])로 쓴다.
// 장난이 성공하면 점수는 바로 확정된다 (임시 점수 아님).
// 수치는 초기값이며 플레이 테스트로 조정한다.

export type ItemId = 'postit' | 'gum';

export interface ItemDef {
  id: ItemId;
  name: string;
  /** 슬롯·맵에 보이는 아이콘 */
  icon: TextureKey;
  /** 킹받음 (바로 확정) */
  points: number;
  /** 붙이는 데 걸리는 시간(초). 이 동안은 움직일 수 없고, 보이면 들킨다 */
  useSeconds: number;
  /** 쓸 수 있는 곳 근처에서 띄우는 안내 */
  hint: string;
  /** 처음 주웠을 때 한 번 보여주는 사용법. {key}는 PC 'F' / 모바일 '[아이템] 버튼'으로 바뀐다 */
  howTo: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  // 동기 등 뒤에서 붙인다. 동기가 알아챌 때까지 등에 붙어 있고 주변이 킥킥 웃는다.
  postit: { id: 'postit', name: '포스트잇', icon: TEX.itemPostit, points: 15, useSeconds: 0.5, hint: '포스트잇 붙이기', howTo: '포스트잇: 동기 등 뒤에서 {key}! 붙이면 바로 점수' },
  // 동기가 자리를 비웠을 때 가방 손잡이에 붙인다. 점수는 동기가 돌아와 가방을 만질 때 들어온다.
  gum: { id: 'gum', name: '껌', icon: TEX.itemGum, points: 15, useSeconds: 0.6, hint: '가방에 껌 붙이기', howTo: '껌: 동기가 자리 비웠을 때 가방 근처에서 {key}! 돌아와 앉으면 점수' },
};

/** 아이템이 나오는 곳 (택배 상자, 서랍, 탕비실 선반). 좌표는 줍는 위치(바닥) */
export interface ItemSpawnSpot {
  id: string;
  name: string;
  x: number;
  y: number;
  /** 입구 택배 상자처럼 따로 그려 줄 소품 */
  prop?: TextureKey;
}

export const ITEM_SPAWNS: ItemSpawnSpot[] = [
  { id: 'parcel', name: '입구 택배 상자', x: 300, y: 1210, prop: TEX.parcel },
  { id: 'drawer-a', name: '빈 책상 서랍(왼쪽)', x: 812, y: 728 },
  { id: 'drawer-b', name: '빈 책상 서랍(오른쪽)', x: 1404, y: 1068 },
  { id: 'shelf', name: '탕비실 선반', x: 170, y: 216 },
];

export const ITEM_RULES = {
  /** 맵에 동시에 있을 수 있는 아이템 수 */
  maxOnMap: 2,
  /** 하나를 주우면 이 시간(초) 뒤 다른 곳에 새로 생긴다 */
  respawn: [15, 25] as Range,
  /** 판 시작 직후 처음 생기기까지 (두 개가 따로따로) */
  firstSpawn: [[1, 2], [4, 6]] as Range[],
  /** 이 거리(px) 안으로 걸어 들어가면 줍는다 */
  pickupRadius: 38,
  /** 슬롯 칸 수 */
  slots: 3,
  /** 동기 가방에서 이 거리(px) 안이면 껌을 붙일 수 있다 */
  gumRange: 70,
  /** 동기가 가방에서 이만큼(px) 떨어져 있어야 껌을 붙일 수 있다 */
  gumOwnerAway: 160,
  /** 포스트잇이 붙어 있는 동안 주변 직원이 "킥킥" 웃는 간격(초) */
  laughEvery: [2.5, 4] as Range,
};
