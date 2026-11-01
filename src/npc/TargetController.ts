import Phaser from 'phaser';
import type { Desk } from '../data/office7f';
import { NpcView } from './NpcView';
import type { Facing, Point, Pose, Range, TargetPattern } from './types';

export type TargetState =
  | 'work' // 평소 업무
  | 'distracted' // 다른 행동 · 방심 타임
  | 'leaving' // 자리 비우러 가는 중
  | 'away' // 목적지에서 딴짓
  | 'returning' // 자리로 돌아오는 중
  | 'suspect' // 의심 1단계 (진짜·페이크 동일)
  | 'fake' // 2단계 페이크
  | 'real' // 2단계 진짜 (반응 시간)
  | 'look' // 실제 확인
  | 'react' // 들킨 걸 발견
  | 'back'; // 업무 복귀

const STATE_NAMES: Record<TargetState, string> = {
  work: '평소 업무',
  distracted: '방심 타임',
  leaving: '자리 비우러 감',
  away: '탕비실',
  returning: '자리로 복귀 중',
  suspect: '의심(1단계)',
  fake: '페이크(2단계)',
  real: '진짜(2단계)',
  look: '확인(뒤돌아봄)',
  react: '발견!',
  back: '업무 복귀',
};

const FACING_VEC: Record<Facing, Point> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const rand = (r: Range) => Phaser.Math.FloatBetween(r[0], r[1]);

/**
 * 공략 대상 상태머신.
 * 평소 업무 → 다른 행동 → 의심 → (페이크 또는 진짜) → 실제 확인 → 업무 복귀.
 * - 전조는 항상 두 단계 (suspect → fake/real). 전조 없이 look으로 가지 않는다.
 * - 페이크는 maxConsecutiveFakes번까지만 연속.
 * - 확인 사이클(의심 → 확인 → 복귀)은 어디서든 끼어들 수 있고, 끝나면 하던 일로 돌아간다.
 */
export class TargetController {
  readonly view: NpcView;
  state: TargetState = 'work';
  /** 이번 의심이 진짜인지 (의심 시작 때 정해짐, 디버그용으로 공개) */
  isReal = false;
  consecutiveFakes = 0;
  /** 이번 진짜 확인에서 돌아볼 쪽 (화면 기준 -1 왼쪽, 0 가운데, 1 오른쪽). 진짜 전조 때 흘깃 보는 쪽 */
  lookSide: -1 | 0 | 1 = 0;
  /** 콕 찔려서 짜증난 상태: 페이크 확률이 낮아진다. 확인 사이클이 끝나면 풀린다 */
  irritated = false;
  /** 연타 방지: 한 번 점수를 준 뒤 확인 사이클이 끝날 때까지 콕 점수 없음 */
  pokeLocked = false;
  /** 지금 누가 찌르는 중 */
  beingPoked = false;

  private timer = 0;
  private duration = 0;
  private tripTimer: number;
  private alert = 0;
  private workPose: Pose;
  private facing: Facing = 'down';
  private pos: Point;
  private path: Point[] = [];
  private pathIndex = 0;
  /** 확인 사이클이 끝난 뒤 돌아갈 상태 */
  private resume: TargetState = 'work';
  private sawPlayer = false;
  private readonly seat: Point;

  constructor(
    scene: Phaser.Scene,
    readonly pattern: TargetPattern,
    private readonly desk: Desk,
  ) {
    this.view = new NpcView(scene, pattern.appearance, true);
    this.seat = { x: desk.x, y: desk.y - 62 };
    this.pos = { ...this.seat };
    this.tripTimer = rand(pattern.trip.interval);
    this.workPose = pattern.work.activities[0].pose;
    this.enter('work');
  }

  get x(): number {
    return this.pos.x;
  }

  get y(): number {
    return this.pos.y;
  }

  get stateName(): string {
    return STATE_NAMES[this.state];
  }

  get remaining(): number {
    return Math.max(0, this.timer);
  }

  get tripIn(): number {
    return Math.max(0, this.tripTimer);
  }

  /** 뒤돌아보고 있는 중 (보이면 들킨다) */
  get isLooking(): boolean {
    return this.state === 'look';
  }

  /** 방심 타임 점수 배율 */
  get scoreMultiplier(): number {
    return this.state === 'distracted' ? this.pattern.distracted.scoreMultiplier : 1;
  }

  /** 지금 바라보는 방향. 확인 중이면 원래 방향의 반대에서 lookSide 쪽으로 skewDeg만큼 치우친다 */
  get lookDir(): Point {
    const f = FACING_VEC[this.facing];
    if (this.state !== 'look' && this.state !== 'react') return f;
    const base = Math.atan2(-f.y, -f.x);
    if (this.lookSide === 0) return { x: -f.x, y: -f.y };
    const skew = Phaser.Math.DegToRad(this.pattern.look.skewDeg);
    // 두 방향 중 화면에서 lookSide 쪽(x 부호)에 있는 것을 고른다. 좌우로 서 있으면 시계/반시계로 정한다
    let a = base + skew;
    if (Math.abs(Math.cos(base)) < 0.5) {
      if (Math.sign(Math.cos(a)) !== this.lookSide) a = base - skew;
    } else if (this.lookSide < 0) a = base - skew;
    return { x: Math.cos(a), y: Math.sin(a) };
  }

  /**
   * 이 위치에서 콕 찌를 수 있는가. 등 뒤·옆에서 가까이 있어야 한다 (얼굴 쪽은 안 됨).
   * 돌아보는 중에도 원래 등 쪽에서 찌를 수는 있다 (그러면 들킨다).
   */
  pokeCheck(x: number, y: number, range: number): 'ok' | 'far' | 'front' {
    const f = FACING_VEC[this.facing];
    const dx = x - this.pos.x;
    const dy = y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) return 'far';
    const facingCos = dist < 1 ? -1 : (dx * f.x + dy * f.y) / dist;
    return facingCos < 0.35 ? 'ok' : 'front';
  }

  /** 확인 중일 때 이 위치가 보이는가 */
  canSee(x: number, y: number): boolean {
    if (!this.isLooking) return false;
    const L = this.pattern.look;
    const dx = x - this.pos.x;
    const dy = y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= L.nearRadius) return true;
    if (dist > L.range) return false;
    const d = this.lookDir;
    const cos = (dx * d.x + dy * d.y) / dist;
    return cos >= Math.cos(Phaser.Math.DegToRad(L.halfAngleDeg));
  }

  setBeingPoked(on: boolean): void {
    this.beingPoked = on;
    if (!on) this.alert = 0;
  }

  /** 콕 찌르기로 점수를 한 번 받은 뒤 */
  onPokeScored(): void {
    this.pokeLocked = true;
    this.irritated = true;
  }

  /** 플레이어를 발견해 들켰을 때 */
  onCaught(): void {
    this.sawPlayer = true;
    this.enter('react');
  }

  update(dt: number): void {
    const P = this.pattern;
    // 자리에 앉아 있는 동안 흐르는 시간 (확인 사이클 포함). 탕비실은 업무가 끝날 때 떠난다
    if (this.atSeat) this.tripTimer -= dt;

    // 찔리는 중이면 눈치챈다
    if (this.beingPoked) {
      this.alert += dt;
      const busyElsewhere = this.state === 'away' || this.state === 'leaving' || this.state === 'returning';
      if (busyElsewhere && this.alert >= P.alertToSuspect) this.startCheck();
    }

    if (this.state === 'leaving' || this.state === 'returning') {
      this.walk(dt);
    } else {
      const speed = this.state === 'work' && this.beingPoked ? P.pokeSpeedup : 1;
      this.timer -= dt * speed;
      if (this.timer <= 0) this.next();
    }

    this.view.update(dt);
  }

  // ---------------------------------------------------------------- 상태 전환

  private next(): void {
    const P = this.pattern;
    switch (this.state) {
      case 'work':
        if (this.tripTimer <= 0) return this.enter('leaving');
        if (Math.random() < P.distracted.chance) return this.enter('distracted');
        return this.startCheck();
      case 'distracted':
        return this.enter('work');
      case 'away':
        return this.enter('returning');
      case 'suspect':
        return this.enter(this.isReal ? 'real' : 'fake');
      case 'fake':
        return this.enter(this.resume);
      case 'real':
        return this.enter('look');
      case 'look':
      case 'react':
        return this.enter('back');
      case 'back':
        // 확인 사이클 완료: 연타 방지·짜증 해제
        this.pokeLocked = false;
        this.irritated = false;
        return this.enter(this.resume);
      default:
        return;
    }
  }

  private startCheck(): void {
    const P = this.pattern;
    // 하던 일 기억 (걷던 중이면 이어서 걷기)
    this.resume = this.state === 'suspect' || this.state === 'fake' ? this.resume : this.state === 'distracted' ? 'work' : this.state;
    const chance = this.irritated ? P.fakeChanceIrritated : P.fakeChance;
    this.isReal = this.consecutiveFakes >= P.maxConsecutiveFakes || Math.random() >= chance;
    this.consecutiveFakes = this.isReal ? 0 : this.consecutiveFakes + 1;
    this.lookSide = this.isReal ? this.pickSide() : 0;
    this.alert = 0;
    this.enter('suspect');
  }

  private enter(state: TargetState): void {
    const P = this.pattern;
    const prev = this.state;
    this.state = state;
    const v = this.view;

    switch (state) {
      case 'work': {
        if (prev !== 'back' && prev !== 'fake') this.workPose = this.pickActivity();
        this.resume = 'work';
        this.setTimer(P.work.duration);
        this.sitDown();
        v.setPose(this.workPose);
        break;
      }
      case 'distracted':
        this.setTimer(P.distracted.duration);
        v.setPose(P.distracted.pose);
        v.say(P.distracted.startBubble, 0.8);
        break;
      case 'suspect':
        this.setTimer(P.suspect.duration);
        v.setPose(this.atSeat ? P.suspect.pose : { ...P.suspect.pose, hands: 'side' });
        break;
      case 'fake':
        this.setTimer(P.fake.duration);
        v.setPose(this.atSeat ? P.fake.pose : { ...P.fake.pose, hands: 'side' });
        break;
      case 'real': {
        this.setTimer(P.real.duration);
        // 진짜로 갈라진 뒤에만 돌아볼 쪽을 흘깃 본다 (페이크와 구별되기 전에는 안 보임)
        const pose = { ...P.real.pose, glance: this.lookSide };
        v.setPose(this.atSeat ? pose : { ...pose, hands: 'hidden' });
        break;
      }
      case 'look':
        this.sawPlayer = false;
        this.setTimer(P.look.duration);
        v.setPose(this.turnedPose({ ...P.look.pose, glance: this.lookSide }));
        break;
      case 'react':
        this.setTimer(P.react.duration);
        v.setPose(this.turnedPose({ ...P.react.pose, glance: this.lookSide }));
        break;
      case 'back': {
        this.faceForward();
        this.setTimer(P.back.duration);
        const pose = this.sawPlayer ? P.back.pose : P.back.posePuzzled;
        v.setPose(this.atSeat ? pose : { ...pose, hands: 'side', typing: 0 });
        break;
      }
      case 'leaving':
        this.path = [this.seat, ...P.trip.path];
        this.pathIndex = this.resume === 'leaving' && prev !== 'work' ? this.pathIndex : 1;
        v.setPose(P.trip.walkPose);
        break;
      case 'returning':
        this.path = [...P.trip.path].reverse().concat([this.seat]);
        this.pathIndex = this.resume === 'returning' && prev !== 'away' ? this.pathIndex : 1;
        v.setPose(P.trip.walkPose);
        break;
      case 'away':
        this.setTimer(P.trip.stay);
        this.facing = P.trip.stayFacing;
        v.standAt(this.pos.x, this.pos.y, this.facing);
        v.setPose(P.trip.stayPose);
        break;
    }
  }

  /** 뒤돌아본 자세: 앉아 있으면 등이 보이고, 서 있으면 반대 방향을 본다 */
  private turnedPose(pose: Pose): Pose {
    if (this.atSeat) return pose;
    const opposite: Record<Facing, Facing> = { down: 'up', up: 'down', left: 'right', right: 'left' };
    const turned = opposite[this.facing];
    this.view.standAt(this.pos.x, this.pos.y, turned);
    return { ...pose, back: turned === 'up', hands: 'side' };
  }

  /** 확인이 끝나면 원래 방향으로 */
  private faceForward(): void {
    if (!this.atSeat) this.view.standAt(this.pos.x, this.pos.y, this.facing);
  }

  private get atSeat(): boolean {
    return this.pos.x === this.seat.x && this.pos.y === this.seat.y;
  }

  private sitDown(): void {
    this.pos = { ...this.seat };
    this.facing = 'down';
    this.view.sitAt(this.seat.x, this.seat.y, this.desk.y);
  }

  private walk(dt: number): void {
    const target = this.path[this.pathIndex];
    if (!target) {
      if (this.state === 'leaving') {
        this.tripTimer = rand(this.pattern.trip.interval);
        this.enter('away');
      } else this.enter('work');
      return;
    }
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const step = this.pattern.trip.speed * dt;
    if (dist <= step) {
      this.pos = { ...target };
      this.pathIndex += 1;
    } else {
      this.pos = { x: this.pos.x + (dx / dist) * step, y: this.pos.y + (dy / dist) * step };
      this.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    }
    this.view.standAt(this.pos.x, this.pos.y, this.facing);
  }

  private setTimer(r: Range): void {
    this.duration = rand(r);
    this.timer = this.duration;
  }

  private pickSide(): -1 | 0 | 1 {
    const w = this.pattern.look.sideWeights;
    let r = Math.random() * (w.left + w.center + w.right);
    if ((r -= w.left) < 0) return -1;
    if ((r -= w.center) < 0) return 0;
    return 1;
  }

  private pickActivity(): Pose {
    const acts = this.pattern.work.activities;
    const total = acts.reduce((s, a) => s + a.weight, 0);
    let r = Math.random() * total;
    for (const a of acts) {
      r -= a.weight;
      if (r <= 0) return a.pose;
    }
    return acts[0].pose;
  }
}
