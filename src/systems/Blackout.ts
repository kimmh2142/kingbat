import Phaser from 'phaser';
import { TEX, type TextureKey } from '../assets/keys';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { BLACKOUT } from '../data/blackout';
import type { PatrolController } from '../npc/PatrolController';
import type { TargetController } from '../npc/TargetController';
import type { Player } from '../player/Player';
import { popWord } from '../ui/Popups';
import { type MissionStep, type MissionTask, stepKey } from './MissionTask';
import { DEPTH } from './OfficeMap';

type Phase = 'onFloor' | 'carrying' | 'placing' | 'placed' | 'done';

/**
 * STAGE 3 특별 미션 "대정전과 최후의 방석".
 * 라운지 방귀 방석 지나가며 줍기 → 배전반 E (정전 15초, 대표가 확인하러 나감) → 대표가 나간 사이 의자 옆에서 E 꾹 (흔들리는 방석이 가운데 올 때 3번)
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
  /** 흔들리는 방석 놓기: 맞춘 횟수 (0~3) */
  round = 0;
  /** 방석이 의자 가운데서 벗어난 거리 (px, 0이면 정가운데) */
  swing = 0;
  private swingT = 0;
  /** 빗나간 뒤 잠깐 못 누르는 시간 */
  private lock = 0;
  /** 가운데 표시와 맞춘 횟수 점 */
  private readonly gauge: Phaser.GameObjects.Graphics;
  private wasHeld = false;
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
    // 흔들리는 방석: 의자 가운데 표시 + 맞춘 횟수
    this.gauge = scene.add.graphics().setDepth(DEPTH.label + 4).setVisible(false);
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
    return this.eVerb(x, y) !== null;
  }

  eVerb(x: number, y: number): string | null {
    if (this.phase === 'placing') return '깔기';
    if (this.nearPanel(x, y)) return '내리기';
    if (this.carrying && this.nearChair(x, y)) return '깔기';
    return null;
  }

  prompt(x: number, y: number, touch: boolean): string | null {
    const e = touch ? `[${this.eVerb(x, y) ?? '숨기'}]` : 'E';
    if (this.nearPanel(x, y)) {
      if (this.dark > 0) return null;
      if (this.cool > 0) return BLACKOUT.lines.cooling;
      return this.phase === 'onFloor' ? BLACKOUT.lines.needCushion : `${e}: 배전반 내리기`;
    }
    if (this.phase === 'placing') return null;
    if (this.carrying && this.nearChair(x, y)) return this.canPlace ? `${e}: 방석 깔기` : this.dark > 0 ? BLACKOUT.lines.needAway : BLACKOUT.lines.needDark;
    return null;
  }

  step(touch: boolean): MissionStep | null {
    const S = BLACKOUT.steps;
    const s = (text: string, at: MissionStep['at'], icon: TextureKey = TEX.cushion, verb?: string) => ({ text: stepKey(text, touch, verb), at, icon });
    if (this.phase === 'onFloor') return s(S.pick, BLACKOUT.cushion);
    if (this.carrying) {
      if (this.dark > 0) return s(S.chair, BLACKOUT.chair, TEX.cushion, '깔기');
      return s(this.cool > 0 || this.dark > 0 ? S.cooling : S.panel, BLACKOUT.panel, TEX.powerPanel, '내리기');
    }
    if (this.phase === 'placing') return s(S.placing, null, TEX.cushion, '깔기');
    if (this.phase === 'placed') return s(S.wait, null);
    return null;
  }

  update(dt: number, eHeld: boolean, blocked: boolean, player: Player): void {
    const pressed = eHeld && !this.wasHeld;
    this.wasHeld = eHeld;
    const { x, y } = player;

    // 방석은 일반 아이템처럼 지나가면 줍는다 (11/10)
    if (!blocked && this.nearCushion(x, y)) this.pick(player);
    // 깔기 미니게임 중 (시작한 그 누름은 판정에 안 쓴다: 먼저 처리)
    if (this.phase === 'placing') this.swingStep(dt, pressed, player);
    else if (pressed && !blocked) {
      if (this.nearPanel(x, y) && this.phase !== 'onFloor' && this.dark <= 0 && this.cool <= 0) this.cutPower();
      else if (this.carrying && this.nearChair(x, y)) {
        if (this.canPlace) this.startPlacing(player);
        else popWord(this.scene, x, y - 110, this.dark > 0 ? BLACKOUT.lines.needAway : BLACKOUT.lines.needDark, { color: '#5a3a4a', size: 18 });
      }
    }


    if (this.dark > 0) {
      this.dark -= dt;
      if (this.dark <= 0) this.lightsOn();
    } else if (this.cool > 0) this.cool -= dt;

    this.carryView.setVisible(this.carrying).setPosition(x + 36, y - 92);
  }

  onCaught(): void {
    if (this.phase !== 'placing') return;
    this.phase = 'onFloor';
    this.endSwing();
    this.floorView.setVisible(true);
    this.spark.setVisible(true);
    this.carryView.setVisible(false);
    this.scene.time.delayedCall(1200, () => popWord(this.scene, BLACKOUT.cushion.x, BLACKOUT.cushion.y - 60, BLACKOUT.lines.backToLounge, { color: '#5a3a4a', size: 18 }));
  }

  cancel(): void {
    if (this.phase === 'placing') {
      this.phase = 'carrying';
      this.endSwing();
    }
  }

  /** 대표가 돌아와 앉았을 때: 방석이 깔려 있으면 뿌우우욱 */
  onTargetSeated(): void {
    if (this.phase !== 'placed') return;
    this.phase = 'done';
    this.seatView.setVisible(false);
    this.fart();
    this.emit('done');
  }

  onTargetArrived(): void {}

  // ---------------------------------------------------------------- 진행

  private get canPlace(): boolean {
    // 정전 중에만 (11/10): 불이 켜지면 못 깐다. 대표가 자리에 없으면 나간 이유는 상관없다 (11/13, 원래 하던 외출에서 돌아와 잠깐 앉으면 정전 확인이 끝난 걸로 쳐서 못 까던 버그)
    return this.target.awayFromSeat && this.dark > 0;
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
    popWord(s, B.panel.x, B.panel.y - 130, B.lines.panel, { color: '#5a3a4a', size: 26 });
    s.cameras.main.shake(180, 0.005);
    this.shade.setVisible(true).setAlpha(0);
    s.tweens.add({ targets: this.shade, alpha: 1, duration: 200 });
    this.target.forceTrip(B.checkRoute, true);
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
    // 깔던 중이면 방석을 챙겨 물러난다 (들키진 않음). 다시 불을 꺼야 한다
    if (this.phase === 'placing') {
      this.phase = 'carrying';
      this.endSwing();
      popWord(this.scene, BLACKOUT.chair.x, BLACKOUT.chair.y - 100, BLACKOUT.lines.tooLate, { color: '#5a3a4a', size: 22 });
    }
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
    this.round = 0;
    this.swingT = 0;
    this.lock = 0;
    this.seatView.setVisible(true).setScale(0.8);
    this.gauge.setVisible(true);
    popWord(this.scene, player.x, player.y - 110, BLACKOUT.lines.placing, { color: '#8d7f99', size: 20 });
  }

  /**
   * 흔들리는 방석 놓기 (11/10 "STAGE 3이 심심"): 의자 위에서 방석이 좌우로 흔들리고, 가운데 올 때 누르면 한 번 맞춤.
   * 3번 맞추면 완성, 맞출수록 빨라진다. 빗나가면 "삐끗!" 잠깐 못 누름
   */
  private swingStep(dt: number, pressed: boolean, player: Player): void {
    const W = BLACKOUT.swing;
    this.lock = Math.max(0, this.lock - dt);
    this.swingT += dt * W.speeds[Math.min(this.round, W.speeds.length - 1)];
    // 삼각파: 가운데를 지나는 속도가 일정하다 (사인파는 가운데서 너무 빠르다)
    this.swing = W.amp * (2 / Math.PI) * Math.asin(Math.sin(this.swingT));
    const { x, y } = BLACKOUT.chair;
    if (pressed && this.lock <= 0) {
      if (Math.abs(this.swing) <= W.hit) {
        this.round++;
        popWord(this.scene, x, y - 100, this.round >= W.speeds.length ? BLACKOUT.lines.placed : BLACKOUT.lines.hit, { color: '#ec407a', size: 26 });
        this.scene.cameras.main.shake(80, 0.003);
        if (this.round >= W.speeds.length) return this.finishPlacing();
      } else {
        this.lock = W.missLock;
        popWord(this.scene, player.x, player.y - 110, BLACKOUT.lines.miss, { color: '#8d7f99', size: 20 });
      }
    }
    this.seatView.setPosition(x + this.swing, y - 22).setAngle(this.swing * 0.4);
    this.drawGauge();
  }

  private drawGauge(): void {
    const { x, y } = BLACKOUT.chair;
    const W = BLACKOUT.swing;
    const g = this.gauge.clear();
    // 가운데 표시: 노란 괄호 [  ] (이 안에 올 때 누르기)
    const top = y - 44;
    const bottom = y - 2;
    g.lineStyle(4, this.lock > 0 ? 0xbdbdbd : 0xffeb3b);
    for (const sx of [-1, 1]) {
      const bx = x + sx * (W.hit + 22);
      g.beginPath().moveTo(bx - sx * 8, top).lineTo(bx, top).lineTo(bx, bottom).lineTo(bx - sx * 8, bottom).strokePath();
    }
    g.fillStyle(0xffeb3b).fillTriangle(x - 8, top - 16, x + 8, top - 16, x, top - 4);
    // 맞춘 횟수 점 3개 (책상 앞, 주인공에 가리지 않게)
    for (let i = 0; i < W.speeds.length; i++) {
      const cx = x + (i - 1) * 28;
      g.fillStyle(i < this.round ? 0xec407a : 0xffffff).fillCircle(cx, y + 92, 10);
      g.lineStyle(3, 0x583848).strokeCircle(cx, y + 92, 10);
    }
  }

  private endSwing(): void {
    this.round = 0;
    this.swing = 0;
    this.gauge.setVisible(false);
    this.seatView.setVisible(false).setPosition(BLACKOUT.chair.x, BLACKOUT.chair.y - 22).setAngle(0);
  }

  private finishPlacing(): void {
    this.phase = 'placed';
    this.gauge.setVisible(false);
    this.seatView.setVisible(true).setPosition(BLACKOUT.chair.x, BLACKOUT.chair.y - 22).setAngle(0);
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
    // 뿅 튀어올라 버둥 → 납작, 머리 새빨개지고 김, 말풍선 3단계 (11/12 "더 우스꽝스럽게")
    this.target.view.boing();
    this.target.view.setPokeHeat(1);
    this.target.view.say(BLACKOUT.lines.daepyoShock, 1);
    s.time.delayedCall(1000, () => this.target.view.say(BLACKOUT.lines.daepyoWho, 1.3));
    s.time.delayedCall(2300, () => this.target.view.say(BLACKOUT.lines.daepyoDeny, 1.8));
    this.emit('fart', x, y);
    const t = s.add
      .text(x, y - 150, BLACKOUT.lines.fart, { fontFamily: FONT, fontSize: '54px', color: '#8d5524', stroke: '#ffffff', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(DEPTH.label + 10)
      .setAngle(-8)
      .setScale(0.2);
    s.tweens.add({ targets: t, scale: 1.2, duration: 180, ease: 'Back.Out' });
    s.tweens.add({ targets: t, angle: 8, duration: 80, yoyo: true, repeat: 7 });
    s.tweens.add({ targets: t, alpha: 0, y: y - 190, delay: 2400, duration: 400, onComplete: () => t.destroy() });
    // 방귀 구름: 크게 여러 겹, 두 번 뿜는다
    for (let i = 0; i < 12; i++) {
      const color = i % 3 === 0 ? 0xaed581 : 0xc5e1a5;
      // 양옆으로 퍼진다 (가운데는 튀어오르는 대표가 보이게 비워 둔다)
      const side = i % 2 === 0 ? -1 : 1;
      const c = s.add.circle(x + side * Phaser.Math.Between(30, 55), y - 10, Phaser.Math.Between(14, 26), color, 0.85).setDepth(DEPTH.label + 9);
      const delay = (i % 6) * 80 + (i >= 6 ? 450 : 0);
      s.tweens.add({ targets: c, y: c.y - 40 - (i % 6) * 12, x: c.x + side * Phaser.Math.Between(60, 120), alpha: 0, scale: 2.2, duration: 1700, delay, onComplete: () => c.destroy() });
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
