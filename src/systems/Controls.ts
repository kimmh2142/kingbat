import Phaser from 'phaser';

/**
 * 입력을 게임 동작으로 바꾼다. 나중에 모바일 가상 조이스틱도 여기로 합친다.
 * 지금은 이동(WASD / 방향키)과 장난(Space)만 있다.
 */
export class Controls {
  private readonly keys: Record<
    'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space',
    Phaser.Input.Keyboard.Key
  >;
  private readonly move = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP,
      down: K.DOWN,
      left: K.LEFT,
      right: K.RIGHT,
      w: K.W,
      a: K.A,
      s: K.S,
      d: K.D,
      space: K.SPACE,
    }) as Controls['keys'];
    // 방향키·스페이스로 페이지가 스크롤되지 않게
    kb.addCapture([K.UP, K.DOWN, K.LEFT, K.RIGHT, K.SPACE]);
  }

  /** 길이 0 또는 1인 이동 방향 */
  getMove(): Phaser.Math.Vector2 {
    const k = this.keys;
    const x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    return this.move.set(x, y).normalize();
  }

  /** 장난 버튼(Space)을 누르고 있는가 */
  get actionHeld(): boolean {
    return this.keys.space.isDown;
  }
}
