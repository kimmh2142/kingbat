import Phaser from 'phaser';
import { FINAL_ASSETS, FINAL_SCALE } from '../assets/manifest';
import { generatePlaceholders } from '../assets/placeholderTextures';
import { STAGES, stageFromUrl } from '../data/stages';
import { ENDING_STORY } from '../data/dialogue';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const [key, path] of Object.entries(FINAL_ASSETS)) {
      this.load.image(key, `assets/${path}`);
    }
  }

  /**
   * 최종 그래픽(2배 크기)을 게임 속 크기로 줄여 같은 키에 다시 넣는다.
   * 그림을 쓰는 코드의 크기·기준점은 임시 그래픽 기준이라 그대로 둔다
   */
  private shrinkFinals(): void {
    for (const key of Object.keys(FINAL_ASSETS)) {
      if (!this.textures.exists(key)) continue;
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement;
      const w = Math.round(src.width / FINAL_SCALE);
      const h = Math.round(src.height / FINAL_SCALE);
      this.textures.remove(key);
      const c = this.textures.createCanvas(key, w, h)!;
      const ctx = c.getContext();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, w, h);
      c.refresh();
    }
  }

  create(): void {
    this.shrinkFinals();
    // 최종 그래픽이 없는 키만 임시 그래픽으로 채운다
    generatePlaceholders(this);
    // 개발 중 그림 목록표 뽑기용 (scripts/export-art-list.mjs). 빌드에는 빠진다
    if (import.meta.env.DEV) window.__kingbatTexture = (key: string) => this.textures.getBase64(key);
    // 처음 접속하면 타이틀 화면. Playwright 확인 스크립트는 바로 게임으로 (?title=1이면 타이틀), ?overview도 바로 게임
    const params = new URLSearchParams(location.search);
    // ?stage=N: 타이틀·도입 컷신 없이 그 스테이지부터 (연습·개발용). 아직 없는 스테이지면 예고 화면
    // ?stage=N&story=1: 그 스테이지 도입 컷신부터
    if (params.has('ending')) {
      this.scene.start(params.get('ending') === 'result' ? 'Ending' : 'Story', { stage: ENDING_STORY });
      return;
    }
    const stage = stageFromUrl();
    if (stage !== null) {
      if (!STAGES[stage]) this.scene.start('ComingSoon', { stage });
      else this.scene.start(params.has('story') ? 'Story' : 'Office', { stage });
      return;
    }
    const skipTitle = params.has('overview') || (navigator.webdriver && !params.has('title'));
    this.scene.start(skipTitle ? 'Office' : 'Title');
  }
}
