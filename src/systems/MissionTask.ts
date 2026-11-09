import type Phaser from 'phaser';
import type { CaughtReasonId } from '../data/caughtReasons';
import type { Player } from '../player/Player';

/**
 * E로 하는 특별 미션 (STAGE 2 승인서, STAGE 3 대정전과 방석)이 OfficeScene에 연결되는 모양.
 * 이벤트: 'done'(미션 성공), 'picked'(미션 물건 줍기), 'sheet'(한 단계 진행)
 */
export interface MissionTask extends Phaser.Events.EventEmitter {
  /** 미션 동작 중 (움직일 수 없고, 보이면 들킨다) */
  readonly busy: boolean;
  /** 동작 중 들켰을 때 컷인 원인 */
  readonly caughtReason: CaughtReasonId;
  /** 동작 중 대상이 자리로 돌아오는 길이면 이 거리 안에서 들킨다 */
  readonly walkSeeRange: number;
  /** 미션 성공 문구를 띄울 곳 */
  readonly anchor: { x: number; y: number };
  /** 이 자리에서 E가 이 미션에 쓰이는가 (숨기와 겹치지 않게) */
  wantsE(x: number, y: number): boolean;
  /** 안내 문구 (없으면 null) */
  prompt(x: number, y: number, touch: boolean): string | null;
  update(dt: number, eHeld: boolean, blocked: boolean, player: Player, justPressed: (code: string) => boolean): void;
  /** 들켰을 때 (동작 중이던 물건을 되돌린다) */
  onCaught(): void;
  /** 결과 화면 등으로 멈출 때 */
  cancel(): void;
  /** 공략 대상이 자리로 돌아와 앉았을 때 / 목적지에 도착했을 때 */
  onTargetSeated(): void;
  onTargetArrived(): void;
}
