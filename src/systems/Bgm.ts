import Phaser from 'phaser';

// 배경 음악 (11/10 "귀엽고 통통거리는 느낌"): 소리 파일 없이 브라우저에서 합성하는 직접 작곡한 짧은 반복 곡.
// 마림바 같은 통통 멜로디 + 뿅뿅 베이스 + 작은 찰칵 박자. C 장조, I–vi–IV–V 4마디 × 2 (뒤 4마디는 살짝 변형).
// 장면이 바뀌어도 끊기지 않게 게임 전체에서 하나만 돈다. 소리 끄기(🔊/🔇)는 이 기기에 저장한다.
// 진짜 음악 파일이 생기면 'bgm' 키로 불러오면 그 파일을 대신 튼다.

const MUTE_KEY = 'kingbat.sound.off';
const BPM = 116;
/** 퇴근 직전 등 급할 때 빠르기 */
const BPM_FAST = 136;
const VOL = 0.5;

const N: Record<string, number> = {};
// 음 이름 → 주파수 (C3 ~ C6)
['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].forEach((n, i) => {
  for (let o = 2; o <= 6; o++) N[`${n}${o}`] = 440 * Math.pow(2, (i - 9) / 12 + (o - 4));
});

// 8분음표 한 칸씩, 한 마디 8칸. null = 쉼
const MELODY: (string | null)[][] = [
  ['E5', null, 'G5', 'E5', null, 'C5', 'D5', 'E5'],
  ['C5', null, 'E5', 'C5', null, 'A4', 'B4', 'C5'],
  ['A4', null, 'C5', 'A4', null, 'F4', 'G4', 'A4'],
  ['B4', null, 'D5', 'B4', 'G4', null, 'A4', 'B4'],
  ['E5', 'G5', null, 'E5', 'C6', null, 'G5', 'E5'],
  ['C5', 'E5', null, 'C5', 'A5', null, 'E5', 'C5'],
  ['F5', 'E5', 'D5', 'C5', 'A4', null, 'C5', 'D5'],
  ['G5', null, 'D5', null, 'B4', 'G4', null, null],
];
// 베이스: 마디마다 근음 – 5도 통통
const BASS: [string, string][] = [
  ['C3', 'G3'],
  ['A2', 'E3'],
  ['F2', 'C3'],
  ['G2', 'D3'],
];

class BgmPlayer {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  /** 다음에 칠 8분음표 칸 번호 (0부터 계속 증가). 확인 스크립트가 음악이 도는지 본다 */
  step = 0;
  private nextAt = 0;
  private fast = false;
  private game: Phaser.Game | null = null;
  private fileSound: Phaser.Sound.BaseSound | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** 게임 시작 때 한 번. 오디오가 막혀 있으면(첫 터치 전) 풀릴 때까지 기다렸다가 시작한다 */
  start(game: Phaser.Game): void {
    if (this.game) return;
    this.game = game;
    game.sound.mute = this.muted;
    if (game.cache.audio.exists('bgm')) {
      this.fileSound = game.sound.add('bgm', { loop: true, volume: 0.4 });
      if (game.sound.locked) game.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.fileSound?.play());
      else this.fileSound.play();
      return;
    }
    const sound = game.sound;
    if (!(sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
    this.ctx = sound.context;
    this.out = this.ctx.createGain();
    this.out.gain.value = this.muted ? 0 : VOL;
    this.out.connect(this.ctx.destination);
    // 25ms마다 0.15초 앞까지 미리 예약 (탭이 느려져도 박자가 안 밀리게)
    window.setInterval(() => this.schedule(), 25);
  }

  /** 급할 때 빠르게 (퇴근 30초 전 등) */
  setFast(fast: boolean): void {
    this.fast = fast;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      if (this.muted) localStorage.setItem(MUTE_KEY, '1');
      else localStorage.removeItem(MUTE_KEY);
    } catch {
      // 저장이 막혀도 이번 판에는 적용
    }
    if (this.game) this.game.sound.mute = this.muted;
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(this.muted ? 0 : VOL, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.nextAt < ctx.currentTime) this.nextAt = ctx.currentTime + 0.05;
    const eighth = 60 / (this.fast ? BPM_FAST : BPM) / 2;
    while (this.nextAt < ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextAt, eighth);
      this.step++;
      this.nextAt += eighth;
    }
  }

  private playStep(step: number, t: number, eighth: number): void {
    const bar = Math.floor(step / 8) % MELODY.length;
    const i = step % 8;
    const note = MELODY[bar][i];
    // 통통 튀게: 박마다 살짝 앞당겼다 늦췄다 (스윙)
    const swing = i % 2 === 1 ? eighth * 0.12 : 0;
    if (note) this.marimba(N[note], t + swing);
    const bass = BASS[bar % BASS.length];
    if (i === 0) this.bass(N[bass[0]], t);
    if (i === 3) this.bass(N[bass[1]], t + swing);
    if (i === 4) this.bass(N[bass[0]], t);
    // 뒷박 찰칵
    if (i % 2 === 1) this.tick(t + swing);
  }

  /** 마림바 같은 통: 사인 + 옥타브 위 약하게, 빠르게 사라진다 */
  private marimba(f: number, t: number): void {
    this.tone(f, t, 0.22, 'sine', 0.16);
    this.tone(f * 4, t, 0.05, 'sine', 0.03);
  }

  /** 뿅 베이스: 짧은 삼각파, 살짝 아래로 미끄러짐 */
  private bass(f: number, t: number): void {
    this.tone(f, t, 0.16, 'triangle', 0.22, f * 0.94);
  }

  private tone(f: number, t: number, d: number, type: OscillatorType, vol: number, slide?: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g).connect(this.out!);
    osc.start(t);
    osc.stop(t + d + 0.02);
  }

  /** 찰칵: 아주 짧은 높은 소리 */
  private tick(t: number): void {
    this.tone(3200, t, 0.03, 'square', 0.015);
  }
}

/** 게임 전체에 하나 */
export const bgm = new BgmPlayer();
