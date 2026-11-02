import Phaser from 'phaser';
import { ITEM_RULES, ITEM_SPAWNS, ITEMS, type ItemId, type ItemSpawnSpot } from '../data/items';
import type { Range } from '../npc/types';
import type { Player } from '../player/Player';
import { popWord } from '../ui/Popups';

const rand = (r: Range) => Phaser.Math.FloatBetween(r[0], r[1]);

interface MapItem {
  spot: ItemSpawnSpot;
  id: ItemId;
  icon: Phaser.GameObjects.Image;
  sparkle: Phaser.GameObjects.Text;
  t: number;
}

/**
 * 맵에서 줍는 아이템 (크레이지아케이드식).
 * - 생성 지점 중 빈 곳에 생기고, 걸어서 닿으면 슬롯에 들어간다.
 * - 하나를 주우면 respawn초 뒤 방금 주운 곳이 아닌 다른 곳에 새로 생긴다.
 * - 슬롯 3칸, 1/2/3으로 고른다. 쓰는 건 Pranks가 한다.
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

  constructor(private readonly scene: Phaser.Scene) {
    super();
    for (const r of ITEM_RULES.firstSpawn.slice(0, ITEM_RULES.maxOnMap)) this.pending.push(rand(r));
    for (const s of ITEM_SPAWNS) {
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
      m.icon.y = m.spot.y - 22 + Math.sin(m.t * 3) * 5;
      m.sparkle.setPosition(m.spot.x + 16, m.icon.y - 18).setAlpha(0.5 + Math.abs(Math.sin(m.t * 4)) * 0.5);
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
    this.lastPicked = m.spot;
    this.pending.push(rand(ITEM_RULES.respawn));
    popWord(this.scene, m.spot.x, m.spot.y - 60, `${ITEMS[m.id].name} 획득!`, { color: '#f9a825', size: 22 });
    this.emit('change');
    return true;
  }

  /** 빈 생성 지점 하나에 아이템을 만든다. 빈 곳이 없으면 false (조금 뒤 다시 시도) */
  private spawn(): boolean {
    if (this.onMap.length >= ITEM_RULES.maxOnMap) return false;
    const used = new Set(this.onMap.map((m) => m.spot));
    let free = ITEM_SPAWNS.filter((s) => !used.has(s) && s !== this.lastPicked);
    if (!free.length) free = ITEM_SPAWNS.filter((s) => !used.has(s));
    if (!free.length) return false;
    const spot = Phaser.Utils.Array.GetRandom(free);
    const id = this.pickType();
    const icon = this.scene.add.image(spot.x, spot.y - 22, ITEMS[id].icon).setDepth(spot.y);
    const sparkle = this.scene.add
      .text(spot.x, spot.y, '✦', { fontSize: '18px', color: '#fff59d', stroke: '#5a3a4a', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(spot.y + 0.1);
    icon.setScale(0.2);
    this.scene.tweens.add({ targets: icon, scale: 1, duration: 260, ease: 'Back.Out' });
    this.onMap.push({ spot, id, icon, sparkle, t: 0 });
    return true;
  }

  /** 맵과 슬롯에 적은 종류를 우선 (한 종류만 계속 나오지 않게) */
  private pickType(): ItemId {
    const ids = Object.keys(ITEMS) as ItemId[];
    const count = (id: ItemId) => this.onMap.filter((m) => m.id === id).length + this.slots.filter((s) => s === id).length;
    const min = Math.min(...ids.map(count));
    return Phaser.Utils.Array.GetRandom(ids.filter((id) => count(id) === min));
  }
}
