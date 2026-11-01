import Phaser from 'phaser';
import { PLAYER_START } from '../data/office7f';
import { CAMERA } from '../data/tuning';
import { Player } from '../player/Player';
import { Controls } from '../systems/Controls';
import { OfficeMap } from '../systems/OfficeMap';

export class OfficeScene extends Phaser.Scene {
  private map!: OfficeMap;
  private player!: Player;
  private controls!: Controls;

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
  }

  update(_time: number, delta: number): void {
    this.player.update(this.controls.getMove(), delta / 1000);
    window.__kingbat = { player: { x: Math.round(this.player.x), y: Math.round(this.player.y) } };
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
