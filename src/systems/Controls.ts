import Phaser from 'phaser';

const MOVE_KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
} as const;

/** 브라우저 기본 동작(스크롤 등)을 막을 키 */
const CAPTURED = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

/**
 * 입력을 게임 동작으로 바꾼다. 나중에 모바일 가상 조이스틱도 여기로 합친다.
 *
 * 키는 물리 키 위치(event.code)로 읽는다. 한글 입력 상태에서는 keyCode가 229로 와서
 * Phaser 기본 키 입력이 WASD·Space를 못 알아듣기 때문.
 */
export class Controls {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly move = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene) {
    const onDown = (e: KeyboardEvent) => {
      if (CAPTURED.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => {
      if (CAPTURED.has(e.code)) e.preventDefault();
      this.down.delete(e.code);
    };
    // 창 밖으로 포커스가 나가면 눌린 키가 남지 않게
    const onBlur = () => this.down.clear();

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    });
    // 매 프레임 끝에 "방금 눌림" 기록을 비운다
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, () => this.pressed.clear());
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** 이번 프레임에 새로 눌렸는가 */
  justPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /** 길이 0 또는 1인 이동 방향 */
  getMove(): Phaser.Math.Vector2 {
    const any = (codes: readonly string[]) => codes.some((c) => this.down.has(c));
    const x = (any(MOVE_KEYS.right) ? 1 : 0) - (any(MOVE_KEYS.left) ? 1 : 0);
    const y = (any(MOVE_KEYS.down) ? 1 : 0) - (any(MOVE_KEYS.up) ? 1 : 0);
    return this.move.set(x, y).normalize();
  }

  /** 장난 버튼(Space)을 누르고 있는가 */
  get actionHeld(): boolean {
    return this.down.has('Space');
  }
}
