import Phaser from 'phaser';

// 배경 음악 (11/10 "귀엽고 통통거리는 느낌" → "더 신나게 + 8비트"): 소리 파일 없이 브라우저에서 합성하는 직접 작곡한 짧은 반복 곡.
// 8비트 게임기 소리: 네모파(뿅뿅) 멜로디 + 삼각파 베이스 + 둠칫 북(쿵·칫). C 장조, I–vi–IV–V 4마디 × 2 (뒤 4마디는 살짝 변형).
// 장면이 바뀌어도 끊기지 않게 게임 전체에서 하나만 돈다. 소리 끄기(🔊/🔇)는 이 기기에 저장한다.
// 진짜 음악 파일이 생기면 'bgm' 키로 불러오면 그 파일을 대신 튼다.

const MUTE_KEY = 'kingbat.sound.off';
const BPM = 132;
/** 퇴근 직전 등 급할 때 빠르기 */
const BPM_FAST = 156;
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
  private noise: AudioBuffer | null = null;
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
    if (note) this.lead(N[note], t + swing, eighth);
    const bass = BASS[bar % BASS.length];
    if (i === 0) this.bass(N[bass[0]], t);
    if (i === 3) this.bass(N[bass[1]], t + swing);
    if (i === 4) this.bass(N[bass[0]], t);
    // 둠칫: 1·3박 쿵, 2·4박 칫, 뒷박 작은 칫
    if (i === 0 || i === 4) this.kick(t);
    if (i === 2 || i === 6) this.snare(t, 0.09);
    else if (i % 2 === 1) this.snare(t + swing, 0.025);
  }

  /** 8비트 뿅: 네모파, 음 길이의 70%만 울리고 끊는다 (통통 끊기는 맛) */
  private lead(f: number, t: number, eighth: number): void {
    this.tone(f, t, eighth * 0.7, 'square', 0.06);
  }

  /** 8비트 베이스: 짧은 삼각파, 살짝 아래로 미끄러짐 */
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

  /** 쿵: 높은 음에서 뚝 떨어지는 사인 */
  private kick(t: number): void {
    this.tone(160, t, 0.14, 'sine', 0.35, 45);
  }

  /** 칫: 짧은 잡음 */
  private snare(t: number, vol: number): void {
    const ctx = this.ctx!;
    if (!this.noise) {
      const len = Math.floor(ctx.sampleRate * 0.2);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(hp).connect(g).connect(this.out!);
    src.start(t);
    src.stop(t + 0.08);
  }
}

/** 게임 전체에 하나 */
export const bgm = new BgmPlayer();
