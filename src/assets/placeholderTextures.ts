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

  // ------------------------------------------------------------ 동기 이동기
  [TEX.dongiBody]: {
    // 민트 셔츠 + 넥타이 + 회색 바지
    w: 44,
    h: 40,
    draw: (g, w) => {
      g.fillStyle(0x6d6a7c).fillRect(12, 26, w - 24, 8);
      g.fillStyle(0x4a4458).fillRect(12, 34, 8, 5).fillRect(w - 20, 34, 8, 5);
      g.fillStyle(0xa8e6cf).fillRoundedRect(7, 1, w - 14, 27, 8);
      g.lineStyle(LINE, O).strokeRoundedRect(7, 1, w - 14, 27, 8);
      g.fillStyle(0xffffff).fillTriangle(w / 2 - 7, 2, w / 2 + 7, 2, w / 2, 9);
      g.fillStyle(0xef5350).fillTriangle(w / 2 - 3, 7, w / 2 + 3, 7, w / 2, 22);
    },
  },
  [TEX.dongiBodyBack]: {
    w: 44,
    h: 40,
    draw: (g, w) => {
      g.fillStyle(0x6d6a7c).fillRect(12, 26, w - 24, 8);
      g.fillStyle(0x4a4458).fillRect(12, 34, 8, 5).fillRect(w - 20, 34, 8, 5);
      g.fillStyle(0x94d8bd).fillRoundedRect(7, 1, w - 14, 27, 8);
      g.lineStyle(LINE, O).strokeRoundedRect(7, 1, w - 14, 27, 8);
      g.lineStyle(2, O).lineBetween(w / 2, 6, w / 2, 24);
    },
  },
  [TEX.dongiHeadFront]: {
    // 얼굴 표정은 face_* 를 따로 겹친다
    w: 58,
    h: 56,
    draw: (g) => {
      g.fillStyle(0xfbe0cb).fillCircle(29, 33, 21);
      g.lineStyle(LINE, O).strokeCircle(29, 33, 21);
      g.fillStyle(0xfbe0cb).fillCircle(8, 36, 5).fillCircle(50, 36, 5);
      g.lineStyle(2, O).strokeCircle(8, 36, 5).strokeCircle(50, 36, 5);
      // 부스스한 갈색 머리
      g.fillStyle(0x6b4a3a).slice(29, 33, 22, Math.PI * 1.02, Math.PI * 1.98, false).fillPath();
      g.fillTriangle(12, 22, 20, 6, 24, 20).fillTriangle(24, 16, 32, 4, 36, 16).fillTriangle(36, 18, 46, 8, 46, 24);
      g.lineStyle(2, O).strokeTriangle(12, 22, 20, 6, 24, 20);
      g.lineStyle(2, O).strokeTriangle(36, 18, 46, 8, 46, 24);
    },
  },
  [TEX.dongiHeadBack]: {
    w: 58,
    h: 56,
    draw: (g) => {
      g.fillStyle(0xfbe0cb).fillCircle(8, 36, 5).fillCircle(50, 36, 5);
      g.lineStyle(2, O).strokeCircle(8, 36, 5).strokeCircle(50, 36, 5);
      g.fillStyle(0x6b4a3a).fillCircle(29, 33, 21);
      g.lineStyle(LINE, O).strokeCircle(29, 33, 21);
      g.fillStyle(0x6b4a3a).fillTriangle(12, 22, 20, 6, 24, 20).fillTriangle(24, 16, 32, 4, 36, 16);
      g.fillTriangle(36, 18, 46, 8, 46, 24);
      g.fillStyle(0x86604c).fillEllipse(22, 28, 9, 13);
    },
  },
  // ------------------------------------------------------------ 대리 김카페
  [TEX.daeriBody]: {
    // 베이지 카디건 + 남색 치마
    w: 44,
    h: 40,
    draw: (g, w) => {
      g.fillStyle(0x3f4a7a).fillRoundedRect(11, 24, w - 22, 10, 3);
      g.fillStyle(0xfbe0cb).fillRect(13, 33, 6, 5).fillRect(w - 19, 33, 6, 5);
      g.fillStyle(0x4a4458).fillRect(12, 37, 8, 3).fillRect(w - 20, 37, 8, 3);
      g.fillStyle(0xe8d5b7).fillRoundedRect(7, 1, w - 14, 26, 8);
      g.lineStyle(LINE, O).strokeRoundedRect(7, 1, w - 14, 26, 8);
      g.fillStyle(0xffffff).fillRect(w / 2 - 4, 2, 8, 22);
      g.fillStyle(0x90caf9).fillRect(w / 2 + 6, 10, 6, 8); // 사원증
      g.lineStyle(1, O).strokeRect(w / 2 + 6, 10, 6, 8);
    },
  },
  [TEX.daeriBodyBack]: {
    w: 44,
    h: 40,
    draw: (g, w) => {
      g.fillStyle(0x3f4a7a).fillRoundedRect(11, 24, w - 22, 10, 3);
      g.fillStyle(0xfbe0cb).fillRect(13, 33, 6, 5).fillRect(w - 19, 33, 6, 5);
      g.fillStyle(0x4a4458).fillRect(12, 37, 8, 3).fillRect(w - 20, 37, 8, 3);
      g.fillStyle(0xdcc6a4).fillRoundedRect(7, 1, w - 14, 26, 8);
      g.lineStyle(LINE, O).strokeRoundedRect(7, 1, w - 14, 26, 8);
      // 등까지 내려온 머리
      g.fillStyle(0x4e342e).fillRoundedRect(w / 2 - 9, 0, 18, 16, 6);
    },
  },
  [TEX.daeriHeadFront]: {
    // 단발 + 앞머리, 얼굴 표정은 face_* 를 겹친다
    w: 58,
    h: 56,
    draw: (g) => {
      g.fillStyle(0x4e342e).fillRoundedRect(6, 12, 46, 40, 14);
      g.lineStyle(LINE, O).strokeRoundedRect(6, 12, 46, 40, 14);
      g.fillStyle(0xfbe0cb).fillCircle(29, 33, 19);
      g.lineStyle(LINE, O).strokeCircle(29, 33, 19);
      g.fillStyle(0x4e342e).slice(29, 31, 21, Math.PI * 1.05, Math.PI * 1.95, false).fillPath();
      g.fillStyle(0xf48fb1, 0.5).fillEllipse(16, 40, 6, 3).fillEllipse(42, 40, 6, 3);
    },
  },
  [TEX.daeriHeadBack]: {
    w: 58,
    h: 56,
    draw: (g) => {
      g.fillStyle(0x4e342e).fillRoundedRect(6, 12, 46, 40, 14);
      g.lineStyle(LINE, O).strokeRoundedRect(6, 12, 46, 40, 14);
      g.fillStyle(0x4e342e).fillCircle(29, 31, 21);
      g.lineStyle(LINE, O).strokeCircle(29, 31, 21);
      g.fillStyle(0x6d4c41).fillEllipse(22, 24, 9, 12);
    },
  },
  [TEX.coffeeCup]: {
    w: 16,
    h: 20,
    draw: (g) => {
      g.fillStyle(0xffffff).fillRoundedRect(2, 4, 12, 15, 3);
      g.lineStyle(2, O).strokeRoundedRect(2, 4, 12, 15, 3);
      g.fillStyle(0x8d6e63).fillRect(2, 2, 12, 4);
      g.lineStyle(2, O).strokeRect(2, 2, 12, 4);
      g.fillStyle(0xa1887f).fillRect(3, 10, 10, 4);
    },
  },

  [TEX.dongiHairSpike]: {
    // 진짜 돌아보기 직전: 머리카락이 쭈뼛
    w: 64,
    h: 30,
    draw: (g) => {
      g.fillStyle(0x6b4a3a);
      const spikes = [
        [6, 28, 10, 2, 18, 26],
        [16, 26, 24, 0, 30, 24],
        [28, 24, 34, 0, 40, 24],
        [38, 24, 46, 2, 50, 26],
        [48, 26, 58, 4, 58, 28],
      ];
      for (const [a, b, c, d, e, f] of spikes) {
        g.fillTriangle(a, b, c, d, e, f);
        g.lineStyle(2, O).strokeTriangle(a, b, c, d, e, f);
      }
    },
  },

  // ------------------------------------------------------------ NPC 공용 표정
  [TEX.faceNormal]: {
    w: 40,
    h: 24,
    draw: (g) => {
      g.fillStyle(O).fillEllipse(12, 8, 5, 7).fillEllipse(28, 8, 5, 7);
      g.lineStyle(2, O).beginPath().arc(20, 15, 4, 0.3, Math.PI - 0.3).strokePath();
    },
  },
  [TEX.faceSleepy]: {
    w: 40,
    h: 24,
    draw: (g) => {
      g.lineStyle(2, O).lineBetween(8, 9, 16, 9).lineBetween(24, 9, 32, 9);
      g.fillStyle(O).fillEllipse(20, 18, 6, 4);
    },
  },
  [TEX.faceSuspicious]: {
    // 가늘게 뜬 눈 + 옆으로 흘깃
    w: 40,
    h: 24,
    draw: (g) => {
      g.lineStyle(2, O).lineBetween(6, 5, 17, 7).lineBetween(23, 7, 34, 5);
      g.fillStyle(O).fillEllipse(9, 10, 4, 4).fillEllipse(25, 10, 4, 4);
      g.lineStyle(2, O).lineBetween(16, 18, 24, 17);
    },
  },
  [TEX.facePhone]: {
    // 눈을 아래로 깔고 히죽
    w: 40,
    h: 24,
    draw: (g) => {
      g.fillStyle(O).fillEllipse(12, 11, 5, 4).fillEllipse(28, 11, 5, 4);
      g.lineStyle(2, O).beginPath().arc(20, 15, 5, 0.2, Math.PI - 0.2).strokePath();
    },
  },
  [TEX.faceHappy]: {
    w: 40,
    h: 24,
    draw: (g) => {
      g.lineStyle(2, O).beginPath().arc(12, 10, 4, Math.PI, 0).strokePath();
      g.lineStyle(2, O).beginPath().arc(28, 10, 4, Math.PI, 0).strokePath();
      g.fillStyle(0xe57373).fillCircle(20, 17, 4);
      g.lineStyle(2, O).strokeCircle(20, 17, 4);
    },
  },
  [TEX.faceShock]: {
    w: 40,
    h: 24,
    draw: (g) => {
      g.fillStyle(0xffffff).fillCircle(12, 8, 5).fillCircle(28, 8, 5);
      g.lineStyle(2, O).strokeCircle(12, 8, 5).strokeCircle(28, 8, 5);
      g.fillStyle(O).fillCircle(12, 8, 2).fillCircle(28, 8, 2);
      g.fillStyle(O).fillEllipse(20, 19, 8, 7);
    },
  },
  [TEX.hand]: {
    w: 14,
    h: 14,
    draw: (g) => {
      g.fillStyle(0xfbe0cb).fillCircle(7, 7, 5);
      g.lineStyle(2, O).strokeCircle(7, 7, 5);
    },
  },
  [TEX.phone]: {
    w: 14,
    h: 20,
    draw: (g) => {
      g.fillStyle(0x37474f).fillRoundedRect(1, 1, 12, 18, 3);
      g.lineStyle(2, O).strokeRoundedRect(1, 1, 12, 18, 3);
      g.fillStyle(0x80deea).fillRect(3, 3, 8, 12);
    },
  },
  [TEX.snack]: {
    w: 18,
    h: 18,
    draw: (g) => {
      g.fillStyle(0xffcc80).fillCircle(9, 9, 7);
      g.lineStyle(2, O).strokeCircle(9, 9, 7);
      g.fillStyle(0x8d6e63).fillCircle(7, 7, 1.5).fillCircle(11, 10, 1.5);
    },
  },

  // ------------------------------------------------------------ 표시
  [TEX.angerMark]: {
    // 만화식 핏대 (+자 모양 네 갈래)
    w: 36,
    h: 36,
    draw: (g) => {
      const arm = (x1: number, y1: number, x2: number, y2: number) => {
        g.lineStyle(9, O).lineBetween(x1, y1, x2, y2);
        g.lineStyle(5, 0xef5350).lineBetween(x1, y1, x2, y2);
      };
      arm(18, 4, 18, 13);
      arm(18, 23, 18, 32);
      arm(4, 18, 13, 18);
      arm(23, 18, 32, 18);
    },
  },
  [TEX.targetIcon]: {
    w: 26,
    h: 26,
    draw: (g) => {
      g.fillStyle(0xffffff).fillCircle(13, 13, 11);
      g.lineStyle(3, 0xe53935).strokeCircle(13, 13, 10).strokeCircle(13, 13, 5);
      g.fillStyle(0xe53935).fillCircle(13, 13, 2);
      g.lineStyle(2, O).strokeCircle(13, 13, 12);
    },
  },
  [TEX.stripe]: {
    // 임시 점수 줄무늬
    w: 16,
    h: 16,
    draw: (g, w, h) => {
      g.fillStyle(0xf8bbd0).fillRect(0, 0, w, h);
      // 바깥으로 삐져나간 선은 텍스처 크기로 잘린다
      g.lineStyle(4, 0xf06292);
      for (let i = -16; i <= 32; i += 8) g.lineBetween(i, h, i + 16, 0);
      void w;
    },
  },
  [TEX.heartFull]: {
    w: 30,
    h: 28,
    draw: (g) => drawHeart(g, 0xff4f8b, 0xffb3cd),
  },
  [TEX.heartEmpty]: {
    w: 30,
    h: 28,
    draw: (g) => drawHeart(g, 0xe8dde3, 0xf6eff2),
  },
  [TEX.cutinArrow]: {
    // 들킨 원인 지점을 가리키는 큰 화살표 (아래쪽을 가리킴)
    w: 64,
    h: 80,
    draw: (g) => {
      const pts = [
        { x: 20, y: 2 },
        { x: 44, y: 2 },
        { x: 44, y: 40 },
        { x: 62, y: 40 },
        { x: 32, y: 78 },
        { x: 2, y: 40 },
        { x: 20, y: 40 },
      ];
      g.fillStyle(0xff3d6e).fillPoints(pts, true);
      g.lineStyle(4, O).strokePoints(pts, true);
      g.fillStyle(0xffffff, 0.6).fillRect(25, 8, 6, 26);
    },
  },
};

function drawHeart(g: Phaser.GameObjects.Graphics, fill: number, shine: number): void {
  g.fillStyle(fill);
  g.fillCircle(9, 10, 8).fillCircle(21, 10, 8).fillTriangle(2, 13, 28, 13, 15, 26);
  g.lineStyle(3, O);
  g.beginPath().arc(9, 10, 8, Math.PI * 0.8, Math.PI * 1.95).strokePath();
  g.beginPath().arc(21, 10, 8, Math.PI * 1.05, Math.PI * 0.2).strokePath();
  g.lineBetween(2.5, 14, 15, 26).lineBetween(27.5, 14, 15, 26);
  g.fillStyle(shine).fillCircle(8, 8, 3);
}

export function generatePlaceholders(scene: Phaser.Scene): void {
  for (const [key, def] of Object.entries(DEFS)) {
    if (scene.textures.exists(key)) continue; // 최종 그래픽이 이미 로드됨
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    def.draw(g, def.w, def.h);
    g.generateTexture(key, def.w, def.h);
    g.destroy();
  }
}
