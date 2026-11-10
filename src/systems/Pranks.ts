import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { FONT } from '../config';
import { ITEM_RULES, ITEMS, type ItemId } from '../data/items';
import { POKE } from '../data/tuning';
import type { Range } from '../npc/types';
import type { TargetController } from '../npc/TargetController';
import type { Player } from '../player/Player';
import { popWord } from '../ui/Popups';
import type { Items } from './Items';
import type { Score } from './Score';

const rand = (r: Range) => Phaser.Math.FloatBetween(r[0], r[1]);

/**
 * 아이템 장난 (Lv1 포스트잇·껌).
 * - 고른 아이템을 F(모바일 [아이템])로 쓴다. 붙이는 동안(useSeconds)은 움직일 수 없고, 보이면 들킨다.
 * - 점수는 임시가 아니라 바로 확정된다 (붙이는 동안 들키는 위험이 대가).
 * - 포스트잇: 동기 등 뒤에서. 붙으면 바로 점수. 동기가 탕비실에 도착해 알아챌 때까지 붙어 있다.
 *   붙인 채로 탕비실에 도착하면 'parade' (특별 미션 "월급루팡 퍼레이드" 성공).
 * - 껌: 동기가 자리를 비웠을 때 가방 손잡이에. 점수는 동기가 돌아와 가방을 만질 때 들어온다.
 * - Lv2 모니터 끄기(책상 앞)·의자 최저(의자 옆): 껌처럼 자리를 비웠을 때 해 두고, 돌아와 앉을 때 반응 + 점수.
 * - 연타 방지: 붙어 있는 동안은 같은 장난을 다시 못 한다.
 */
export class Pranks extends Phaser.Events.EventEmitter {
  /** 지금 붙이는 중인 아이템 */
  action: { id: ItemId; t: number } | null = null;
  postitOn = false;
  gumOnBag = false;
  monitorOff = false;
  chairLow = false;
  readonly bag: { x: number; y: number };
  /** 대상 책상 앞 (모니터 끄는 자리) */
  private readonly deskFront: { x: number; y: number };
  private readonly gumView: Phaser.GameObjects.Image;
  private readonly offView: Phaser.GameObjects.Container;
  private readonly lowView: Phaser.GameObjects.Text;
  private laughT = 0;
  /** "킥킥"을 띄울 사람 (대상 근처 엑스트라). 없으면 대상 주변 아무 데나 */
  laughFrom: (x: number, y: number) => { x: number; y: number } | null = () => null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly score: Score,
    private readonly items: Items,
    private readonly target: TargetController,
  ) {
    super();
    // 동기 의자 오른쪽 바닥에 놓인 가방
    this.bag = { x: target.seat.x + 46, y: target.seat.y + 2 };
    scene.add.image(this.bag.x, this.bag.y, TEX.dongiBag).setOrigin(0.5, 1).setDepth(this.bag.y);
    this.gumView = scene.add.image(this.bag.x, this.bag.y - 34, TEX.gumBlob).setDepth(this.bag.y + 0.1).setVisible(false);
    // 책상 = 의자 + 62. 모니터는 책상 위 왼쪽(x - 18), 우리 쪽에선 모니터 뒷면이 보인다
    const deskY = target.seat.y + 62;
    this.deskFront = { x: target.seat.x, y: deskY + 30 };
    const plug = scene.add.text(0, 0, '🔌', { fontSize: '16px' }).setOrigin(0.5);
    const off = scene.add.text(0, -20, 'OFF', { fontFamily: FONT, fontSize: '13px', color: '#ffffff', backgroundColor: '#e53935', padding: { x: 4, y: 1 } }).setOrigin(0.5);
    this.offView = scene.add.container(target.seat.x - 18, deskY - 52, [plug, off]).setDepth(deskY + 0.2).setVisible(false);
    // 바닥까지 내린 의자 표시
    this.lowView = scene.add
      .text(target.seat.x + 22, target.seat.y - 30, '▼', { fontFamily: FONT, fontSize: '18px', color: '#42a5f5', stroke: '#ffffff', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(target.seat.y + 1)
      .setVisible(false);
    target.onArrive = () => this.noticePostit();
    target.onSeatedBack = () => this.touchBag();
  }

  /** 붙이는 중 (움직일 수 없고, 보이면 들킨다) */
  get active(): boolean {
    return this.action !== null;
  }

  /** 붙이는 진행률 0~1 */
  get progress(): number {
    return this.action ? Math.min(1, this.action.t / ITEMS[this.action.id].useSeconds) : 0;
  }

  /** 고른 아이템을 지금 이 자리에서 쓸 수 있는가. 못 쓰면 이유 */
  check(x: number, y: number): { ok: true } | { ok: false; why: string } {
    const id = this.items.selectedItem;
    if (!id) return { ok: false, why: '아이템이 없어!' };
    const rank = this.target.pattern.appearance.rank;
    if (id === 'postit') {
      if (this.postitOn) return { ok: false, why: '이미 붙어 있어!' };
      return this.target.pokeCheck(x, y, POKE.range) === 'ok' ? { ok: true } : { ok: false, why: `${rank} 등 뒤에서 붙이자!` };
    }
    if (id === 'monitor') {
      if (Phaser.Math.Distance.Between(x, y, this.deskFront.x, this.deskFront.y) > ITEM_RULES.monitorRange) return { ok: false, why: `${rank} 책상 앞에서!` };
      if (this.monitorOff) return { ok: false, why: '이미 껐어!' };
    } else if (id === 'chair') {
      if (Phaser.Math.Distance.Between(x, y, this.target.seat.x, this.target.seat.y) > ITEM_RULES.chairRange) return { ok: false, why: `${rank} 의자 옆에서!` };
      if (this.chairLow) return { ok: false, why: '이미 내렸어!' };
    } else {
      if (Phaser.Math.Distance.Between(x, y, this.bag.x, this.bag.y) > ITEM_RULES.gumRange) {
        return { ok: false, why: `${rank} 가방 근처에서!` };
      }
      if (this.gumOnBag) return { ok: false, why: '이미 붙였어!' };
    }
    if (!this.ownerAway) return { ok: false, why: `${rank}가 자리를 비웠을 때!` };
    return { ok: true };
  }

  /** F / [아이템]: 쓸 수 있으면 붙이기 시작 */
  tryUse(player: Player): boolean {
    if (this.action) return false;
    const c = this.check(player.x, player.y);
    if (!c.ok) {
      popWord(this.scene, player.x, player.y - 110, c.why, { color: '#5a3a4a', size: 18 });
      return false;
    }
    this.action = { id: this.items.selectedItem!, t: 0 };
    return true;
  }

  /** 들켰을 때: 붙이던 건 멈춘다 (아이템은 남는다) */
  cancel(): void {
    this.action = null;
  }

  update(dt: number, player: Player): void {
    if (this.action) {
      this.action.t += dt;
      if (this.action.t >= ITEMS[this.action.id].useSeconds) this.finish(player);
    }
    // 포스트잇이 붙어 있으면 주변 직원이 킥킥
    if (this.postitOn) {
      this.laughT -= dt;
      if (this.laughT <= 0) {
        // 걸어가는 동안(퍼레이드)은 지나가는 직원들이 더 자주 웃는다
        this.laughT = rand(this.target.awayFromSeat ? ITEM_RULES.laughEveryWalking : ITEM_RULES.laughEvery);
        const a = Math.random() * Math.PI * 2;
        const who = this.laughFrom(this.target.x, this.target.y);
        const lx = who ? who.x : this.target.x + Math.cos(a) * 120;
        const ly = who ? who.y - 100 : this.target.y - 40 + Math.sin(a) * 60;
        popWord(this.scene, lx, ly, '킥킥', {
          color: '#8d7f99',
          size: 18,
        });
      }
    }
    this.gumView.setVisible(this.gumOnBag);
    this.offView.setVisible(this.monitorOff);
    this.lowView.setVisible(this.chairLow);
  }

  private get ownerAway(): boolean {
    const t = this.target;
    return t.awayFromSeat && Phaser.Math.Distance.Between(t.x, t.y, this.bag.x, this.bag.y) >= ITEM_RULES.gumOwnerAway;
  }

  private finish(player: Player): void {
    const id = this.action!.id;
    this.action = null;
    // 붙이는 동안 상황이 바뀌었으면 (동기가 걸어가 버림 등) 실패, 아이템은 남는다
    if (!this.check(player.x, player.y).ok) {
      popWord(this.scene, player.x, player.y - 110, '놓쳤다!', { color: '#5a3a4a', size: 20 });
      return;
    }
    this.items.consumeSelected();
    const def = ITEMS[id];
    if (id === 'postit') {
      this.postitOn = true;
      this.laughT = 1;
      this.target.view.setBackNote(true);
      this.target.view.jolt();
      this.score.addConfirmed(def.points);
      popWord(this.scene, this.target.x, this.target.y - 50, `착! +${def.points}`, { size: 28 });
    } else if (id === 'monitor') {
      this.monitorOff = true;
      popWord(this.scene, this.deskFront.x - 18, this.deskFront.y - 110, '딸깍!', { color: '#5a3a4a', size: 24 });
    } else if (id === 'chair') {
      this.chairLow = true;
      popWord(this.scene, this.target.seat.x, this.target.seat.y - 50, '끼이익—', { color: '#42a5f5', size: 22 });
    } else {
      this.gumOnBag = true;
      popWord(this.scene, this.bag.x, this.bag.y - 50, '쪽!', { color: '#ec407a', size: 24 });
    }
    this.emit('used', id);
  }

  /** 탕비실에 도착하면 등에 붙은 포스트잇을 알아채고 뗀다 */
  private noticePostit(): void {
    if (!this.postitOn) return;
    this.postitOn = false;
    this.target.view.setBackNote(false);
    this.target.view.say('뭐야? 왜 다들 웃어?!', 2.2);
    this.target.view.jolt();
    popWord(this.scene, this.target.x, this.target.y - 60, '휙!', { color: '#5a3a4a', size: 22 });
    this.emit('parade');
  }

  /** 자리로 돌아와 앉는다: 의자 쿵 → 가방 껌 → 꺼진 모니터 순으로 반응 + 점수 (겹치면 차례로) */
  private touchBag(): void {
    let delay = 0;
    const later = (fn: () => void) => {
      this.scene.time.delayedCall(delay, fn);
      delay += 1300;
    };
    if (this.chairLow) {
      this.chairLow = false;
      later(() => {
        this.target.view.say('으악! 의자가 왜 이래?!', 1.8);
        this.target.view.jolt();
        this.scene.cameras.main.shake(160, 0.006);
        popWord(this.scene, this.target.seat.x, this.target.seat.y - 40, `쿵! 푹— +${ITEMS.chair.points}`, { color: '#42a5f5', size: 28 });
        this.score.addConfirmed(ITEMS.chair.points);
      });
    }
    if (this.gumOnBag) {
      this.gumOnBag = false;
      later(() => {
        this.target.view.say('뭐야, 끈적해!', 1.8);
        this.target.view.jolt();
        popWord(this.scene, this.bag.x, this.bag.y - 50, `쭈욱~ +${ITEMS.gum.points}`, { color: '#ec407a', size: 28 });
        this.score.addConfirmed(ITEMS.gum.points);
      });
    }
    if (this.monitorOff) {
      this.monitorOff = false;
      later(() => {
        this.target.view.say('어? 화면이 왜 꺼졌어?!', 1.8);
        this.target.view.jolt();
        popWord(this.scene, this.deskFront.x - 18, this.deskFront.y - 110, `퐁! +${ITEMS.monitor.points}`, { color: '#5a3a4a', size: 28 });
        this.score.addConfirmed(ITEMS.monitor.points);
      });
    }
  }
}
