import Phaser from 'phaser';
import { PLAYER_START } from '../data/office7f';
import { OfficeMap } from '../systems/OfficeMap';

export class OfficeScene extends Phaser.Scene {
  private map!: OfficeMap;

  constructor() {
    super('Office');
  }

  create(): void {
    this.map = new OfficeMap(this, 1);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.map.width, this.map.height).centerOn(PLAYER_START.x, PLAYER_START.y);

    // ?overview=1 : 맵 전체를 한 화면에 (맵 확인용)
    if (new URLSearchParams(location.search).has('overview')) {
      cam.removeBounds();
      cam.setZoom(Math.min(cam.width / this.map.width, cam.height / this.map.height));
      cam.centerOn(this.map.width / 2, this.map.height / 2);
    }
  }
}
