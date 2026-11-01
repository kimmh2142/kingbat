import Phaser from 'phaser';
import { FINAL_ASSETS } from '../assets/manifest';
import { generatePlaceholders } from '../assets/placeholderTextures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const [key, path] of Object.entries(FINAL_ASSETS)) {
      this.load.image(key, `assets/${path}`);
    }
  }

  create(): void {
    // 최종 그래픽이 없는 키만 임시 그래픽으로 채운다
    generatePlaceholders(this);
    this.scene.start('Office');
  }
}
