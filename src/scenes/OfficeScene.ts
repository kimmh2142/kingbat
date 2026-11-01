import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';

export class OfficeScene extends Phaser.Scene {
  constructor() {
    super('Office');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#fbe9ee');
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '㈜킹받컴퍼니 7층', { fontFamily: FONT, fontSize: '40px', color: '#5a3a4a' })
      .setOrigin(0.5);
  }
}
