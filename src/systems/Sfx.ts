import Phaser from 'phaser';

/** 효과음 이름. 진짜 소리 파일이 생기면 `sfx-<이름>` 키로 불러오면 그 파일을 대신 튼다 */
export type SfxName = 'poke' | 'stick' | 'gum' | 'pick' | 'confirm' | 'caught' | 'clear' | 'fail';

type Note = { f: number; t: number; d: number; type?: OscillatorType; slide?: number; vol?: number };

/** 임시 효과음 (파일 없이 브라우저에서 합성): 시작 시각 t초, 길이 d초, 주파수 f → slide */
const SYNTH: Record<SfxName, Note[]> = {
  // 뽁: 짧게 위로 튀는 소리
  poke: [{ f: 520, slide: 900, t: 0, d: 0.07, type: 'square', vol: 0.12 }],
  // 착: 짧고 낮은 탁 + 높은 착
  stick: [
    { f: 220, slide: 120, t: 0, d: 0.06, type: 'square', vol: 0.18 },
    { f: 1200, slide: 1600, t: 0.03, d: 0.05, type: 'triangle', vol: 0.12 },
  ],
  // 쪽: 늘어나는 껌
  gum: [{ f: 300, slide: 700, t: 0, d: 0.16, type: 'sine', vol: 0.2 }],
  // 뾰롱: 아이템 줍기
  pick: [
    { f: 880, t: 0, d: 0.07, type: 'triangle', vol: 0.15 },
    { f: 1320, t: 0.07, d: 0.1, type: 'triangle', vol: 0.15 },
  ],
  // 띠링: 점수 확정
  confirm: [
    { f: 1046, t: 0, d: 0.08, type: 'sine', vol: 0.2 },
    { f: 1568, t: 0.08, d: 0.22, type: 'sine', vol: 0.2 },
  ],
  // 쾅: 들킴
  caught: [
    { f: 160, slide: 50, t: 0, d: 0.35, type: 'sawtooth', vol: 0.25 },
    { f: 90, slide: 40, t: 0, d: 0.4, type: 'square', vol: 0.15 },
  ],
  // 빠밤빠밤~: 클리어
  clear: [
    { f: 523, t: 0, d: 0.12, type: 'square', vol: 0.12 },
    { f: 659, t: 0.12, d: 0.12, type: 'square', vol: 0.12 },
    { f: 784, t: 0.24, d: 0.12, type: 'square', vol: 0.12 },
    { f: 1046, t: 0.36, d: 0.45, type: 'square', vol: 0.12 },
  ],
  // 뿌우~: 실패
  fail: [
    { f: 392, slide: 370, t: 0, d: 0.3, type: 'triangle', vol: 0.2 },
    { f: 349, slide: 330, t: 0.3, d: 0.3, type: 'triangle', vol: 0.2 },
    { f: 294, slide: 220, t: 0.6, d: 0.6, type: 'triangle', vol: 0.2 },
  ],
};

/** 효과음. 소리를 못 내는 환경(오디오 꺼짐, 아직 화면을 안 눌러서 막힘)이면 조용히 넘어간다 */
export class Sfx {
  /** 튼 순서 (확인 스크립트용, 최근 20개) */
  readonly log: SfxName[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  play(name: SfxName): void {
    this.log.push(name);
    if (this.log.length > 20) this.log.shift();
    const key = `sfx-${name}`;
    if (this.scene.cache.audio.exists(key)) {
      this.scene.sound.play(key);
      return;
    }
    const sound = this.scene.sound;
    if (!(sound instanceof Phaser.Sound.WebAudioSoundManager) || sound.mute) return;
    const ctx = sound.context;
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    for (const n of SYNTH[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type ?? 'sine';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide, now + n.t + n.d);
      const vol = (n.vol ?? 0.15) * sound.volume;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(vol, now + n.t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    }
  }
}
