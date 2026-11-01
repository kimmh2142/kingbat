import Phaser from 'phaser';
import type { StageConfig } from '../data/stages';

/**
 * 퇴근 시계 (제한시간). 게임이 멈춘 동안(컷인·실패 화면)에는 update를 부르지 않는다.
 * 시간이 다 되면 'timeout'을 한 번 보낸다 → "야근 확정!"
 */
export class WorkClock extends Phaser.Events.EventEmitter {
  elapsed = 0;
  private done = false;

  constructor(readonly stage: StageConfig) {
    super();
  }

  get remaining(): number {
    return Math.max(0, this.stage.timeLimit - this.elapsed);
  }

  /** 남은 비율 1 → 0 */
  get ratio(): number {
    return this.remaining / this.stage.timeLimit;
  }

  get urgent(): boolean {
    return this.remaining <= this.stage.urgentAt && !this.done;
  }

  /** "오후 4:57" 형식의 게임 속 시각 */
  get clockText(): string {
    const s = this.stage;
    const minutes = Math.floor(s.clockStart + (s.clockEnd - s.clockStart) * (1 - this.ratio));
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const h12 = h24 > 12 ? h24 - 12 : h24;
    return `${h24 >= 12 ? '오후' : '오전'} ${h12}:${String(m).padStart(2, '0')}`;
  }

  update(dt: number): void {
    if (this.done) return;
    this.elapsed += dt;
    if (this.remaining <= 0) {
      this.done = true;
      this.emit('timeout');
    }
  }

  /** 개발 테스트용: 남은 시간을 바로 설정 */
  setRemaining(seconds: number): void {
    this.elapsed = Math.max(0, this.stage.timeLimit - seconds);
  }
}
