import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ITEMS } from '../data/items';
import { DEPTH } from '../systems/OfficeMap';
import type { Items } from '../systems/Items';
import type { TouchControls } from './TouchControls';

const SIZE = 54;
const GAP = 8;
const Y = GAME_HEIGHT - 8 - SIZE / 2;

/**
 * 하단 가운데 아이템 3칸. 고른 칸은 노랗게 커진다.
 * 모바일에서는 칸을 눌러서 고른다 (PC는 1/2/3, 마우스 클릭도 된다).
 */
export class ItemBar {
  private readonly slots: { bg: Phaser.GameObjects.Graphics; icon: Phaser.GameObjects.Image; root: Phaser.GameObjects.Container }[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly items: Items,
    touch: TouchControls,
  ) {
    const n = items.slots.length;
    const total = n * SIZE + (n - 1) * GAP;
    for (let i = 0; i < n; i++) {
      const x = GAME_WIDTH / 2 - total / 2 + SIZE / 2 + i * (SIZE + GAP);
      const bg = scene.add.graphics();
      const icon = scene.add.image(0, -2, ITEMS.postit.icon).setVisible(false);
      const num = scene.add
        .text(-SIZE / 2 + 6, -SIZE / 2 + 2, String(i + 1), { fontFamily: FONT, fontSize: '14px', color: COLORS.text })
        .setOrigin(0, 0);
      const root = scene.add.container(x, Y, [bg, icon, num]).setScrollFactor(0).setDepth(DEPTH.label + 20);
      this.slots.push({ bg, icon, root });
      touch.addTapZone(x - SIZE / 2, Y - SIZE / 2, SIZE, SIZE, () => items.select(i));
    }
    items.on('change', () => this.refresh());
    this.refresh();
  }

  private refresh(): void {
    this.slots.forEach((s, i) => {
      const id = this.items.slots[i];
      const sel = i === this.items.selected;
      const h = SIZE / 2;
      s.bg.clear();
      s.bg.fillStyle(sel ? 0xfff3b0 : 0xffffff, sel ? 0.98 : 0.8).fillRoundedRect(-h, -h, SIZE, SIZE, 12);
      s.bg.lineStyle(sel ? 4 : 3, sel ? 0xf9a825 : COLORS.outline).strokeRoundedRect(-h, -h, SIZE, SIZE, 12);
      s.icon.setVisible(!!id);
      if (id) s.icon.setTexture(ITEMS[id].icon);
      s.root.setScale(sel ? 1.08 : 1);
    });
  }
}
