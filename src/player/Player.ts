import Phaser from 'phaser';
import { TEX } from '../assets/keys';
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
  /** 숨는 중: 'seat' = 내 자리에서 일하는 척, 'spot' = 물건 뒤에 쪼그려 숨기, 'trash' = 쓰레기통 뒤집어쓰기 (쓰레기통 버전) */
  hiding: 'seat' | 'spot' | 'trash' | null = null;
  /** 쓰레기통 버전: 뒤집어쓴 쓰레기통 그림 */
  private readonly trash: Phaser.GameObjects.Image;
  /** 숨는 자리로 미끄러져 들어가는 중 */
  private snapping = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.feet = scene.physics.add.image(x, y, '__WHITE').setVisible(false);
    this.feet.setBodySize(PLAYER.feetW, PLAYER.feetH).setCollideWorldBounds(true);

    const shadow = scene.add.image(0, 0, TEX.shadow);
    this.body = scene.add.image(0, 2, TEX.playerBody).setOrigin(0.5, 1);
    this.head = scene.add.image(0, -26, TEX.playerHeadFront).setOrigin(0.5, 1);
    this.parts = scene.add.container(0, 0, [this.body, this.head]);
    this.trash = scene.add.image(0, 4, TEX.trashCan).setOrigin(0.5, 1).setVisible(false);
    this.view = scene.add.container(x, y, [shadow, this.parts, this.trash]);
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

  /** 숨는 자리로 쏙 들어가며 숨기 시작 */
  hide(mode: 'seat' | 'spot', x: number, y: number, seconds: number): void {
    this.hiding = mode;
    this.feet.setVelocity(0, 0);
    this.snapping = true;
    const from = { x: this.feet.x, y: this.feet.y };
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: seconds * 1000,
      ease: 'Quad.Out',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 1;
        this.feet.body.reset(Phaser.Math.Linear(from.x, x, t), Phaser.Math.Linear(from.y, y, t));
      },
      onComplete: () => (this.snapping = false),
    });
    this.facing = 'down';
    this.parts.scaleX = 1;
  }

  /** 쓰레기통 뒤집어쓰기: 그 자리에서 쏙. 안에서 느리게 걸을 수 있다 */
  hideInTrash(): void {
    this.hiding = 'trash';
    this.parts.setVisible(false);
    this.trash.setVisible(true).setScale(1.3, 0.4);
    this.scene.tweens.add({ targets: this.trash, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.Out' });
  }

  unhide(): void {
    this.hiding = null;
    this.parts.setVisible(true);
    this.trash.setVisible(false).setAngle(0);
    this.view.setAlpha(1);
    this.parts.setScale(1, 1).setPosition(0, 0);
  }

  /**
   * @param trashSpeed 쓰레기통 안에서 걷는 빠르기 비율 (쓰레기통 버전)
   */
  update(move: Phaser.Math.Vector2, dt: number, trashSpeed = 0.35): void {
    if (this.hiding === 'trash') {
      // 뒤뚱뒤뚱: 느리게 걷고, 걸을 때 좌우로 기우뚱
      this.feet.setVelocity(move.x * PLAYER.walkSpeed * trashSpeed, move.y * PLAYER.walkSpeed * trashSpeed);
      const moving = move.lengthSq() > 0 && this.speed > 1;
      this.walkTime += dt * (moving ? 10 : 2);
      this.trash.setAngle(moving ? Math.sin(this.walkTime) * 8 : 0).setY(4 - (moving ? Math.abs(Math.sin(this.walkTime)) * 3 : 0));
      return;
    }
    if (this.hiding) {
      this.updateHiding(dt);
      return;
    }
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

  private updateHiding(dt: number): void {
    if (!this.snapping) this.feet.setVelocity(0, 0);
    this.walkTime += dt;
    this.head.setTexture(TEX.playerHeadFront);
    this.parts.angle = 0;
    if (this.hiding === 'spot') {
      // 쪼그려 앉아 숨죽이기
      this.view.setAlpha(0.7);
      this.parts.setScale(1, 0.8).setPosition(0, 0);
      this.head.y = -26 + Math.sin(this.walkTime * 2) * 0.6;
      this.body.scaleY = 1;
    } else {
      // 내 자리: 앉아서 열심히 일하는 척 (고개가 살짝 까딱)
      this.view.setAlpha(1);
      this.parts.setScale(1, 1).setPosition(0, 6);
      this.head.y = -26 + Math.abs(Math.sin(this.walkTime * 9)) * 1.5;
      this.body.scaleY = 1;
    }
  }

  /** 물리 갱신 뒤에 그림을 발 위치로 옮기고, 발 높이로 앞뒤 순서를 정한다 */
  syncView(): void {
    const bottom = this.feet.body.bottom;
    this.view.setPosition(this.feet.x, bottom).setDepth(bottom);
  }
}
