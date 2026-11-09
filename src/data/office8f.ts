import { TEX } from '../assets/keys';
import type { ItemSpawnSpot } from './items';
import type { Desk, FloorMap, PropPlacement, Rect, Room, WallDecor } from './office7f';

// 8층 임원층 맵 (STAGE 3). 좌표 단위는 px, 원점은 왼쪽 위. 크기는 7층과 같다.
// 왼쪽 줄: 임원 라운지 · 복도 · 엘리베이터 홀(시작, 보고 대기석)
// 가운데: 이사석 열린 공간, 대표실 문 앞에 비서 데스크
// 오른쪽 위: 대표실 (문은 왼쪽 벽 하나, 비서 쪽), 오른쪽 아래: 배전반 복도 (아래쪽으로만 들어간다)

const WORLD = { width: 2400, height: 1440 };

/** 대표실 문 (왼쪽 벽 x = 1500, 이 y 구간이 뚫려 있다) */
export const CEO_DOOR = { x: 1512, y1: 420, y2: 540 };

const WALLS: Rect[] = [
  // 바깥 벽
  { x: 0, y: 0, w: WORLD.width, h: 104 },
  { x: 0, y: 0, w: 24, h: WORLD.height },
  { x: WORLD.width - 24, y: 0, w: 24, h: WORLD.height },
  { x: 0, y: WORLD.height - 24, w: WORLD.width, h: 24 },
  // 라운지 오른쪽 벽 (문 282~402), 아래 벽 (문 300~420): 7층 탕비실과 같은 모양
  { x: 480, y: 104, w: 24, h: 178 },
  { x: 480, y: 402, w: 24, h: 142 },
  { x: 24, y: 520, w: 276, h: 24 },
  { x: 420, y: 520, w: 60, h: 24 },
  // 복도와 엘리베이터 홀 사이 벽 (오른쪽이 트여 있음)
  { x: 24, y: 900, w: 280, h: 24 },
  // 대표실 왼쪽 벽 (문 420~540)
  { x: 1500, y: 104, w: 24, h: CEO_DOOR.y1 - 104 },
  { x: 1500, y: CEO_DOOR.y2, w: 24, h: 900 - CEO_DOOR.y2 },
  // 대표실 아래 벽 = 배전반 복도 위 벽
  { x: 1500, y: 900, w: 876, h: 24 },
  // 배전반 복도 왼쪽 벽 (아래쪽 1200~1416만 트여 있다: 비서 데스크에서 먼 쪽으로 돌아 들어간다)
  { x: 1500, y: 924, w: 24, h: 276 },
];

const ROOMS: Room[] = [
  { id: 'lounge', name: '임원 라운지', floor: TEX.floorPantry, x: 24, y: 104, w: 480, h: 416, sign: { x: 252, y: 60 } },
  { id: 'execHall', name: '복도', floor: TEX.floorHall, x: 24, y: 520, w: 480, h: 380, sign: { x: 340, y: 600 } },
  { id: 'lobby', name: '엘리베이터 홀', floor: TEX.floorHall, x: 24, y: 900, w: 480, h: 516, sign: { x: 340, y: 1000 } },
  { id: 'exec', name: '이사석', floor: TEX.floorOffice, x: 504, y: 104, w: 996, h: 1312, sign: { x: 1000, y: 140 } },
  { id: 'ceo', name: '대표실', floor: TEX.floorCarpet, x: 1500, y: 104, w: 876, h: 820, sign: { x: 1940, y: 140 } },
  { id: 'power', name: '배전반 복도', floor: TEX.floorHall, x: 1500, y: 924, w: 876, h: 492, sign: { x: 1940, y: 960 } },
];

const DESKS: Desk[] = [
  // 보고 대기석: 엘리베이터 홀. 여기 앉아 E = 확정 (8층엔 내 자리가 없다)
  { id: 'desk-wait', x: 300, y: 1340, owner: 'me' },
  // 이사석 (이사 엄감시는 나중에 owner 'isa' 자리에 앉힌다)
  { id: 'desk-exec-0', x: 760, y: 420 },
  { id: 'desk-exec-1', x: 1040, y: 420, owner: 'isa' },
  { id: 'desk-exec-2', x: 760, y: 980 },
  { id: 'desk-exec-3', x: 1040, y: 980 },
  // 비서 데스크: 대표실 문 바로 앞 (의자 1330, 578)
  { id: 'desk-biseo', x: 1330, y: 640, owner: 'biseo' },
  // 대표 책상: 창가, 문 쪽(아래)을 보고 앉는다. 등 뒤(창문 쪽)로 몰래 다가갈 수 있다 (의자 1940, 398)
  { id: 'desk-daepyo', x: 1940, y: 460, owner: 'daepyo', boss: true },
];

const PROPS: PropPlacement[] = [
  // 임원 라운지
  { type: 'counter', x: 170, y: 190 },
  { type: 'coffee', x: 120, y: 152 },
  { type: 'water', x: 320, y: 196 },
  { type: 'fridge', x: 420, y: 214 },
  { type: 'snackTable', x: 240, y: 400 },
  // 복도·엘리베이터 홀
  { type: 'plant', x: 450, y: 640 },
  { type: 'plant', x: 450, y: 1010 },
  { type: 'plant', x: 70, y: 1400 },
  // 이사석: 칸막이·화분 숨기 장소
  { type: 'plant', x: 545, y: 200 },
  { type: 'partition', x: 900, y: 640 },
  { type: 'partition', x: 900, y: 1200 },
  { type: 'plant', x: 1200, y: 300 },
  { type: 'papers', x: 1200, y: 800 },
  { type: 'printer', x: 1420, y: 1380 },
  { type: 'plant', x: 1440, y: 200 },
  // 대표실: 문 안쪽 화분, 창가 구석 화분 (대표 등 뒤 쪽)
  { type: 'plant', x: 1580, y: 860 },
  { type: 'plant', x: 2320, y: 260 },
  { type: 'plant', x: 1580, y: 220 },
  { type: 'meetingTable', x: 2150, y: 820 },
  // 배전반 복도: 상자 더미(숨기)와 맨 끝 배전반
  { type: 'papers', x: 1700, y: 1300 },
  { type: 'partition', x: 2000, y: 1100 },
  { type: 'powerPanel', x: 2310, y: 1070 },
];

const WALL_DECOR: WallDecor[] = [
  { texture: TEX.toiletDoor, x: 90, y: 566, label: '화장실' },
  { texture: TEX.toiletDoor, x: 200, y: 566, label: '화장실' },
  { texture: TEX.elevator, x: 164, y: 984, label: '엘리베이터' },
];

const ITEM_SPAWNS: ItemSpawnSpot[] = [
  { id: 'parcel', name: '엘리베이터 앞 택배 상자', x: 360, y: 1180, prop: TEX.parcel },
  { id: 'drawer-a', name: '빈 이사석 서랍(위)', x: 760, y: 500 },
  { id: 'drawer-b', name: '빈 이사석 서랍(아래)', x: 1040, y: 1060 },
  { id: 'shelf', name: '라운지 선반', x: 170, y: 216 },
];

export const FLOOR_8F: FloorMap = {
  id: '8f',
  world: WORLD,
  walls: WALLS,
  barriers: [],
  rooms: ROOMS,
  subRoomLabels: [],
  desks: DESKS,
  props: PROPS,
  wallDecor: WALL_DECOR,
  playerStart: { x: 300, y: 1240 },
  windows: { from: 540, tile: { x: 24, w: 456, color: 0xd6efe2 } },
  mySeatLabel: '보고 대기석',
  noSign: [],
  itemSpawns: ITEM_SPAWNS,
  extras: false,
};
