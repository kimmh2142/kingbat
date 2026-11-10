import Phaser from 'phaser';
import { HR_VISIT } from '../data/hrVisit';
import type { PatrolController } from '../npc/PatrolController';
import type { Range } from '../npc/types';
import { popWord } from '../ui/Popups';

const rand = (r: Range) => Phaser.Math.FloatBetween(r[0], r[1]);

/**
 * STAGE 3 돌발 이벤트 "인사팀 방문".
 * 대기 → "띵—" 전조(엘리베이터, 3초) → 인사팀이 나타나 경로 하나를 둘러보고 돌아가 사라짐 → 다시 대기.
 * 인사팀이 보이는 동안 다른 방해 NPC는 "열심히 일하는 척" 말풍선. 정전 중엔 대기 시간이 흐르지 않는다.
 * 이벤트: 'ding'(전조), 'arrive', 'leave'
 */
export class HrVisit extends Phaser.Events.EventEmitter {
  phase: 'idle' | 'ding' | 'visiting' = 'idle';
  /** 다음 방문까지 / 띵 뒤 내릴 때까지 */
  timer = rand(HR_VISIT.firstAt);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly hr: PatrolController,
    private readonly others: PatrolController[],
  ) {
    super();
    hr.vanishAtSeat = true;
    hr.vanish();
  }

  /** @param blocked 다른 이벤트(정전) 중이면 시작하지 않는다 */
  update(dt: number, blocked: boolean): void {
    const L = HR_VISIT.lines;
    switch (this.phase) {
      case 'idle':
        if (!blocked) this.timer -= dt;
        if (this.timer > 0 || blocked) return;
        this.phase = 'ding';
        this.timer = HR_VISIT.warn;
        popWord(this.scene, this.hr.x, this.hr.y - 140, L.ding, { size: 30, color: '#ff7043' });
        this.emit('ding');
        return;
      case 'ding':
        this.timer -= dt;
        if (this.timer > 0) return;
        this.phase = 'visiting';
        this.hr.appear(Phaser.Math.Between(0, this.hr.pattern.routes.length - 1));
        this.hr.view.say(L.arrive, 2.5);
        for (const o of this.others) o.view.say(L.busy, 3);
        this.emit('arrive');
        return;
      case 'visiting':
        if (!this.hr.hidden) return;
        popWord(this.scene, this.hr.x, this.hr.y - 120, L.leave, { size: 18, color: '#8d7f99' });
        this.phase = 'idle';
        this.timer = rand(HR_VISIT.interval);
        this.emit('leave');
        return;
    }
  }

  /** 개발 테스트용: 바로 띵 */
  startNow(): void {
    if (this.phase === 'idle') this.timer = 0;
  }
}
