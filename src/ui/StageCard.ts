import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT } from '../config';
import type { StageStory } from '../data/dialogue';

/** 스테이지 이름 카드 ("STAGE 1 / 동기 이동기 / 한마디"). 스테이지 시작 타깃 소개 때 크게 뜬다 */
export function makeStageCard(scene: Phaser.Scene, x: number, y: number, s: Pick<StageStory, 'title' | 'subtitle' | 'quote'>): Phaser.GameObjects.Container {
  const card = scene.add.container(x, y);
  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.outline).fillRoundedRect(-230, -86 + 6, 460, 172, 24);
  bg.fillStyle(0xffffff).fillRoundedRect(-230, -86, 460, 172, 24);
  bg.lineStyle(5, COLORS.outline).strokeRoundedRect(-230, -86, 460, 172, 24);
  const t1 = scene.add.text(0, -52, s.title, { fontFamily: FONT, fontSize: '24px', color: '#8d7f99' }).setOrigin(0.5);
  const t2 = scene.add
    .text(0, 2, s.subtitle, { fontFamily: FONT, fontSize: '50px', color: '#ff4f8b', stroke: '#ffffff', strokeThickness: 8 })
    .setOrigin(0.5);
  const t3 = scene.add.text(0, 54, s.quote, { fontFamily: FONT, fontSize: '22px', color: COLORS.text }).setOrigin(0.5);
  const icon = scene.add.image(-t2.width / 2 - 26, 2, TEX.targetIcon).setScale(1.4);
  card.add([bg, t1, t2, t3, icon]);
  return card;
}
