import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { BLACKOUT } from '../data/blackout';
import type { PatrolController } from '../npc/PatrolController';
import type { TargetController } from '../npc/TargetController';
import type { Player } from '../player/Player';
import { popWord } from '../ui/Popups';
import type { MissionTask } from './MissionTask';
import { DEPTH } from './OfficeMap';

type Phase = 'onFloor' | 'carrying' | 'placing' | 'placed' | 'done';

/**
 * STAGE 3 특별 미션 "대정전과 최후의 방석".
 * 라운지 방귀 방석 E 줍기 → 배전반 E (정전 15초, 대표가 확인하러 나감) → 대표가 나간 사이 의자 옆에서 E (1초 동안 깔기)
 * → 대표가 돌아와 앉으면 "뿌우우욱!" 'done'. 까는 중(busy)엔 움직일 수 없고, 보이면 들킨다(OfficeScene.checkCaught).
 */
export class Blackout extends Phaser.Events.EventEmitter implements MissionTask {
  readonly caughtReason = 'cushion';
  readonly walkSeeRange = BLACKOUT.walkSeeRange;
  readonly anchor = BLACKOUT.chair;
  phase: Phase = 'onFloor';
  /** 정전 남은 시간 (0이면 불 켜짐) */
  dark = 0;
  /** 다시 내릴 수 있을 때까지 */
  private cool = 0;
  private placeT = 0;
  private wasHeld = false;
  /** 정전으로 대표가 자리를 비운 동안 (이때만 방석을 깔 수 있다) */
  private checking = false;
  private readonly floorView: Phaser.GameObjects.Image;
  private readonly spark: Phaser.GameObjects.Text;
  private readonly carryView: Phaser.GameObjects.Image;
  private readonly seatView: Phaser.GameObjects.Image;
  private readonly shade: Phaser.GameObjects.Rectangle;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly target: TargetController,
    /** 정전 중 손전등을 켜는 비서 (없으면 손전등 없음) */
    private readonly secretary?: PatrolController,
  ) {
    super();
    const B = BLACKOUT;
    this.floorView = scene.add.image(B.cushion.x, B.cushion.y, TEX.cushion).setOrigin(0.5, 1).setDepth(B.cushion.y);
    this.spark = scene.add
      .text(B.cushion.x + 18, B.cushion.y - 34, '✦', { fontSize: '22px', color: '#fff59d', stroke: '#5a3a4a', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(B.cushion.y + 1);
    scene.tweens.add({ targets: this.spark, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    this.carryView = scene.add.image(0, 0, TEX.cushion).setScale(0.7).setDepth(DEPTH.label + 3).setVisible(false);
    // 의자 위에 깔린 방석 (의자 그림 바로 앞. 대표가 앉으면 몸에 가려진다)
    this.seatView = scene.add.image(B.chair.x, B.chair.y - 22, TEX.cushion).setScale(0.8).setDepth(B.chair.y + 0.5).setVisible(false);
    // 정전: 화면 전체를 어둡게 (이름표·HUD는 위에 보인다)
    this.shade = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0820, 0.62)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.overlay + 50)
      .setVisible(false);
  }

  get busy(): boolean {
    return this.phase === 'placing';
  }

  get carrying(): boolean {
    return this.phase === 'carrying';
  }

  get done(): boolean {
    return this.phase === 'done';
  }

  wantsE(x: number, y: number): boolean {
    return this.nearCushion(x, y) || this.nearPanel(x, y) || (this.carrying && this.nearChair(x, y));
  }

  prompt(x: number, y: number, touch: boolean): string | null {
    const e = touch ? '숨기 버튼' : 'E';
    if (this.nearCushion(x, y)) return `${e}: 방귀 방석 줍기`;
    if (this.nearPanel(x, y)) {
      if (this.dark > 0) return null;
      if (this.cool > 0) return BLACKOUT.lines.cooling;
      return this.phase === 'onFloor' ? BLACKOUT.lines.needCushion : `${e}: 배전반 내리기`;
    }
    if (this.carrying && this.nearChair(x, y)) return this.canPlace ? `${e}: 의자에 방석 깔기` : BLACKOUT.lines.needAway;
    return null;
  }

  update(dt: number, eHeld: boolean, blocked: boolean, player: Player): void {
    const pressed = eHeld && !this.wasHeld;
    this.wasHeld = eHeld;
    const { x, y } = player;

    if (pressed && !blocked) {
      if (this.nearCushion(x, y)) this.pick(player);
      else if (this.nearPanel(x, y) && this.phase !== 'onFloor' && this.dark <= 0 && this.cool <= 0) this.cutPower();
      else if (this.carrying && this.nearChair(x, y)) {
        if (this.canPlace) this.startPlacing(player);
        else popWord(this.scene, x, y - 110, BLACKOUT.lines.needAway, { color: '#5a3a4a', size: 18 });
      }
    }

    if (this.phase === 'placing') {
      this.placeT -= dt;
      if (this.placeT <= 0) this.finishPlacing();
    }

    if (this.dark > 0) {
      this.dark -= dt;
      if (this.dark <= 0) this.lightsOn();
    } else if (this.cool > 0) this.cool -= dt;

    this.carryView.setVisible(this.carrying || this.phase === 'placing').setPosition(x + 36, y - 92);
  }

  onCaught(): void {
    if (this.phase !== 'placing') return;
    this.phase = 'onFloor';
    this.floorView.setVisible(true);
    this.spark.setVisible(true);
    this.carryView.setVisible(false);
    this.scene.time.delayedCall(1200, () => popWord(this.scene, BLACKOUT.cushion.x, BLACKOUT.cushion.y - 60, BLACKOUT.lines.backToLounge, { color: '#5a3a4a', size: 18 }));
  }

  cancel(): void {
    if (this.phase === 'placing') this.phase = 'carrying';
  }

  /** 대표가 돌아와 앉았을 때: 방석이 깔려 있으면 뿌우우욱 */
  onTargetSeated(): void {
    this.checking = false;
    if (this.phase !== 'placed') return;
    this.phase = 'done';
    this.seatView.setVisible(false);
    this.fart();
    this.emit('done');
  }

  onTargetArrived(): void {}

  // ---------------------------------------------------------------- 진행

  private get canPlace(): boolean {
    return this.checking && this.target.awayFromSeat;
  }

  private pick(player: Player): void {
    this.phase = 'carrying';
    this.floorView.setVisible(false);
    this.spark.setVisible(false);
    popWord(this.scene, player.x, player.y - 110, '방석 GET!', { color: '#ec407a', size: 24 });
    this.emit('picked');
  }

  /** 배전반 내리기: 층 전체 정전, 아래층 비명, 대표가 확인하러 나간다 */
  private cutPower(): void {
    const s = this.scene;
    const B = BLACKOUT;
    this.dark = B.darkSeconds;
    this.checking = true;
    popWord(s, B.panel.x, B.panel.y - 130, B.lines.panel, { color: '#5a3a4a', size: 26 });
    s.cameras.main.shake(180, 0.005);
    this.shade.setVisible(true).setAlpha(0);
    s.tweens.add({ targets: this.shade, alpha: 1, duration: 200 });
    this.target.forceTrip(B.checkRoute);
    this.target.view.say(B.lines.daepyoDark, 2);
    B.lines.voices.forEach((line, i) => s.time.delayedCall(500 + i * 1100, () => this.voice(line, i)));
    // 비서: 손전등을 켜고 문 앞으로 (길고 좁은 노란 시야)
    const sec = this.secretary;
    if (sec) {
      sec.visionOverride = B.flashlight.vision;
      sec.coneColorOverride = B.flashlight.color;
      sec.goNow(B.flashlight.route);
      sec.view.say(B.flashlight.line, 2.5);
    }
    this.emit('sheet');
    this.emit('dark', true);
  }

  private lightsOn(): void {
    this.dark = 0;
    this.cool = BLACKOUT.cooldown;
    this.scene.tweens.add({ targets: this.shade, alpha: 0, duration: 400, onComplete: () => this.shade.setVisible(false) });
    this.voice(BLACKOUT.lines.lightsOn, 0);
    if (this.secretary) {
      this.secretary.visionOverride = undefined;
      this.secretary.coneColorOverride = undefined;
    }
    this.emit('dark', false);
  }

  private startPlacing(player: Player): void {
    this.phase = 'placing';
    this.placeT = BLACKOUT.placeTime;
    popWord(this.scene, player.x, player.y - 110, BLACKOUT.lines.placing, { color: '#8d7f99', size: 20 });
  }

  private finishPlacing(): void {
    this.phase = 'placed';
    this.seatView.setVisible(true);
    popWord(this.scene, BLACKOUT.chair.x, BLACKOUT.chair.y - 70, BLACKOUT.lines.placed, { color: '#ec407a', size: 24 });
    this.emit('sheet');
  }

  /** 대표가 앉는 순간: 화면이 대표에게 확 다가가고 큰 의성어 */
  private fart(): void {
    const s = this.scene;
    const { x, y } = this.target;
    const cam = s.cameras.main;
    const zoom = cam.zoom;
    cam.zoomTo(zoom * 1.5, 220, 'Sine.easeOut');
    s.time.delayedCall(1700, () => cam.zoomTo(zoom, 400, 'Sine.easeInOut'));
    cam.shake(400, 0.01);
    this.target.view.jolt();
    this.target.view.say(BLACKOUT.lines.daepyoShock, 2.5);
    const t = s.add
      .text(x, y - 150, BLACKOUT.lines.fart, { fontFamily: FONT, fontSize: '54px', color: '#8d5524', stroke: '#ffffff', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(DEPTH.label + 10)
      .setAngle(-8)
      .setScale(0.2);
    s.tweens.add({ targets: t, scale: 1.2, duration: 180, ease: 'Back.Out' });
    s.tweens.add({ targets: t, angle: 8, duration: 80, yoyo: true, repeat: 7 });
    s.tweens.add({ targets: t, alpha: 0, y: y - 190, delay: 2400, duration: 400, onComplete: () => t.destroy() });
    // 방귀 구름
    for (let i = 0; i < 5; i++) {
      const c = s.add.circle(x + Phaser.Math.Between(-30, 30), y - 20, Phaser.Math.Between(12, 22), 0xc5e1a5, 0.8).setDepth(DEPTH.label + 9);
      s.tweens.add({ targets: c, y: c.y - 60 - i * 12, x: c.x + Phaser.Math.Between(-40, 40), alpha: 0, scale: 1.8, duration: 1400, delay: i * 90, onComplete: () => c.destroy() });
    }
  }

  /** 화면 위쪽에 잠깐 뜨는 목소리 (정전 비명 등) */
  private voice(text: string, row: number): void {
    const t = this.scene.add
      .text(GAME_WIDTH / 2, 120 + row * 34, text, { fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#3b2a33', strokeThickness: 6 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.label + 31)
      .setScale(0.6);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
  }

  private nearCushion(x: number, y: number): boolean {
    return this.phase === 'onFloor' && Phaser.Math.Distance.Between(x, y, BLACKOUT.cushion.x, BLACKOUT.cushion.y) <= BLACKOUT.pickRange;
  }

  private nearPanel(x: number, y: number): boolean {
    return this.phase !== 'done' && Phaser.Math.Distance.Between(x, y, BLACKOUT.panel.x, BLACKOUT.panel.y) <= BLACKOUT.panelRange;
  }

  private nearChair(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, BLACKOUT.chair.x, BLACKOUT.chair.y) <= BLACKOUT.chairRange;
  }
}
