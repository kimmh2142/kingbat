import Phaser from 'phaser';
import { HIDE } from '../data/tuning';
import type { Player } from '../player/Player';
import { popWord } from '../ui/Popups';
import type { HideSpot, OfficeMap } from './OfficeMap';
import type { Score } from './Score';

/**
 * Shift(모바일 [숨기])로 숨기·일하는 척. (Hit & Run의 "확정" 단계)
 * - 내 자리나 숨기 장소 범위 안에서만 된다. 누르면 물건 뒤(또는 의자)로 쏙 붙는다.
 * - 누르고 있는 동안 숨어 있고, 공략 대상이 돌아봐도 들키지 않는다.
 * - confirmSeconds 이상 버티면 임시 점수가 확정된다.
 */
export class Hide {
  /** 지금 숨어 있는 곳 */
  spot: HideSpot | null = null;
  /** 숨을 수 있는 가까운 곳 (안내·반짝임용) */
  nearby: HideSpot | undefined;
  holdTime = 0;
  private wasHeld = false;
  private confirmed = false;
  private typingT = 0;
  private sparkleT = 0;
  private readonly sparkle: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly score: Score,
  ) {
    this.sparkle = scene.add
      .text(0, 0, '✦', { fontSize: '22px', color: '#fff59d', stroke: '#5a3a4a', strokeThickness: 4 })
      .setOrigin(0.5)
      .setVisible(false);
  }

  get hidden(): boolean {
    return this.spot !== null;
  }

  /**
   * @param held Shift / [숨기]를 누르고 있는가
   * @param busy 찌르는 중이면 숨을 수 없다
   */
  update(dt: number, held: boolean, player: Player, map: OfficeMap, busy: boolean): void {
    const pressed = held && !this.wasHeld;
    this.wasHeld = held;
    this.nearby = this.spot ?? map.hideSpotAt(player.x, player.y);

    if (!this.spot) {
      if (pressed && !busy) {
        if (this.nearby) this.enter(this.nearby, player);
        else popWord(this.scene, player.x, player.y - 110, '숨을 곳이 없어!', { color: '#5a3a4a', size: 18 });
      }
    } else if (!held) {
      this.exit(player);
    } else {
      this.holdTime += dt;
      if (!this.confirmed && this.holdTime >= HIDE.confirmSeconds) {
        this.confirmed = true;
        const gained = this.score.confirm();
        if (gained > 0) {
          popWord(this.scene, player.x, player.y - 100, `확정! +${Math.floor(gained)}`, { color: '#e0457b', size: 30 });
        }
      }
      if (this.spot.kind === 'seat') {
        // 일하는 척 타닥타닥
        this.typingT -= dt;
        if (this.typingT <= 0) {
          this.typingT = 0.7;
          popWord(this.scene, player.x + 30, player.y - 40, '타닥', { color: '#8d7f99', size: 15 });
        }
      }
    }

    this.updateSparkle(dt);
  }

  private enter(spot: HideSpot, player: Player): void {
    this.spot = spot;
    this.holdTime = 0;
    this.confirmed = false;
    this.typingT = 0.2;
    player.hide(spot.kind === 'seat' ? 'seat' : 'spot', spot.hx, spot.hy, HIDE.snapSeconds);
    if (spot.kind !== 'seat') popWord(this.scene, spot.hx, spot.hy - 90, '쉿…', { color: '#5a3a4a', size: 18 });
  }

  private exit(player: Player): void {
    this.spot = null;
    player.unhide();
  }

  /** 숨을 수 있는 곳이 가까우면 그 물건 위에서 반짝 (숨은 동안엔 안 보임) */
  private updateSparkle(dt: number): void {
    const target = !this.spot ? this.nearby : undefined;
    this.sparkle.setVisible(!!target);
    if (!target) return;
    this.sparkleT += dt;
    const img = target.image;
    const top = img.y - img.displayHeight;
    this.sparkle
      .setPosition(img.x + img.displayWidth * 0.3, top + 6 + Math.sin(this.sparkleT * 5) * 4)
      .setScale(0.8 + Math.abs(Math.sin(this.sparkleT * 4)) * 0.4)
      .setDepth(img.depth + 0.5);
  }
}
