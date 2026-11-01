import Phaser from 'phaser';
import { FONT, GAME_HEIGHT } from '../config';
import { PLAYER_START } from '../data/office7f';
import { CAMERA } from '../data/tuning';
import { Player } from '../player/Player';
import { Controls } from '../systems/Controls';
import { DebugOverlay } from '../systems/DebugOverlay';
import { DEPTH, OfficeMap } from '../systems/OfficeMap';

export class OfficeScene extends Phaser.Scene {
  private map!: OfficeMap;
  private player!: Player;
  private controls!: Controls;
  private debug!: DebugOverlay;

  constructor() {
    super('Office');
  }

  create(): void {
    this.map = new OfficeMap(this, 1);
    this.controls = new Controls(this);
    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.physics.add.collider(this.player.feet, this.map.colliders);
    // 물리 계산이 끝난 뒤 그림 위치를 맞춘다
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, () => this.player.syncView());
    this.player.syncView();

    this.setupCamera();
    this.setupDebug();
    this.add
      .text(8, GAME_HEIGHT - 8, 'WASD·방향키 이동   ` 디버그', {
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
    this.player.update(this.controls.getMove(), delta / 1000);
    this.debug.update();
    window.__kingbat = {
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      debug: this.debug.enabled,
    };
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
        `NPC 없음 (다음 단계에서 추가)`,
      ];
    });
    this.debug.addWorldDrawer((g) => this.map.drawDebug(g));
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
