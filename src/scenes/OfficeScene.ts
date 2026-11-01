import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CAUGHT_REASONS, type CaughtReasonId } from '../data/caughtReasons';
import { PLAYER_START } from '../data/office7f';
import { CAMERA, CAUGHT, POKE } from '../data/tuning';
import { DONGI } from '../npc/patterns/dongi';
import { TargetController } from '../npc/TargetController';
import { Player } from '../player/Player';
import { Controls } from '../systems/Controls';
import { DebugOverlay } from '../systems/DebugOverlay';
import { DEPTH, OfficeMap } from '../systems/OfficeMap';
import { Poke } from '../systems/Poke';
import { Score } from '../systems/Score';
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
  /** 들킨 직후 화면이 멈춰 있는 남은 시간 */
  private frozen = 0;
  private caughtCount = 0;

  constructor() {
    super('Office');
  }

  create(): void {
    this.map = new OfficeMap(this, 1);
    const touch = new TouchControls(this);
    touch.setDisabled('hide', true); // 숨기·확정은 다음 단계
    this.controls = new Controls(this, touch);
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
    this.hud = new HUD(this, this.score, `STAGE 1 · ${DONGI.name}`);
    this.prompt = new Prompt(this);
    this.targetCone = new VisionCone(this);

    // 물리 계산이 끝난 뒤 그림 위치를 맞춘다
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, () => this.player.syncView());
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
      };
    }
    this.keyHint = this.add
      .text(8, GAME_HEIGHT - 8, 'WASD·방향키 이동   Space 꾹: 콕 찌르기   ` 디버그', {
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

    if (this.frozen > 0) {
      this.frozen -= dt;
      this.player.update(new Phaser.Math.Vector2(), dt);
      this.target.view.update(dt);
    } else {
      const move = this.controls.getMove().clone();
      if (this.poke.active) move.scale(POKE.moveMultiplier);
      this.player.update(move, dt);
      this.poke.update(dt, this.controls.actionHeld, this.player, this.target);
      this.target.update(dt);
      this.checkCaught();
    }

    this.targetBlocker.body.reset(this.target.x, this.target.y - 26);
    // 뒤돌아본 동안에만 시야 부채꼴을 보여준다 (전조 단계에서는 안 보임)
    const t = this.target;
    const looking = t.state === 'look' || t.state === 'react';
    this.targetCone.update(dt, looking ? { x: t.x, y: t.y, dir: t.lookDir, ...t.pattern.look } : null);
    this.target.view.setAnger(this.score.total / this.score.goal);
    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y) < 110;
    this.target.view.setLabelFaded(near && this.player.y < this.target.y);
    const canPoke = this.frozen <= 0 && !this.poke.active && this.target.pokeCheck(this.player.x, this.player.y, POKE.range) === 'ok';
    this.prompt.show(this.player.x, this.player.y - 122, canPoke ? (this.controls.isTouch ? '콕 버튼 꾹!' : 'Space 꾹 → 콕!') : null);
    this.keyHint.setVisible(!this.controls.isTouch);
    this.hud.update(dt);
    this.debug.update();
    window.__kingbat = {
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      debug: this.debug.enabled,
      target: { state: this.target.state, x: Math.round(this.target.x), y: Math.round(this.target.y) },
      score: { confirmed: this.score.confirmed, temp: this.score.temp },
      poking: this.poke.active,
      caught: this.caughtCount,
    };
  }

  /** 장난 중이거나 임시 점수를 들고 있을 때 돌아본 대상에게 보이면 들킨다 */
  private checkCaught(): void {
    const t = this.target;
    if (!t.isLooking) return;
    const guilty = this.poke.active || this.score.temp > 0;
    if (guilty && t.canSee(this.player.x, this.player.y)) this.onCaught('turned');
  }

  /**
   * 들킴 처리 (임시). 정식 컷인·하트 감소는 다음 단계에서 CaughtCutin과 Life로 옮긴다.
   */
  private onCaught(reason: CaughtReasonId): void {
    this.caughtCount += 1;
    this.poke.cancel(this.target);
    this.score.loseTemp();
    this.target.onCaught();
    this.frozen = CAUGHT.freezeSeconds;
    this.cameras.main.shake(180, 0.006);

    const r = CAUGHT_REASONS[reason];
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, r.text, {
        fontFamily: FONT,
        fontSize: '56px',
        color: '#ffffff',
        stroke: '#e0457b',
        strokeThickness: 12,
      })
      .setOrigin(0.5);
    const tip = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, `TIP  ${r.tip}`, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#5a3a4a',
        backgroundColor: '#ffffffee',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5);
    const box = this.add.container(0, 0, [title, tip]).setScrollFactor(0).setDepth(DEPTH.label + 30);
    title.setScale(2.2).setAngle(-6);
    this.tweens.add({ targets: title, scale: 1, duration: 220, ease: 'Back.Out' });
    this.tweens.add({
      targets: box,
      alpha: 0,
      delay: CAUGHT.freezeSeconds * 1000 - 250,
      duration: 250,
      onComplete: () => box.destroy(),
    });
  }

  private setupDebug(): void {
    this.debug = new DebugOverlay(this);
    this.debug.addInfo(() => {
      const p = this.player;
      const room = this.map.roomAt(p.x, p.y);
      const hide = this.map.hideSpotAt(p.x, p.y);
      return [
        `FPS ${Math.round(this.game.loop.actualFps)}`,
        `위치 (${Math.round(p.x)}, ${Math.round(p.y)})  속도 ${Math.round(p.speed)}  방향 ${p.facing}`,
        `구역 ${room ? room.name : '-'}`,
        `숨기 가능 ${hide ? hide.id : '-'}   내 자리 ${this.map.isInMySeat(p.x, p.y) ? 'O' : '-'}`,
      ];
    });
    this.debug.addInfo(() => {
      const t = this.target;
      const isCheck = ['suspect', 'fake', 'real', 'look'].includes(t.state);
      return [
        `── ${t.pattern.name}`,
        `상태 ${t.stateName}  남은 ${t.remaining.toFixed(1)}초`,
        `이번 의심 ${isCheck ? (t.isReal ? '진짜' : '페이크') : '-'}   연속 페이크 ${t.consecutiveFakes}`,
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
