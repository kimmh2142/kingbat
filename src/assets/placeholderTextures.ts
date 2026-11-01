import Phaser from 'phaser';
import { COLORS } from '../config';
import { TEX, type TextureKey } from './keys';

// 최종 그래픽 전까지 쓰는 임시 그림. 굵은 외곽선 + 파스텔 톤.
// 소품은 모두 "바닥에 닿는 아래쪽 가운데"가 기준점(origin 0.5, 1)이 되도록 그린다.

const O = COLORS.outline;
const LINE = 3;

type Draw = (g: Phaser.GameObjects.Graphics, w: number, h: number) => void;

const DEFS: Record<TextureKey, { w: number; h: number; draw: Draw }> = {
  [TEX.floorOffice]: {
    w: 64,
    h: 64,
    draw: (g, w, h) => {
      g.fillStyle(COLORS.floorOffice).fillRect(0, 0, w, h);
      g.fillStyle(0xf8dfe7).fillRect(0, 0, w / 2, h / 2).fillRect(w / 2, h / 2, w / 2, h / 2);
      g.lineStyle(1, COLORS.floorOfficeLine).strokeRect(0.5, 0.5, w - 1, h - 1);
    },
  },
  [TEX.floorPantry]: {
    w: 48,
    h: 48,
    draw: (g, w, h) => {
      g.fillStyle(0xe4f5ec).fillRect(0, 0, w, h);
      g.fillStyle(0xd2eddf).fillRect(0, 0, w / 2, h / 2).fillRect(w / 2, h / 2, w / 2, h / 2);
    },
  },
  [TEX.floorHall]: {
    w: 64,
    h: 64,
    draw: (g, w, h) => {
      g.fillStyle(0xf3ece4).fillRect(0, 0, w, h);
      g.lineStyle(1, 0xe6dccf).strokeRect(0.5, 0.5, w - 1, h - 1);
    },
  },

  [TEX.desk]: {
    w: 128,
    h: 80,
    draw: (g, w, h) => {
      // 윗면
      g.fillStyle(0xf6dcb4).fillRoundedRect(2, 2, w - 4, 52, 8);
      g.lineStyle(LINE, O).strokeRoundedRect(2, 2, w - 4, 52, 8);
      // 앞면
      g.fillStyle(0xe2bd8c).fillRect(6, 54, w - 12, h - 58);
      g.lineStyle(LINE, O).strokeRect(6, 54, w - 12, h - 58);
      // 서랍
      g.fillStyle(0xf6dcb4).fillRect(w - 46, 58, 34, h - 66);
      g.lineStyle(2, O).strokeRect(w - 46, 58, 34, h - 66);
      g.fillStyle(O).fillRect(w - 33, 64, 8, 3);
      // 키보드 자리 (앉는 사람 쪽 = 위쪽)
      g.fillStyle(0xffffff).fillRoundedRect(36, 10, 56, 12, 3);
      g.lineStyle(2, O).strokeRoundedRect(36, 10, 56, 12, 3);
    },
  },
  [TEX.monitor]: {
    // 앉은 사람을 향하므로 우리 쪽에선 모니터 뒷면이 보인다
    w: 52,
    h: 44,
    draw: (g, w) => {
      g.fillStyle(0x8f8aa3).fillRoundedRect(2, 2, w - 4, 30, 5);
      g.lineStyle(LINE, O).strokeRoundedRect(2, 2, w - 4, 30, 5);
      g.fillStyle(0x6f6a85).fillRect(w / 2 - 5, 32, 10, 7);
      g.fillStyle(0x6f6a85).fillRoundedRect(w / 2 - 14, 37, 28, 6, 3);
      g.lineStyle(2, O).strokeRoundedRect(w / 2 - 14, 37, 28, 6, 3);
    },
  },
  [TEX.chair]: {
    w: 48,
    h: 52,
    draw: (g, w) => {
      g.fillStyle(0x7d7799).fillRoundedRect(6, 2, w - 12, 30, 10);
      g.lineStyle(LINE, O).strokeRoundedRect(6, 2, w - 12, 30, 10);
      g.fillStyle(0x9e98b8).fillRoundedRect(3, 26, w - 6, 16, 7);
      g.lineStyle(LINE, O).strokeRoundedRect(3, 26, w - 6, 16, 7);
      g.fillStyle(O).fillRect(w / 2 - 2, 42, 4, 6).fillRect(w / 2 - 12, 47, 24, 3);
    },
  },
  [TEX.plantBig]: {
    w: 64,
    h: 100,
    draw: (g, w, h) => {
      const leaf = (x: number, y: number, r: number) => {
        g.fillStyle(0x7cc98a).fillCircle(x, y, r);
        g.lineStyle(LINE, O).strokeCircle(x, y, r);
      };
      leaf(20, 34, 16);
      leaf(44, 34, 16);
      leaf(32, 20, 17);
      leaf(32, 46, 16);
      g.fillStyle(0xa6dfa9).fillCircle(28, 16, 5);
      // 화분
      g.fillStyle(0xf2a679).fillRoundedRect(16, 60, 32, h - 64, 6);
      g.lineStyle(LINE, O).strokeRoundedRect(16, 60, 32, h - 64, 6);
      g.fillStyle(0xf7c19f).fillRect(14, 58, 36, 9);
      g.lineStyle(LINE, O).strokeRect(14, 58, 36, 9);
      void w;
    },
  },
  [TEX.partition]: {
    w: 120,
    h: 72,
    draw: (g, w, h) => {
      g.fillStyle(0xc9d7ef).fillRoundedRect(4, 2, w - 8, h - 12, 6);
      g.lineStyle(LINE, O).strokeRoundedRect(4, 2, w - 8, h - 12, 6);
      // 메모지
      g.fillStyle(0xfff59d).fillRect(18, 12, 18, 18).fillRect(70, 18, 16, 16);
      g.fillStyle(0xf8bbd0).fillRect(44, 22, 16, 16);
      // 다리
      g.fillStyle(O).fillRect(14, h - 10, 6, 10).fillRect(w - 20, h - 10, 6, 10);
    },
  },
  [TEX.paperPile]: {
    w: 56,
    h: 64,
    draw: (g, w, h) => {
      for (let i = 0; i < 6; i++) {
        const y = h - 12 - i * 9;
        const dx = (i % 2) * 4 - 2;
        g.fillStyle(i % 2 ? 0xffffff : 0xfdf6e3).fillRect(6 + dx, y, w - 12, 10);
        g.lineStyle(2, O).strokeRect(6 + dx, y, w - 12, 10);
      }
    },
  },
  [TEX.printer]: {
    w: 84,
    h: 90,
    draw: (g, w, h) => {
      g.fillStyle(0xe8e6f0).fillRoundedRect(4, 20, w - 8, h - 24, 8);
      g.lineStyle(LINE, O).strokeRoundedRect(4, 20, w - 8, h - 24, 8);
      g.fillStyle(0xffffff).fillRect(18, 6, w - 36, 18);
      g.lineStyle(2, O).strokeRect(18, 6, w - 36, 18);
      g.fillStyle(0x6f6a85).fillRect(14, 34, w - 28, 8);
      g.fillStyle(0x81c784).fillCircle(w - 18, 54, 4);
    },
  },
  [TEX.counter]: {
    w: 200,
    h: 76,
    draw: (g, w, h) => {
      g.fillStyle(0xfafafa).fillRect(2, 2, w - 4, 22);
      g.lineStyle(LINE, O).strokeRect(2, 2, w - 4, 22);
      g.fillStyle(0xf3d9b9).fillRect(6, 24, w - 12, h - 28);
      g.lineStyle(LINE, O).strokeRect(6, 24, w - 12, h - 28);
      for (let x = 6; x < w - 12; x += (w - 12) / 3) g.lineStyle(2, O).strokeRect(x, 24, (w - 12) / 3, h - 28);
    },
  },
  [TEX.coffeeMachine]: {
    w: 48,
    h: 60,
    draw: (g, w, h) => {
      g.fillStyle(0x5d5470).fillRoundedRect(4, 2, w - 8, h - 4, 6);
      g.lineStyle(LINE, O).strokeRoundedRect(4, 2, w - 8, h - 4, 6);
      g.fillStyle(0x2e2838).fillRect(12, 10, w - 24, 14);
      g.fillStyle(0xf48fb1).fillCircle(w / 2, 34, 5);
      g.fillStyle(0xffffff).fillRect(w / 2 - 7, h - 16, 14, 12);
    },
  },
  [TEX.water]: {
    w: 44,
    h: 96,
    draw: (g, w, h) => {
      g.fillStyle(0x9fd8f5).fillRoundedRect(8, 2, w - 16, 34, 10);
      g.lineStyle(LINE, O).strokeRoundedRect(8, 2, w - 16, 34, 10);
      g.fillStyle(0xfafafa).fillRoundedRect(4, 36, w - 8, h - 40, 6);
      g.lineStyle(LINE, O).strokeRoundedRect(4, 36, w - 8, h - 40, 6);
      g.fillStyle(0xef5350).fillRect(12, 50, 6, 6);
      g.fillStyle(0x42a5f5).fillRect(w - 18, 50, 6, 6);
    },
  },
  [TEX.fridge]: {
    w: 68,
    h: 120,
    draw: (g, w, h) => {
      g.fillStyle(0xf5f7fa).fillRoundedRect(3, 2, w - 6, h - 4, 8);
      g.lineStyle(LINE, O).strokeRoundedRect(3, 2, w - 6, h - 4, 8);
      g.lineStyle(LINE, O).lineBetween(3, 44, w - 3, 44);
      g.fillStyle(O).fillRect(w - 16, 20, 4, 16).fillRect(w - 16, 54, 4, 24);
      g.fillStyle(0xf48fb1).fillCircle(16, 60, 5);
      g.fillStyle(0xfff59d).fillRect(12, 72, 14, 14);
    },
  },
  [TEX.snackTable]: {
    w: 124,
    h: 72,
    draw: (g, w, h) => {
      g.fillStyle(0xffe0b2).fillRoundedRect(2, 2, w - 4, 44, 10);
      g.lineStyle(LINE, O).strokeRoundedRect(2, 2, w - 4, 44, 10);
      g.fillStyle(0xe8b77f).fillRect(10, 46, 8, h - 48).fillRect(w - 18, 46, 8, h - 48);
      // 간식 바구니
      g.fillStyle(0xd7a86e).fillRoundedRect(36, 8, 52, 22, 6);
      g.lineStyle(2, O).strokeRoundedRect(36, 8, 52, 22, 6);
      g.fillStyle(0xef9a9a).fillCircle(48, 10, 6);
      g.fillStyle(0xfff176).fillCircle(62, 8, 6);
      g.fillStyle(0xa5d6a7).fillCircle(76, 10, 6);
    },
  },
  [TEX.elevator]: {
    w: 150,
    h: 70,
    draw: (g, w, h) => {
      // 위에서 본 엘리베이터 문 (벽에 붙은 띠)
      g.fillStyle(0xcfd8dc).fillRect(2, 2, w - 4, h - 4);
      g.lineStyle(LINE, O).strokeRect(2, 2, w - 4, h - 4);
      g.fillStyle(0xb0bec5).fillRect(12, 12, (w - 30) / 2, h - 24).fillRect(w / 2 + 3, 12, (w - 30) / 2, h - 24);
      g.lineStyle(2, O).strokeRect(12, 12, (w - 30) / 2, h - 24).strokeRect(w / 2 + 3, 12, (w - 30) / 2, h - 24);
    },
  },
  [TEX.toiletDoor]: {
    w: 70,
    h: 96,
    draw: (g, w, h) => {
      g.fillStyle(0x90caf9).fillRoundedRect(4, 2, w - 8, h - 4, 6);
      g.lineStyle(LINE, O).strokeRoundedRect(4, 2, w - 8, h - 4, 6);
      g.fillStyle(0xffffff).fillCircle(w / 2, 26, 12);
      g.lineStyle(2, O).strokeCircle(w / 2, 26, 12);
      g.fillStyle(O).fillCircle(w - 16, h / 2 + 8, 4);
    },
  },
  [TEX.meetingTable]: {
    w: 220,
    h: 110,
    draw: (g, w, h) => {
      g.fillStyle(0xf8bbd0).fillRoundedRect(4, 4, w - 8, h - 24, 40);
      g.lineStyle(LINE, O).strokeRoundedRect(4, 4, w - 8, h - 24, 40);
      g.fillStyle(0xe091ad).fillRect(w / 2 - 10, h - 20, 20, 18);
    },
  },
  [TEX.bossDesk]: {
    w: 180,
    h: 90,
    draw: (g, w, h) => {
      g.fillStyle(0x8d5b45).fillRoundedRect(2, 2, w - 4, 56, 8);
      g.lineStyle(LINE, O).strokeRoundedRect(2, 2, w - 4, 56, 8);
      g.fillStyle(0x6d4234).fillRect(6, 58, w - 12, h - 62);
      g.lineStyle(LINE, O).strokeRect(6, 58, w - 12, h - 62);
    },
  },
  [TEX.lock]: {
    w: 40,
    h: 46,
    draw: (g, w, h) => {
      g.lineStyle(6, O).beginPath().arc(w / 2, 18, 10, Math.PI, 0).strokePath();
      g.lineStyle(3, 0xffd54f).beginPath().arc(w / 2, 18, 10, Math.PI, 0).strokePath();
      g.fillStyle(0xffd54f).fillRoundedRect(4, 18, w - 8, h - 20, 6);
      g.lineStyle(LINE, O).strokeRoundedRect(4, 18, w - 8, h - 20, 6);
      g.fillStyle(O).fillCircle(w / 2, 30, 4).fillRect(w / 2 - 2, 30, 4, 8);
    },
  },

  [TEX.shadow]: {
    w: 44,
    h: 16,
    draw: (g, w, h) => {
      g.fillStyle(0x5a3a4a, 0.22).fillEllipse(w / 2, h / 2, w, h);
    },
  },
  [TEX.playerBody]: {
    // 핑크 카디건 + 짙은 치마 + 짧은 다리
    w: 40,
    h: 34,
    draw: (g, w) => {
      g.fillStyle(0x4a4458).fillRoundedRect(9, 18, w - 18, 10, 3);
      g.fillStyle(0xf6c9a8).fillRect(12, 27, 6, 6).fillRect(w - 18, 27, 6, 6);
      g.fillStyle(0x6d4c41).fillRect(11, 30, 8, 4).fillRect(w - 19, 30, 8, 4);
      g.fillStyle(0xf48fb1).fillRoundedRect(7, 1, w - 14, 21, 7);
      g.lineStyle(LINE, O).strokeRoundedRect(7, 1, w - 14, 21, 7);
      g.fillStyle(0xffffff).fillTriangle(w / 2 - 5, 2, w / 2 + 5, 2, w / 2, 10);
      g.fillStyle(0xf6c9a8).fillCircle(5, 16, 4).fillCircle(w - 5, 16, 4);
      g.lineStyle(2, O).strokeCircle(5, 16, 4).strokeCircle(w - 5, 16, 4);
    },
  },
  [TEX.playerHeadFront]: {
    w: 56,
    h: 54,
    draw: (g) => {
      // 머리 위 똥머리
      g.fillStyle(0x9a5f3f).fillCircle(28, 9, 8);
      g.lineStyle(LINE, O).strokeCircle(28, 9, 8);
      // 얼굴
      g.fillStyle(0xfbe0cb).fillCircle(28, 31, 20);
      g.lineStyle(LINE, O).strokeCircle(28, 31, 20);
      // 앞머리
      g.fillStyle(0x9a5f3f).slice(28, 31, 21, Math.PI * 1.05, Math.PI * 1.95, false).fillPath();
      g.fillStyle(0x9a5f3f).fillCircle(11, 34, 6).fillCircle(45, 34, 6);
      // X 핀
      g.lineStyle(4, 0xffd54f).lineBetween(36, 16, 44, 24).lineBetween(44, 16, 36, 24);
      // 눈, 볼
      g.fillStyle(O).fillEllipse(21, 34, 5, 7).fillEllipse(35, 34, 5, 7);
      g.fillStyle(0xffffff).fillCircle(22, 32, 1.5).fillCircle(36, 32, 1.5);
      g.fillStyle(0xf48fb1, 0.6).fillEllipse(16, 41, 7, 4).fillEllipse(40, 41, 7, 4);
      g.lineStyle(2, O).beginPath().arc(28, 41, 3, 0.2, Math.PI - 0.2).strokePath();
    },
  },
  [TEX.playerHeadBack]: {
    w: 56,
    h: 54,
    draw: (g) => {
      g.fillStyle(0x9a5f3f).fillCircle(28, 9, 8);
      g.lineStyle(LINE, O).strokeCircle(28, 9, 8);
      g.fillStyle(0x9a5f3f).fillCircle(28, 31, 20);
      g.lineStyle(LINE, O).strokeCircle(28, 31, 20);
      g.fillStyle(0xb5754f).fillEllipse(22, 26, 10, 14);
      g.lineStyle(4, 0xffd54f).lineBetween(36, 16, 44, 24).lineBetween(44, 16, 36, 24);
    },
  },
};

export function generatePlaceholders(scene: Phaser.Scene): void {
  for (const [key, def] of Object.entries(DEFS)) {
    if (scene.textures.exists(key)) continue; // 최종 그래픽이 이미 로드됨
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    def.draw(g, def.w, def.h);
    g.generateTexture(key, def.w, def.h);
    g.destroy();
  }
}
