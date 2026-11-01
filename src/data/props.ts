import { TEX, type TextureKey } from '../assets/keys';

// 소품 종류별 그림과 충돌 영역.
// 소품 위치(x, y)는 "바닥에 닿는 아래쪽 가운데"다. 충돌 영역은 그 기준점에서 위로 h만큼.
// 그림이 충돌 영역보다 위로 높게 그려지므로, 소품 뒤(위쪽)로 지나가면 소품에 가려진다.

export type PropType =
  | 'desk'
  | 'plant'
  | 'partition'
  | 'papers'
  | 'printer'
  | 'counter'
  | 'coffee'
  | 'water'
  | 'fridge'
  | 'snackTable'
  | 'meetingTable'
  | 'bossDesk';

export interface PropDef {
  texture: TextureKey;
  /** 충돌 영역 크기. 없으면 지나갈 수 있다. */
  collider?: { w: number; h: number };
  /** 근처에서 Shift로 숨을 수 있는 소품 */
  hide?: boolean;
}

export const PROP_DEFS: Record<PropType, PropDef> = {
  desk: { texture: TEX.desk, collider: { w: 128, h: 56 } },
  plant: { texture: TEX.plantBig, collider: { w: 34, h: 20 }, hide: true },
  partition: { texture: TEX.partition, collider: { w: 112, h: 18 }, hide: true },
  papers: { texture: TEX.paperPile, collider: { w: 44, h: 20 }, hide: true },
  printer: { texture: TEX.printer, collider: { w: 80, h: 44 } },
  counter: { texture: TEX.counter, collider: { w: 200, h: 50 } },
  coffee: { texture: TEX.coffeeMachine },
  water: { texture: TEX.water, collider: { w: 40, h: 30 } },
  fridge: { texture: TEX.fridge, collider: { w: 64, h: 40 }, hide: true },
  snackTable: { texture: TEX.snackTable, collider: { w: 120, h: 34 } },
  meetingTable: { texture: TEX.meetingTable, collider: { w: 216, h: 70 } },
  bossDesk: { texture: TEX.bossDesk, collider: { w: 176, h: 60 } },
};

/** 숨기 판정 반경 (소품 기준점에서) */
export const HIDE_RADIUS = 64;
