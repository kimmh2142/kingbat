import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT, GAME_WIDTH } from '../config';
import { DEPTH } from '../systems/OfficeMap';
import type { Score } from '../systems/Score';

const BAR_W = 300;
const BAR_H = 18;

/**
 * 상단 HUD (지금은 스테이지 + 킹받음 게이지만).
 * 하트·퇴근 시계·일시정지는 다음 단계에서 같은 줄에 붙인다.
 */
export class HUD {
  private readonly fill: Phaser.GameObjects.Graphics;
  private readonly temp: Phaser.GameObjects.TileSprite;
  private readonly value: Phaser.GameObjects.Text;
  private readonly barX: number;
  private readonly barY: number;

  constructor(
    scene: Phaser.Scene,
    private readonly score: Score,
    stageLabel: string,
  ) {
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) =>
      o.setScrollFactor(0).setDepth(DEPTH.label + 20);

    const bg = fixed(scene.add.graphics());
    bg.fillStyle(0xffffff, 0.92).fillRoundedRect(8, 6, GAME_WIDTH - 16, 36, 18);
    bg.lineStyle(3, COLORS.outline).strokeRoundedRect(8, 6, GAME_WIDTH - 16, 36, 18);

    fixed(scene.add.text(24, 24, stageLabel, { fontFamily: FONT, fontSize: '18px', color: COLORS.text }).setOrigin(0, 0.5));

    const label = fixed(scene.add.text(300, 24, '킹받음', { fontFamily: FONT, fontSize: '18px', color: '#e0457b' }).setOrigin(0, 0.5));
    this.barX = label.x + label.width + 10;
    this.barY = 24 - BAR_H / 2;

    const track = fixed(scene.add.graphics());
    track.fillStyle(0xf3e5ea).fillRoundedRect(this.barX, this.barY, BAR_W, BAR_H, 9);
    this.fill = fixed(scene.add.graphics());
    this.temp = fixed(scene.add.tileSprite(this.barX, this.barY, 1, BAR_H, TEX.stripe).setOrigin(0));
    const frame = fixed(scene.add.graphics());
    frame.lineStyle(3, COLORS.outline).strokeRoundedRect(this.barX, this.barY, BAR_W, BAR_H, 9);

    this.value = fixed(
      scene.add.text(this.barX + BAR_W + 10, 24, '', { fontFamily: FONT, fontSize: '16px', color: COLORS.text }).setOrigin(0, 0.5),
    );

    score.on('change', () => this.refresh());
    this.refresh();
  }

  update(dt: number): void {
    this.temp.tilePositionX -= dt * 20;
  }

  private refresh(): void {
    const s = this.score;
    const cw = (s.confirmed / s.goal) * BAR_W;
    const tw = (Math.min(s.temp, s.goal - s.confirmed) / s.goal) * BAR_W;
    this.fill.clear();
    if (cw > 0) this.fill.fillStyle(0xf06292).fillRoundedRect(this.barX, this.barY, Math.max(cw, 10), BAR_H, 9);
    this.temp.setPosition(this.barX + cw, this.barY).setVisible(tw >= 1);
    this.temp.width = Math.max(1, tw);
    const tempText = s.temp > 0 ? ` + 임시 ${Math.floor(s.temp)}` : '';
    this.value.setText(`${Math.floor(s.confirmed)}${tempText} / ${s.goal}`);
  }
}
