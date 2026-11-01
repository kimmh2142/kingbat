import Phaser from 'phaser';
import { TEX } from '../assets/keys';
import { COLORS, FONT } from '../config';
import { PLAYER } from '../data/tuning';

/**
 * 주인공. 충돌은 발밑의 작은 상자(feet)가 담당하고,
 * 그림(view)은 머리·몸통 파츠를 겹친 컨테이너로 발 위치를 따라간다.
 * 파츠로 나눠 둔 이유: 나중에 표정 교체·파츠 애니메이션으로 바꾸기 쉽게.
 */
export class Player {
  readonly feet: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  readonly view: Phaser.GameObjects.Container;
  private readonly parts: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private walkTime = 0;
  facing: 'up' | 'down' | 'left' | 'right' = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.feet = scene.physics.add.image(x, y, '__WHITE').setVisible(false);
    this.feet.setBodySize(PLAYER.feetW, PLAYER.feetH).setCollideWorldBounds(true);

    const shadow = scene.add.image(0, 0, TEX.shadow);
    this.body = scene.add.image(0, 2, TEX.playerBody).setOrigin(0.5, 1);
    this.head = scene.add.image(0, -26, TEX.playerHeadFront).setOrigin(0.5, 1);
    this.parts = scene.add.container(0, 0, [this.body, this.head]);
    this.view = scene.add.container(x, y, [shadow, this.parts, this.makeTag(scene)]);
  }

  /** 카메라가 따라갈 대상 */
  get cameraTarget(): Phaser.GameObjects.Container {
    return this.view;
  }

  get x(): number {
    return this.feet.x;
  }

  get y(): number {
    return this.feet.y;
  }

  get speed(): number {
    return this.feet.body.velocity.length();
  }

  update(move: Phaser.Math.Vector2, dt: number): void {
    this.feet.setVelocity(move.x * PLAYER.walkSpeed, move.y * PLAYER.walkSpeed);

    if (move.y < 0) this.facing = 'up';
    else if (move.y > 0) this.facing = 'down';
    else if (move.x !== 0) this.facing = move.x < 0 ? 'left' : 'right';
    if (move.x !== 0) this.parts.scaleX = move.x < 0 ? -1 : 1;
    this.head.setTexture(this.facing === 'up' ? TEX.playerHeadBack : TEX.playerHeadFront);

    // 걸을 때 통통 튀고, 서 있을 때 살짝 숨쉬기
    const moving = move.lengthSq() > 0 && this.speed > 1;
    this.walkTime += dt * (moving ? 14 : 3);
    const bob = moving ? Math.abs(Math.sin(this.walkTime)) * 4 : Math.sin(this.walkTime) * 0.8;
    this.head.y = -26 - bob;
    this.body.scaleY = moving ? 1 - Math.abs(Math.cos(this.walkTime)) * 0.06 : 1;
    this.parts.angle = moving ? Math.sin(this.walkTime) * 3 : 0;
  }

  /** 물리 갱신 뒤에 그림을 발 위치로 옮기고, 발 높이로 앞뒤 순서를 정한다 */
  syncView(): void {
    const bottom = this.feet.body.bottom;
    this.view.setPosition(this.feet.x, bottom).setDepth(bottom);
  }

  private makeTag(scene: Phaser.Scene): Phaser.GameObjects.Container {
    const t = scene.add.text(0, 0, '나', { fontFamily: FONT, fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    const w = t.width + 20;
    const h = t.height + 6;
    const bg = scene.add.graphics();
    bg.fillStyle(0x9575cd).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(3, COLORS.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    return scene.add.container(0, -96, [bg, t]);
  }
}
