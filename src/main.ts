import Phaser from 'phaser';
import '@fontsource/jua/index.css';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { OfficeScene } from './scenes/OfficeScene';
import { StoryScene } from './scenes/StoryScene';
import { TitleScene } from './scenes/TitleScene';

// 길게 누를 때 뜨는 컨텍스트 메뉴 막기 (모바일 롱프레스, PC 우클릭)
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Phaser 텍스트는 캔버스에 한 번 그려지면 다시 그리지 않으므로,
// 글꼴(한글 분할 파일 전체)을 미리 받아 둔 뒤 게임을 시작한다.
async function loadFonts(): Promise<void> {
  await document.fonts.ready;
  const faces = [...document.fonts].filter((f) => f.family.replace(/"/g, '') === FONT);
  const all = Promise.all(faces.map((f) => f.load().catch(() => undefined)));
  const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
  await Promise.race([all, timeout]);
}

loadFonts().then(() => {
  document.getElementById('loading')?.remove();
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#3b2a33',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    input: { activePointers: 3 },
    scene: [BootScene, TitleScene, StoryScene, OfficeScene],
  });
});
