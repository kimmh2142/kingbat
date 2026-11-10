import Phaser from 'phaser';
import { ITEM_RULES, ITEM_SPAWNS, ITEMS, type ItemId, type ItemSpawnSpot } from '../data/items';
import type { Range } from '../npc/types';
import type { Player } from '../player/Player';
import { popWord } from '../ui/Popups';
import { DEPTH } from './OfficeMap';

const rand = (r: Range) => Phaser.Math.FloatBetween(r[0], r[1]);

export interface MapItem {
  spot: ItemSpawnSpot;
  id: ItemId;
  icon: Phaser.GameObjects.Image;
  sparkle: Phaser.GameObjects.Text;
  /** 바닥에 깔린 노란 빛 */
  glow: Phaser.GameObjects.Ellipse;
  t: number;
}

/**
 * 맵에서 줍는 아이템 (크레이지아케이드식).
 * - 생성 지점 중 빈 곳에 생기고, 걸어서 닿으면 슬롯에 들어간다.
 * - 하나를 주우면 respawn초 뒤 방금 주운 곳이 아닌 다른 곳에 새로 생긴다.
 * - 슬롯 3칸, 1/2/3으로 고르거나 X로 다음 칸(아이템 있는 칸)으로 넘긴다. 쓰는 건 Pranks가 한다.
 * 이벤트: 'change'(슬롯), 'spawned'(MapItem), 'picked'(id, 슬롯 번호, 월드 x, y)
 */
export class Items extends Phaser.Events.EventEmitter {
  readonly slots: (ItemId | null)[] = Array(ITEM_RULES.slots).fill(null);
  selected = 0;
  readonly onMap: MapItem[] = [];
  /** 다음에 생길 때까지 남은 시간들 */
  readonly pending: number[] = [];
  /** 마지막으로 주운 곳 (바로 같은 곳에 다시 안 생기게) */
  private lastPicked?: ItemSpawnSpot;
  /** 슬롯이 꽉 차서 못 줍는다고 알린 아이템 (같은 걸 계속 알리지 않게) */
  private fullWarned?: MapItem;
  /** 이번 판에 하나라도 주웠는가 (첫 아이템 안내용) */
  pickedAny = false;
  /** 아직 첫 아이템을 안 만들었다 (첫 아이템은 정해진 곳에 정해진 것) */
  private firstPending = true;

  constructor(
    private readonly scene: Phaser.Scene,
    /** 이 층에서 아이템이 나오는 곳 */
    private readonly spawns: ItemSpawnSpot[] = ITEM_SPAWNS,
    /** 이 스테이지에 나오는 아이템 */
    private readonly pool: ItemId[] = Object.keys(ITEMS) as ItemId[],
  ) {
    super();
    for (const r of ITEM_RULES.firstSpawn.slice(0, ITEM_RULES.maxOnMap)) this.pending.push(rand(r));
    for (const s of spawns) {
      if (s.prop) scene.add.image(s.x, s.y - 10, s.prop).setOrigin(0.5, 1).setDepth(s.y - 10);
    }
  }

  /** 지금 고른 슬롯의 아이템 */
  get selectedItem(): ItemId | null {
    return this.slots[this.selected];
  }

  select(index: number): void {
    if (index < 0 || index >= this.slots.length) return;
    this.selected = index;
    this.emit('change');
  }

  /** 다음 아이템이 있는 칸으로 넘긴다 (빈 칸은 건너뛰고 1 → 2 → 3 → 1). 아이템이 없으면 그대로 */
  cycle(): void {
    const n = this.slots.length;
    for (let d = 1; d <= n; d++) {
      const i = (this.selected + d) % n;
      if (this.slots[i]) {
        this.select(i);
        return;
      }
    }
  }

  /** 고른 슬롯의 아이템을 다 썼을 때 */
  consumeSelected(): void {
    this.slots[this.selected] = null;
    this.emit('change');
  }

  /** 개발 테스트용: 빈 슬롯에 바로 넣기 */
  give(id: ItemId): boolean {
    const i = this.slots.indexOf(null);
    if (i < 0) return false;
    this.slots[i] = id;
    if (!this.slots[this.selected]) this.selected = i;
    this.emit('change');
    return true;
  }

  update(dt: number, player: Player): void {
    // 생성 대기
    for (let i = this.pending.length - 1; i >= 0; i--) {
      this.pending[i] -= dt;
      if (this.pending[i] <= 0 && this.spawn()) this.pending.splice(i, 1);
    }

    for (const m of [...this.onMap]) {
      m.t += dt;
      // 둥실둥실 + 반짝
      m.icon.y = m.spot.y - 26 + Math.sin(m.t * 3) * 7;
      m.sparkle.setPosition(m.spot.x + 18, m.icon.y - 20).setAlpha(0.5 + Math.abs(Math.sin(m.t * 4)) * 0.5);
      m.glow.setScale(1 + Math.sin(m.t * 3) * 0.12).setAlpha(0.45 + Math.abs(Math.sin(m.t * 2)) * 0.3);
      const d = Phaser.Math.Distance.Between(player.x, player.y, m.spot.x, m.spot.y);
      if (d > ITEM_RULES.pickupRadius) {
        if (this.fullWarned === m && d > ITEM_RULES.pickupRadius * 2) this.fullWarned = undefined;
        continue;
      }
      if (!this.pickUp(m) && this.fullWarned !== m) {
        this.fullWarned = m;
        popWord(this.scene, player.x, player.y - 110, '슬롯이 꽉 찼어!', { color: '#5a3a4a', size: 18 });
      }
    }
  }

  private pickUp(m: MapItem): boolean {
    const i = this.slots.indexOf(null);
    if (i < 0) return false;
    this.slots[i] = m.id;
    // 아무것도 안 고른 칸을 보고 있었다면 방금 주운 칸으로
    if (!this.slots[this.selected]) this.selected = i;
    this.onMap.splice(this.onMap.indexOf(m), 1);
    m.icon.destroy();
    m.sparkle.destroy();
    m.glow.destroy();
    this.lastPicked = m.spot;
    this.pickedAny = true;
    this.pending.push(rand(ITEM_RULES.respawn));
    popWord(this.scene, m.spot.x, m.spot.y - 60, `${ITEMS[m.id].name} 획득!`, { color: '#f9a825', size: 22 });
    this.emit('change');
    this.emit('picked', m.id, i, m.spot.x, m.icon.y);
    return true;
  }

  /** 빈 생성 지점 하나에 아이템을 만든다. 빈 곳이 없으면 false (조금 뒤 다시 시도) */
  private spawn(): boolean {
    if (this.onMap.length >= ITEM_RULES.maxOnMap) return false;
    const used = new Set(this.onMap.map((m) => m.spot));
    let free = this.spawns.filter((s) => !used.has(s) && s !== this.lastPicked);
    if (!free.length) free = this.spawns.filter((s) => !used.has(s));
    if (!free.length) return false;
    let spot: ItemSpawnSpot = Phaser.Utils.Array.GetRandom(free);
    let id: ItemId;
    const first = this.spawns.find((s) => s.id === ITEM_RULES.firstItem.spot);
    if (this.firstPending && first && !used.has(first)) {
      spot = first;
      id = ITEM_RULES.firstItem.id;
    } else {
      id = this.pickType(spot);
    }
    this.firstPending = false;
    const glow = this.scene.add.ellipse(spot.x, spot.y, 64, 24, 0xfff176, 0.6).setStrokeStyle(2, 0xf9a825, 0.8).setDepth(DEPTH.floor + 5);
    const icon = this.scene.add.image(spot.x, spot.y - 26, ITEMS[id].icon).setDepth(spot.y);
    const sparkle = this.scene.add
      .text(spot.x, spot.y, '✦', { fontSize: '22px', color: '#fff59d', stroke: '#5a3a4a', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(spot.y + 0.1);
    icon.setScale(0.2);
    this.scene.tweens.add({ targets: icon, scale: 1, duration: 260, ease: 'Back.Out' });
    const m: MapItem = { spot, id, icon, sparkle, glow, t: 0 };
    this.onMap.push(m);
    this.emit('spawned', m);
    return true;
  }

  /** 그 자리에 나올 수 있는 것 중 맵과 슬롯에 적은 종류를 우선 (한 종류만 계속 나오지 않게) */
  private pickType(spot: ItemSpawnSpot): ItemId {
    const all = this.pool;
    const allowed = all.filter((id) => !spot.not?.includes(id));
    const ids = allowed.length ? allowed : all;
    const count = (id: ItemId) => this.onMap.filter((m) => m.id === id).length + this.slots.filter((s) => s === id).length;
    const min = Math.min(...ids.map(count));
    return Phaser.Utils.Array.GetRandom(ids.filter((id) => count(id) === min));
  }
}
