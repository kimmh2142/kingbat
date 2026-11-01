import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { CaughtReasonId } from '../data/caughtReasons';
import { PLAYER_START } from '../data/office7f';
import { STAGES } from '../data/stages';
import { CAMERA, POKE } from '../data/tuning';
import { DONGI } from '../npc/patterns/dongi';
import { TargetController } from '../npc/TargetController';
import { Player } from '../player/Player';
import { Controls } from '../systems/Controls';
import { DebugOverlay } from '../systems/DebugOverlay';
import { Hide } from '../systems/Hide';
import { Life } from '../systems/Life';
import { DEPTH, OfficeMap } from '../systems/OfficeMap';
import { Poke } from '../systems/Poke';
import { Score } from '../systems/Score';
import { WorkClock } from '../systems/WorkClock';
import { CaughtCutin } from '../ui/CaughtCutin';
import { HUD } from '../ui/HUD';
import { Prompt } from '../ui/Prompt';
import { VisionCone } from '../ui/VisionCone';
import { TouchControls } from '../ui/TouchControls';

export class OfficeScene extends Phaser.Scene {
  private map!: OfficeMap;
  private player!: Player;
  private controls!: Controls;
  private debug!: DebugOverlay;
  private target!: TargetController;
  private targetBlocker!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private score!: Score;
  private poke!: Poke;
  private hud!: HUD;
  private prompt!: Prompt;
  private targetCone!: VisionCone;
  private keyHint!: Phaser.GameObjects.Text;
  private touch!: TouchControls;
  private hide!: Hide;
  private goalAnnounced = false;
  private life!: Life;
  private clock!: WorkClock;
  private cutin!: CaughtCutin;
  /** 하트를 다 잃어서 실패 화면이 떠 있음 */
  private failed = false;
  /** 이번 프레임에 화면을 터치했는가 (컷인 넘기기) */
  private tapped = false;
  private caughtCount = 0;

  constructor() {
    super('Office');
  }

  create(): void {
    // scene.restart()는 생성자를 다시 부르지 않으므로 판마다 상태를 여기서 초기화한다
    this.failed = false;
    this.tapped = false;
    this.caughtCount = 0;
    this.goalAnnounced = false;

    this.map = new OfficeMap(this, 1);
    this.touch = new TouchControls(this);
    this.controls = new Controls(this, this.touch);
    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.physics.add.collider(this.player.feet, this.map.colliders);

    const desk = this.map.desks.find((d) => d.owner === 'dongi')!;
    this.target = new TargetController(this, DONGI, desk);
    // 플레이어가 NPC 몸을 통과하지 않게 발밑에 막는 상자를 붙인다
    this.targetBlocker = this.physics.add.image(this.target.x, this.target.y, '__WHITE').setVisible(false).setImmovable(true);
    // 의자 등받이까지 막아서, 등 뒤에 선 플레이어와 그림이 너무 겹치지 않게 한다
    this.targetBlocker.setBodySize(34, 60);
    this.physics.add.collider(this.player.feet, this.targetBlocker);

    this.score = new Score();
    this.poke = new Poke(this, this.score);
    this.hide = new Hide(this, this.score);
    this.score.on('change', () => this.announceGoal());
    this.life = new Life();
    this.clock = new WorkClock(STAGES[1]);
    this.clock.once('timeout', () => this.showFail('overtime'));
    this.hud = new HUD(this, this.score, this.life, this.clock);
    this.cutin = new CaughtCutin(this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => (this.tapped = true));
    this.prompt = new Prompt(this);
    this.targetCone = new VisionCone(this);

    // 물리 계산이 끝난 뒤 그림 위치를 맞춘다
    const sync = () => this.player.syncView();
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.POST_UPDATE, sync));
    this.player.syncView();

    this.setupCamera();
    this.setupDebug();
    if (import.meta.env.DEV) {
      // 개발 중 테스트용 (빌드에는 빠진다)
      window.__kingbatTest = {
        teleport: (x: number, y: number) => {
          this.player.feet.body.reset(x, y);
          this.cameras.main.centerOn(x, y);
        },
        setRemaining: (seconds: number) => this.clock.setRemaining(seconds),
      };
    }
    this.keyHint = this.add
      .text(8, GAME_HEIGHT - 8, 'WASD·방향키 이동   Space 꾹: 콕   Shift 꾹: 숨기·확정   ` 디버그', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#ffffff',
        stroke: '#5a3a4a',
        strokeThickness: 4,
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH.label);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    if (this.paused) {
      // 컷인·실패 화면: 게임은 멈추고 캐릭터 연출만 움직인다
      this.player.update(new Phaser.Math.Vector2(), dt);
      this.target.view.update(dt);
      this.cutin.update(dt, this.controls.justPressed('Space') || this.tapped);
      if (this.failed && (this.controls.justPressed('Space') || this.controls.justPressed('Enter'))) this.retry();
    } else {
      const move = this.controls.getMove().clone();
      if (this.poke.active) move.scale(POKE.moveMultiplier);
      this.player.update(move, dt);
      // 숨어 있는 동안은 찌를 수 없다
      this.poke.update(dt, this.controls.actionHeld && !this.hide.hidden, this.player, this.target);
      this.hide.update(dt, this.controls.hideHeld, this.player, this.map, this.poke.active);
      this.target.update(dt);
      this.checkCaught();
      // 컷인·실패 화면 동안은 퇴근 시계도 멈춘다
      if (!this.paused) this.clock.update(dt);
    }

    this.targetBlocker.body.reset(this.target.x, this.target.y - 26);
    // 뒤돌아본 동안에만 시야 부채꼴을 보여준다 (전조 단계에서는 안 보임)
    const t = this.target;
    const looking = t.state === 'look' || t.state === 'react';
    this.targetCone.update(dt, looking ? { x: t.x, y: t.y, dir: t.lookDir, ...t.pattern.look } : null);
    this.target.view.setAnger(this.score.total / this.score.goal);
    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y) < 110;
    this.target.view.setLabelFaded(near && this.player.y < this.target.y);
    const canPoke = !this.paused && !this.poke.active && this.target.pokeCheck(this.player.x, this.player.y, POKE.range) === 'ok';
    this.prompt.show(this.player.x, this.player.y - 122, this.promptText(canPoke));
    // [숨기] 버튼은 숨을 수 있는 곳 근처에서만 진하게
    this.touch.setDisabled('hide', !this.hide.nearby);
    this.keyHint.setVisible(!this.controls.isTouch);
    this.hud.update(dt);
    this.debug.update();
    window.__kingbat = {
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      debug: this.debug.enabled,
      target: { state: this.target.state, x: Math.round(this.target.x), y: Math.round(this.target.y), side: this.target.lookSide },
      score: { confirmed: this.score.confirmed, temp: this.score.temp },
      poking: this.poke.active,
      caught: this.caughtCount,
      hidden: this.hide.hidden,
      hearts: this.life.hearts,
      cutin: this.cutin.active,
      failed: this.failed,
      remaining: Math.round(this.clock.remaining * 10) / 10,
    };
    this.tapped = false;
  }

  /** 컷인이나 실패 화면 때문에 게임이 멈춰 있음 */
  private get paused(): boolean {
    return this.cutin.active || this.failed;
  }

  private promptText(canPoke: boolean): string | null {
    if (this.paused || this.hide.hidden) return null;
    const touch = this.controls.isTouch;
    if (canPoke) return touch ? '콕 버튼 꾹!' : 'Space 꾹 → 콕!';
    if (this.hide.nearby) {
      const what = this.hide.nearby.kind === 'seat' ? '일하는 척' : '숨기';
      return touch ? `숨기 버튼 꾹: ${what}` : `Shift 꾹: ${what}`;
    }
    return null;
  }

  /** 확정 킹받음이 목표에 처음 닿았을 때 (특별 미션은 다음 단계에서 붙는다) */
  private announceGoal(): void {
    if (this.goalAnnounced || this.score.confirmed < this.score.goal) return;
    this.goalAnnounced = true;
    const t = this.add
      .text(GAME_WIDTH / 2, 120, ['킹받음 100 달성!', '특별 미션은 아직 준비 중'], {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#ffffff',
        align: 'center',
        stroke: '#e0457b',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.label + 30)
      .setScale(0.5);
    this.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 2500, duration: 400, onComplete: () => t.destroy() });
  }

  /** 장난 중이거나 임시 점수를 들고 있을 때 돌아본 대상에게 보이면 들킨다 */
  private checkCaught(): void {
    const t = this.target;
    if (!t.isLooking || this.hide.hidden) return; // 숨어 있으면 안 보인다
    const guilty = this.poke.active || this.score.temp > 0;
    if (guilty && t.canSee(this.player.x, this.player.y)) this.onCaught('turned');
  }

  /** 들킴: 임시 점수 소멸 → 컷인(하트 -1) → 하트가 없으면 실패 화면 */
  private onCaught(reason: CaughtReasonId): void {
    this.caughtCount += 1;
    this.poke.cancel(this.target);
    this.score.loseTemp();
    this.target.onCaught();
    this.cutin.play({
      reason,
      cause: { x: this.target.x, y: this.target.y - 70 },
      follow: this.player.cameraTarget,
      onHit: () => this.life.lose(reason),
      onDone: () => {
        if (!this.life.alive) this.showFail('caught');
      },
    });
  }

  /** 간이 실패 화면 (정식 실패 화면은 이후 단계). caught = 하트 0개, overtime = 시간 초과 */
  private showFail(kind: 'caught' | 'overtime'): void {
    if (this.failed) return;
    this.failed = true;
    this.poke.cancel(this.target);
    const overtime = kind === 'overtime';
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    // 야근: 불 꺼진 사무실처럼 더 어둡게
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, overtime ? 0x0d0a14 : 0x2a1d24, overtime ? 0.8 : 0.6).setOrigin(0);
    const stamp = this.add
      .text(cx, cy - 50, overtime ? '야근 확정!' : '딱 걸렸다!', { fontFamily: FONT, fontSize: '72px', color: '#ff3d6e', stroke: '#ffffff', strokeThickness: 10 })
      .setOrigin(0.5)
      .setAngle(-8)
      .setScale(2.5);
    const sub = this.add
      .text(cx, cy + 20, overtime ? '퇴근 시계가 6시를 넘겼다… 오늘도 야근이다' : '동기: "야! 너였구나!"', { fontFamily: FONT, fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5);
    const btnBg = this.add.rectangle(cx, cy + 90, 220, 56, 0xffd54f).setStrokeStyle(4, 0x5a3a4a);
    const btnText = this.add.text(cx, cy + 90, '다시 도전', { fontFamily: FONT, fontSize: '26px', color: '#5a3a4a' }).setOrigin(0.5);
    const hint = this.add
      .text(cx, cy + 135, this.controls.isTouch ? '버튼을 눌러요' : 'Space / Enter', { fontFamily: FONT, fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);
    for (const o of [dim, stamp, sub, btnBg, btnText, hint]) o.setScrollFactor(0).setDepth(DEPTH.label + 50);
    this.tweens.add({ targets: stamp, scale: 1, duration: 260, ease: 'Back.Out' });
    btnBg.setInteractive({ useHandCursor: true }).once(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.retry());
  }

  /** 이 스테이지만 처음부터 다시 (도입 컷신은 없음) */
  private retry(): void {
    this.scene.restart();
  }

  private setupDebug(): void {
    this.debug = new DebugOverlay(this);
    this.debug.addInfo(() => {
      const p = this.player;
      const room = this.map.roomAt(p.x, p.y);
      const hide = this.map.hideSpotAt(p.x, p.y);
      return [
        `FPS ${Math.round(this.game.loop.actualFps)}   퇴근까지 ${this.clock.remaining.toFixed(0)}초 (${this.clock.clockText})   하트 ${this.life.hearts}`,
        `위치 (${Math.round(p.x)}, ${Math.round(p.y)})  속도 ${Math.round(p.speed)}  방향 ${p.facing}`,
        `구역 ${room ? room.name : '-'}`,
        `숨기 가능 ${hide ? hide.id : '-'}   숨는 중 ${this.hide.hidden ? `O ${this.hide.holdTime.toFixed(1)}초` : '-'}`,
      ];
    });
    this.debug.addInfo(() => {
      const t = this.target;
      const isCheck = ['suspect', 'fake', 'real', 'look'].includes(t.state);
      return [
        `── ${t.pattern.name}`,
        `상태 ${t.stateName}  남은 ${t.remaining.toFixed(1)}초`,
        `이번 의심 ${isCheck ? (t.isReal ? `진짜(${['왼쪽', '가운데', '오른쪽'][t.lookSide + 1]})` : '페이크') : '-'}   연속 페이크 ${t.consecutiveFakes}`,
        `탕비실까지 ${t.tripIn.toFixed(0)}초   짜증 ${t.irritated ? 'O' : '-'}   연타 잠금 ${t.pokeLocked ? 'O' : '-'}`,
        `콕 ${this.poke.active ? `중 ${this.poke.rate.toFixed(1)}회/초` : '-'}   배율 x${t.scoreMultiplier}   들킴 ${this.caughtCount}`,
      ];
    });
    this.debug.addWorldDrawer((g) => {
      this.map.drawDebug(g);
      const t = this.target;
      // 콕 찌르기 범위
      g.lineStyle(2, 0xff4f8b, 0.8).strokeCircle(t.x, t.y, POKE.range);
      // 확인 시야 (공략 대상의 시야는 화면에 안 보이고 디버그에서만)
      const L = t.pattern.look;
      const d = t.lookDir;
      const a = Math.atan2(d.y, d.x);
      const half = Phaser.Math.DegToRad(L.halfAngleDeg);
      g.fillStyle(t.isLooking ? 0xe53935 : 0xffb300, t.isLooking ? 0.3 : 0.12);
      g.slice(t.x, t.y, L.range, a - half, a + half, false).fillPath();
      g.fillCircle(t.x, t.y, L.nearRadius);
    });
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.map.width, this.map.height).setRoundPixels(true);
    cam.startFollow(this.player.cameraTarget, true, CAMERA.lerp, CAMERA.lerp, 0, 40);
    cam.setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH);

    // ?overview=1 : 맵 전체를 한 화면에 (맵 확인용)
    if (new URLSearchParams(location.search).has('overview')) {
      cam.stopFollow().removeBounds();
      cam.setZoom(Math.min(cam.width / this.map.width, cam.height / this.map.height));
      cam.centerOn(this.map.width / 2, this.map.height / 2);
    }
  }
}
