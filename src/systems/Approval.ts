import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_WIDTH } from '../config';
import { APPROVAL, ARROW_GLYPH, type Arrow } from '../data/approval';
import type { TargetController } from '../npc/TargetController';
import type { Player } from '../player/Player';
import { popWord } from '../ui/Popups';
import type { TouchControls } from '../ui/TouchControls';
import { type MissionStep, type MissionTask, stepKey } from './MissionTask';
import { DEPTH } from './OfficeMap';

const ARROWS: Arrow[] = ['up', 'down', 'left', 'right'];
const KEYS: Record<Arrow, string[]> = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
};
/** 미니게임 창 (화면 고정 좌표) */
const PANEL = { x: GAME_WIDTH / 2, y: 150, w: 380, h: 150 };
/** 모바일 방향 버튼 (창 아래) */
const BTN = 64;

type Phase = 'onTable' | 'carrying' | 'sorting' | 'done';

/**
 * STAGE 2 특별 미션 "전 직원 칼퇴 승인서".
 * 복사실 가짜 서류를 E로 줍기 → 과장이 자리를 비운 사이 결재 더미 앞에서 E → 화살표 3장을 순서대로 입력.
 * 끼우는 동안(sorting)은 움직일 수 없고, 보이면 들킨다(OfficeScene.checkCaught). 들키면 서류는 복사실로.
 * 성공하면 'done'. 과장이 자리로 돌아와 서류를 발견하고 부장실 옆으로 들고 가면 부장이 폭발한다.
 */
export class Approval extends Phaser.Events.EventEmitter implements MissionTask {
  readonly caughtReason = 'filing';
  readonly walkSeeRange = APPROVAL.walkSeeRange;
  readonly anchor = APPROVAL.pile;
  phase: Phase = 'onTable';
  /** 지금 끼우는 서류 순서와 몇 장째인지 */
  seq: Arrow[] = [];
  index = 0;
  private lock = 0;
  private wasHeld = false;
  /** 성공 뒤 과장이 서류를 들고 가는 연출 단계 */
  private deliver: 'none' | 'waitSeat' | 'walking' = 'none';
  private readonly paperView: Phaser.GameObjects.Image;
  private readonly paperSpark: Phaser.GameObjects.Text;
  private readonly carryView: Phaser.GameObjects.Image;
  private readonly pileTop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly cards: { bg: Phaser.GameObjects.Rectangle; glyph: Phaser.GameObjects.Text }[] = [];
  /** 이번 프레임 터치로 누른 방향 */
  private tapped: Arrow | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly target: TargetController,
    touch: TouchControls,
  ) {
    super();
    const P = APPROVAL;
    // 결재 더미 (과장 책상 위)와 끼운 뒤 맨 위에 보이는 분홍 서류
    scene.add.image(P.pile.x, P.pile.y - 34, TEX.paperPile).setOrigin(0.5, 1).setScale(0.7).setDepth(P.pile.y + 1);
    this.pileTop = scene.add.rectangle(P.pile.x, P.pile.y - 72, 30, 8, 0xf48fb1).setStrokeStyle(2, COLORS.outline).setDepth(P.pile.y + 2).setVisible(false);
    // 복사실 바닥의 가짜 서류 (반짝임)
    this.paperView = scene.add.image(P.paper.x, P.paper.y, TEX.paperPile).setOrigin(0.5, 1).setScale(0.55).setTint(0xffd6e4).setDepth(P.paper.y);
    this.paperSpark = scene.add
      .text(P.paper.x + 16, P.paper.y - 44, '✦', { fontSize: '22px', color: '#fff59d', stroke: '#5a3a4a', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(P.paper.y + 1);
    scene.tweens.add({ targets: this.paperSpark, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    // 들고 다닐 때 머리 옆 서류
    this.carryView = scene.add.image(0, 0, TEX.paperPile).setScale(0.4).setTint(0xffd6e4).setDepth(DEPTH.label + 3).setVisible(false);

    this.panel = this.buildPanel(scene, touch);
  }

  /** 끼우는 중 (움직일 수 없고, 보이면 들킨다) */
  get sorting(): boolean {
    return this.phase === 'sorting';
  }

  get busy(): boolean {
    return this.sorting;
  }

  get carrying(): boolean {
    return this.phase === 'carrying';
  }

  get done(): boolean {
    return this.phase === 'done';
  }

  /** 이 자리에서 E가 이 미션에 쓰이는가 (숨기와 겹치지 않게) */
  wantsE(x: number, y: number): boolean {
    return this.eVerb(x, y) !== null;
  }

  eVerb(x: number, y: number): string | null {
    return this.carrying && this.nearPile(x, y) ? '끼우기' : null;
  }

  /** 안내 문구 (없으면 null) */
  prompt(x: number, y: number, touch: boolean): string | null {
    const e = touch ? `[${this.eVerb(x, y) ?? '숨기'}]` : 'E';
    if (this.carrying && this.nearPile(x, y)) return this.target.awayFromSeat ? `${e}: 결재 더미에 끼우기` : APPROVAL.lines.needAway;
    return null;
  }

  step(touch: boolean): MissionStep | null {
    const S = APPROVAL.steps;
    const s = (text: string, at: MissionStep['at']) => ({ text: stepKey(text, touch), at, icon: TEX.paperPile });
    if (this.phase === 'onTable') return s(S.pick, APPROVAL.paper);
    if (this.carrying) return this.target.awayFromSeat ? { ...s(S.file, APPROVAL.pile), text: stepKey(S.file, touch, '끼우기') } : s(S.wait, APPROVAL.pile);
    if (this.sorting) return s(S.sort, null);
    return null;
  }

  /**
   * @param eHeld E / [숨기]를 누르고 있는가
   * @param blocked 숨는 중·붙잡힘 등 지금은 못 함
   */
  update(dt: number, eHeld: boolean, blocked: boolean, player: Player, justPressed: (code: string) => boolean): void {
    const pressed = eHeld && !this.wasHeld;
    this.wasHeld = eHeld;
    const { x, y } = player;

    // 가짜 서류는 일반 아이템처럼 지나가면 줍는다 (11/10)
    if (!blocked && this.nearPaper(x, y)) this.pick(player);
    if (pressed && !blocked) {
      if (this.carrying && this.nearPile(x, y)) {
        if (this.target.awayFromSeat) this.startSorting();
        else popWord(this.scene, x, y - 110, APPROVAL.lines.needAway, { color: '#5a3a4a', size: 18 });
      }
    }

    if (this.sorting) {
      this.lock -= dt;
      const input = this.tapped ?? ARROWS.find((a) => KEYS[a].some(justPressed)) ?? null;
      if (input && this.lock <= 0) this.press(input, player);
    }
    this.tapped = null;

    this.carryView.setVisible(this.carrying).setPosition(x + 36, y - 92);
    this.panel.setVisible(this.sorting);
  }

  /** 들켰을 때: 끼우던 중이면 서류는 복사실로 돌아간다 */
  onCaught(): void {
    if (!this.sorting) return;
    this.phase = 'onTable';
    this.paperView.setVisible(true);
    this.paperSpark.setVisible(true);
    this.panel.setVisible(false);
    this.scene.time.delayedCall(1200, () => popWord(this.scene, APPROVAL.paper.x, APPROVAL.paper.y - 60, APPROVAL.lines.backToCopy, { color: '#5a3a4a', size: 18 }));
  }

  /** 결과 화면 등으로 멈출 때 창을 닫는다 */
  cancel(): void {
    if (this.sorting) this.phase = 'carrying';
    this.panel.setVisible(false);
  }

  /** 과장이 자리로 돌아와 앉았을 때 (OfficeScene에서 연결) */
  onTargetSeated(): void {
    if (this.deliver !== 'waitSeat') return;
    this.deliver = 'walking';
    this.target.view.say(APPROVAL.lines.gwajangFind, 2);
    this.pileTop.setVisible(false);
    this.target.forceTrip(APPROVAL.deliverRoute);
  }

  /** 과장이 목적지에 도착했을 때 (OfficeScene에서 연결) */
  onTargetArrived(): void {
    if (this.deliver !== 'walking') return;
    this.deliver = 'none';
    const s = this.scene;
    const v = APPROVAL.bossVoice;
    s.time.delayedCall(500, () => {
      this.shout(this.target.x + v.dx, this.target.y + v.dy, APPROVAL.lines.boss);
      s.cameras.main.shake(250, 0.006);
      this.emit('boss');
    });
    s.time.delayedCall(1700, () => {
      this.target.view.say(APPROVAL.lines.gwajangExcuse, 2.5);
      this.target.view.jolt();
    });
  }

  /** 부장실에서 터지는 큰 고함 (popWord보다 오래 남는다) */
  private shout(x: number, y: number, text: string): void {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: FONT, fontSize: '40px', color: '#d32f2f', stroke: '#ffffff', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.label + 10)
      .setAngle(-6)
      .setScale(0.3);
    this.scene.tweens.add({ targets: t, scale: 1.1, duration: 160, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: t, angle: 6, duration: 90, yoyo: true, repeat: 5 });
    this.scene.tweens.add({ targets: t, alpha: 0, y: y - 30, delay: 2200, duration: 400, onComplete: () => t.destroy() });
  }

  private nearPaper(x: number, y: number): boolean {
    return this.phase === 'onTable' && Phaser.Math.Distance.Between(x, y, APPROVAL.paper.x, APPROVAL.paper.y) <= APPROVAL.pickRange;
  }

  private nearPile(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, APPROVAL.pile.x, APPROVAL.pile.y) <= APPROVAL.pileRange;
  }

  private pick(player: Player): void {
    this.phase = 'carrying';
    this.paperView.setVisible(false);
    this.paperSpark.setVisible(false);
    popWord(this.scene, player.x, player.y - 110, '서류 GET!', { color: '#ec407a', size: 24 });
    this.emit('picked');
  }

  private startSorting(): void {
    this.phase = 'sorting';
    this.index = 0;
    this.lock = 0.15;
    // 같은 방향이 세 번 연속 나오지 않게
    this.seq = [];
    while (this.seq.length < APPROVAL.sheets) {
      const a = Phaser.Utils.Array.GetRandom(ARROWS);
      if (this.seq.length >= 2 && this.seq[this.seq.length - 1] === a && this.seq[this.seq.length - 2] === a) continue;
      this.seq.push(a);
    }
    this.refreshCards();
    this.panel.setScale(0.6).setAlpha(0);
    this.scene.tweens.add({ targets: this.panel, scale: 1, alpha: 1, duration: 160, ease: 'Back.Out' });
  }

  private press(a: Arrow, player: Player): void {
    const card = this.cards[this.index];
    if (a !== this.seq[this.index]) {
      this.lock = APPROVAL.wrongLock;
      this.scene.tweens.add({ targets: card.bg, x: card.bg.x + 6, duration: 50, yoyo: true, repeat: 2 });
      popWord(this.scene, player.x, player.y - 110, APPROVAL.lines.wrong, { color: '#5a3a4a', size: 20 });
      this.emit('wrong');
      return;
    }
    this.index += 1;
    this.emit('sheet');
    if (this.index < this.seq.length) {
      popWord(this.scene, APPROVAL.pile.x, APPROVAL.pile.y - 80, APPROVAL.lines.sheet, { color: '#8d7f99', size: 18 });
      this.refreshCards();
      return;
    }
    this.phase = 'done';
    this.deliver = 'waitSeat';
    this.panel.setVisible(false);
    this.pileTop.setVisible(true);
    popWord(this.scene, APPROVAL.pile.x, APPROVAL.pile.y - 80, APPROVAL.lines.done, { color: '#ec407a', size: 28 });
    this.emit('done');
  }

  private refreshCards(): void {
    this.cards.forEach((c, i) => {
      const done = i < this.index;
      const now = i === this.index;
      c.glyph.setText(done ? '✔' : ARROW_GLYPH[this.seq[i]]);
      c.bg.setFillStyle(done ? 0xc8e6c9 : now ? 0xffeb3b : 0xffffff);
      c.bg.setScale(now ? 1.12 : 1);
      c.glyph.setScale(now ? 1.12 : 1);
    });
  }

  private buildPanel(scene: Phaser.Scene, touch: TouchControls): Phaser.GameObjects.Container {
    const { w, h } = PANEL;
    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.outline).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 18);
    bg.fillStyle(0xfffaf3).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(4, COLORS.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    const title = scene.add
      .text(0, -h / 2 + 22, touch.enabled ? '결재 더미에 끼우기! 버튼을 순서대로' : '결재 더미에 끼우기! 방향키를 순서대로', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#e0457b',
      })
      .setOrigin(0.5);
    const parts: Phaser.GameObjects.GameObject[] = [bg, title];
    for (let i = 0; i < APPROVAL.sheets; i++) {
      const cx = (i - (APPROVAL.sheets - 1) / 2) * 96;
      const card = scene.add.rectangle(cx, 18, 70, 86, 0xffffff).setStrokeStyle(4, COLORS.outline);
      const glyph = scene.add.text(cx, 18, '', { fontFamily: FONT, fontSize: '44px', color: COLORS.text }).setOrigin(0.5);
      this.cards.push({ bg: card, glyph });
      parts.push(card, glyph);
    }
    const panel = scene.add.container(PANEL.x, PANEL.y, parts).setScrollFactor(0).setDepth(DEPTH.label + 35).setVisible(false);

    // 모바일: 창 아래 방향 버튼 4개 (조이스틱 대신 누름)
    if (touch.enabled) {
      ARROWS.forEach((a, i) => {
        const bx = PANEL.x + (i - 1.5) * (BTN + 14);
        const by = PANEL.y + PANEL.h / 2 + 14 + BTN / 2;
        const c = scene.add.circle(0, 0, BTN / 2, 0xffd54f).setStrokeStyle(4, COLORS.outline);
        const t = scene.add.text(0, 0, ARROW_GLYPH[a], { fontFamily: FONT, fontSize: '30px', color: COLORS.text }).setOrigin(0.5);
        const root = scene.add.container(bx - PANEL.x, by - PANEL.y, [c, t]);
        panel.add(root);
        touch.addTapZone(bx - BTN / 2, by - BTN / 2, BTN, BTN, () => (this.tapped = a), () => this.sorting);
      });
    }
    return panel;
  }
}
