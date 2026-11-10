// 팀원 에셋(public/assets/final)에 없는 그림을 같은 스타일로 그려서 public/assets/final 에 저장한다.
// 팀원 그림처럼 2배 크기, 짙은 자주 외곽선 6px, 아래쪽 살짝 그늘 + 왼쪽 위 광택.
// 사용법: node scripts/make-missing-art.mjs   (브라우저 canvas로 그려서 PNG로 저장)
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT_DIR = 'public/assets/final';
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
const files = await page.evaluate(() => {
  const OUT = '#583848';
  const LW = 6;
  const SKIN = '#fbe2d2';
  const SKIN_SHADE = 'rgba(214,150,140,0.28)';
  const out = {};

  function make(name, w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    x.lineJoin = 'round';
    x.lineCap = 'round';
    draw(x, w, h);
    out[name] = c.toDataURL('image/png').split(',')[1];
  }

  /** 모양 하나: 채우기 → (안쪽만) 아래 그늘·광택 → 외곽선 */
  function shape(x, path, fill, o = {}) {
    x.save();
    x.beginPath();
    path(x);
    x.fillStyle = fill;
    x.fill();
    x.clip();
    if (o.shade !== false) {
      const b = o.box ?? [0, 0, x.canvas.width, x.canvas.height];
      x.fillStyle = o.shadeColor ?? 'rgba(60,20,50,0.13)';
      x.beginPath();
      x.ellipse(b[0] + b[2] / 2 + b[2] * 0.12, b[1] + b[3] * 1.05, b[2] * 0.75, b[3] * 0.42, 0, 0, Math.PI * 2);
      x.fill();
    }
    if (o.gloss) {
      const [gx, gy, gw, gh] = o.gloss;
      x.fillStyle = 'rgba(255,255,255,0.55)';
      x.beginPath();
      x.ellipse(gx, gy, gw, gh, -0.35, 0, Math.PI * 2);
      x.fill();
    }
    x.restore();
    if (o.line !== 0) {
      x.beginPath();
      path(x);
      x.strokeStyle = OUT;
      x.lineWidth = o.line ?? LW;
      x.stroke();
    }
  }
  const rr = (X, Y, W, H, R) => (x) => x.roundRect(X, Y, W, H, R);
  const circ = (X, Y, R) => (x) => x.arc(X, Y, R, 0, Math.PI * 2);
  const ell = (X, Y, RX, RY, rot = 0) => (x) => x.ellipse(X, Y, RX, RY, rot, 0, Math.PI * 2);
  const poly = (...pts) => (x) => {
    x.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
    x.closePath();
  };
  const fillOnly = (x, path, color) => {
    x.beginPath();
    path(x);
    x.fillStyle = color;
    x.fill();
  };
  const stroke = (x, path, color = OUT, w = 4) => {
    x.beginPath();
    path(x);
    x.strokeStyle = color;
    x.lineWidth = w;
    x.stroke();
  };

  // ---------------------------------------------------------------- 몸 (88x80)
  /** 몸통·바지·신발. front()는 몸통 위 장식 (넥타이 등) */
  function body(name, { coat, pants, shoes = '#4a3848', r = 18, front, back }) {
    const torso = rr(12, 3, 64, 52, r);
    make(name, 88, 80, (x) => {
      shape(x, rr(20, 66, 20, 11, 5), shoes, { shade: false });
      shape(x, rr(48, 66, 20, 11, 5), shoes, { shade: false });
      shape(x, rr(22, 48, 44, 22, 6), pants, { shade: false });
      stroke(x, (x) => (x.moveTo(44, 56), x.lineTo(44, 69)), OUT, 4);
      shape(x, torso, coat, { box: [12, 3, 64, 52], gloss: [30, 16, 9, 5] });
      if (front) {
        x.save();
        x.beginPath();
        torso(x);
        x.clip();
        front(x);
        x.restore();
        stroke(x, torso, OUT, LW);
      }
    });
    make(name + '_back', 88, 80, (x) => {
      shape(x, rr(20, 66, 20, 11, 5), shoes, { shade: false });
      shape(x, rr(48, 66, 20, 11, 5), shoes, { shade: false });
      shape(x, rr(22, 48, 44, 22, 6), pants, { shade: false });
      stroke(x, (x) => (x.moveTo(44, 56), x.lineTo(44, 69)), OUT, 4);
      shape(x, torso, back?.coat ?? coat, { box: [12, 3, 64, 52], gloss: [30, 16, 9, 5] });
      if (back?.draw) {
        x.save();
        x.beginPath();
        torso(x);
        x.clip();
        back.draw(x);
        x.restore();
        stroke(x, torso, OUT, LW);
      }
    });
  }
  /** 셔츠 V + 넥타이 */
  const collar = (x, shirt = '#ffffff') => fillOnly(x, poly(30, 0, 58, 0, 44, 22), shirt);
  const tie = (x, color) => {
    shape(x, poly(40, 8, 48, 8, 46, 14, 42, 14), color, { shade: false, line: 3 });
    shape(x, poly(42, 14, 46, 14, 50, 38, 44, 45, 38, 38), color, { shade: false, line: 3 });
  };

  // ---------------------------------------------------------------- 머리 (116x112)
  // 얼굴 중심 (58, 66), 반지름 44. 표정(face_*)은 게임에서 (58, 64) 쯤에 겹친다
  const FX = 58;
  const FY = 66;
  const FR = 44;
  function ears(x) {
    shape(x, circ(13, 72, 11), SKIN, { shade: false, line: 5 });
    shape(x, circ(103, 72, 11), SKIN, { shade: false, line: 5 });
  }
  function face(x) {
    shape(x, circ(FX, FY, FR), SKIN, { box: [FX - FR, FY - FR, FR * 2, FR * 2], shadeColor: SKIN_SHADE });
    // 볼터치
    x.fillStyle = 'rgba(244,143,177,0.35)';
    x.beginPath();
    x.ellipse(31, 82, 8, 5, 0, 0, Math.PI * 2);
    x.ellipse(85, 82, 8, 5, 0, 0, Math.PI * 2);
    x.fill();
  }
  /** 머리카락 덩어리 (광택 포함) */
  const hair = (x, path, color, gloss = [38, 34, 10, 5]) => shape(x, path, color, { gloss, shadeColor: 'rgba(0,0,0,0.16)' });
  /** 정수리부터 이마 선(y)까지 덮는 머리 윗부분 */
  const cap = (yLine, pad = 3) => (x) => {
    const a = Math.asin((yLine - FY) / (FR + pad));
    x.arc(FX, FY, FR + pad, Math.PI - a, Math.PI * 2 + a);
    x.closePath();
  };
  const backHair = (color, gloss = [40, 36, 12, 7]) => (x) => hair(x, circ(FX, FY, FR + 2), color, gloss);

  // ── 과장 박과장: 2:8 가르마 + 번쩍이는 이마 + 콧수염, 남색 조끼 + 주황 넥타이
  body('gwajang_body', {
    coat: '#ffffff',
    pants: '#3b3f5c',
    shoes: '#2a2a3a',
    r: 20,
    front: (x) => {
      fillOnly(x, rr(12, 3, 18, 52, 0), '#3d4a8c');
      fillOnly(x, rr(58, 3, 18, 52, 0), '#3d4a8c');
      stroke(x, (x) => (x.moveTo(30, 3), x.lineTo(30, 55), x.moveTo(58, 3), x.lineTo(58, 55)), OUT, 3);
      tie(x, '#ff9a2e');
      fillOnly(x, circ(64, 36, 3), '#ffe0b2');
      fillOnly(x, circ(64, 46, 3), '#ffe0b2');
    },
    back: { coat: '#3d4a8c', draw: (x) => shape(x, rr(32, 34, 24, 7, 3), '#7986cb', { shade: false, line: 3 }) },
  });
  make('gwajang_head_front', 116, 112, (x) => {
    ears(x);
    face(x);
    // 왼쪽으로 쓸어 넘긴 머리 (오른쪽 이마는 휑)
    hair(x, (x) => {
      x.arc(FX, FY, FR + 3, Math.PI * 0.98, Math.PI * 1.62);
      x.quadraticCurveTo(54, 34, 26, 52);
      x.closePath();
    }, '#2e2a33', [30, 36, 8, 4]);
    hair(x, ell(90, 34, 13, 9, 0.5), '#2e2a33', null);
    // 이마 반짝
    fillOnly(x, ell(66, 34, 11, 5, -0.2), 'rgba(255,255,255,0.85)');
    fillOnly(x, circ(80, 30, 3), 'rgba(255,255,255,0.85)');
    // 콧수염
    shape(x, ell(48, 90, 11, 5, 0.15), '#2e2a33', { shade: false, line: 3 });
    shape(x, ell(68, 90, 11, 5, -0.15), '#2e2a33', { shade: false, line: 3 });
  });
  make('gwajang_head_back', 116, 112, (x) => {
    ears(x);
    backHair('#2e2a33', null)(x);
    shape(x, ell(FX, 38, 22, 14), SKIN, { shade: false, line: 0 });
    fillOnly(x, ell(52, 34, 8, 4, -0.2), 'rgba(255,255,255,0.8)');
  });

  // ── 대표 나대표: 올백 은발 + 하얀 팔자 콧수염 + 굵은 눈썹, 자주 정장 + 금 넥타이
  body('daepyo_body', {
    coat: '#8a3358',
    pants: '#4a2c3a',
    shoes: '#2e1a24',
    front: (x) => {
      collar(x);
      tie(x, '#ffc93c');
      stroke(x, (x) => (x.moveTo(30, 3), x.lineTo(40, 34), x.moveTo(58, 3), x.lineTo(48, 34)), OUT, 3);
      shape(x, poly(58, 16, 68, 16, 66, 10, 62, 13, 60, 9), '#ffd54f', { shade: false, line: 2 });
    },
    back: { coat: '#7a2a4c', draw: (x) => stroke(x, (x) => (x.moveTo(44, 30), x.lineTo(44, 55)), OUT, 3) },
  });
  make('daepyo_head_front', 116, 112, (x) => {
    ears(x);
    face(x);
    hair(x, cap(46), '#dedde6', [40, 32, 12, 5]);
    stroke(x, (x) => (x.moveTo(38, 32), x.lineTo(44, 44), x.moveTo(58, 26), x.lineTo(58, 42), x.moveTo(78, 32), x.lineTo(72, 44)), '#b4b2c2', 4);
    // 굵은 눈썹
    shape(x, rr(30, 50, 20, 6, 3), '#9e9aa8', { shade: false, line: 2 });
    shape(x, rr(66, 50, 20, 6, 3), '#9e9aa8', { shade: false, line: 2 });
    // 팔자 콧수염
    shape(x, (x) => {
      x.moveTo(58, 84);
      x.quadraticCurveTo(44, 80, 32, 92);
      x.quadraticCurveTo(46, 96, 58, 90);
      x.quadraticCurveTo(70, 96, 84, 92);
      x.quadraticCurveTo(72, 80, 58, 84);
      x.closePath();
    }, '#ffffff', { shade: false, line: 3 });
  });
  make('daepyo_head_back', 116, 112, (x) => {
    ears(x);
    backHair('#dedde6')(x);
    stroke(x, (x) => (x.moveTo(40, 32), x.lineTo(40, 98), x.moveTo(58, 24), x.lineTo(58, 106), x.moveTo(76, 32), x.lineTo(76, 98)), '#b4b2c2', 4);
  });

  // ── 비서 김비서: 칼단발 + 분홍 안경, 남색 투피스
  body('biseo_body', {
    coat: '#3446a8',
    pants: '#2a3590',
    shoes: '#1f1f2e',
    front: (x) => {
      fillOnly(x, poly(32, 0, 56, 0, 44, 30), '#ffffff');
      shape(x, circ(44, 10, 4), '#ffd54f', { shade: false, line: 2 });
    },
    back: { coat: '#2e3d96' },
  });
  make('biseo_head_front', 116, 112, (x) => {
    hair(x, rr(12, 22, 92, 84, 26), '#26232f', null);
    face(x);
    // 일자 앞머리
    hair(x, (x) => {
      x.arc(FX, FY, FR + 4, Math.PI * 1.0, Math.PI * 2.0);
      x.lineTo(FX + FR + 4, 52);
      x.lineTo(FX - FR - 4, 52);
      x.closePath();
    }, '#26232f', [40, 34, 12, 5]);
    // 옆머리
    hair(x, rr(12, 50, 16, 56, 8), '#26232f', null);
    hair(x, rr(88, 50, 16, 56, 8), '#26232f', null);
    // 분홍 안경
    x.strokeStyle = '#ec5f8f';
    x.lineWidth = 4;
    x.beginPath();
    x.arc(42, 66, 11, 0, Math.PI * 2);
    x.moveTo(85, 66);
    x.arc(74, 66, 11, 0, Math.PI * 2);
    x.moveTo(53, 66);
    x.lineTo(63, 66);
    x.stroke();
  });
  make('biseo_head_back', 116, 112, (x) => {
    hair(x, rr(12, 18, 92, 90, 30), '#26232f', [40, 36, 12, 7]);
    stroke(x, (x) => (x.moveTo(24, 92), x.lineTo(92, 92)), '#3e3a4c', 4);
  });

  // ── 이사 엄감시: 뾰족 회색 가르마 + 금 외알 안경, 짙은 초록 정장 + 회중시계 줄
  body('isa_body', {
    coat: '#3f6b4f',
    pants: '#2e3b32',
    shoes: '#1c241f',
    r: 14,
    front: (x) => {
      collar(x);
      tie(x, '#22302a');
      x.strokeStyle = '#ffd54f';
      x.lineWidth = 3;
      x.beginPath();
      x.arc(58, 30, 11, 0.2, Math.PI - 0.2);
      x.stroke();
    },
    back: { coat: '#365e45' },
  });
  make('isa_head_front', 116, 112, (x) => {
    ears(x);
    face(x);
    hair(x, (x) => {
      x.arc(FX, FY, FR + 3, Math.PI * 1.0, Math.PI * 2.0);
      x.lineTo(FX + FR + 3, 50);
      x.lineTo(46, 48);
      x.lineTo(30, 24);
      x.lineTo(22, 58);
      x.lineTo(FX - FR - 3, FY);
      x.closePath();
    }, '#8a8a94', [56, 30, 12, 5]);
    // 외알 안경 + 줄
    x.strokeStyle = '#ffc93c';
    x.lineWidth = 5;
    x.beginPath();
    x.arc(74, 66, 13, 0, Math.PI * 2);
    x.stroke();
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(86, 72);
    x.quadraticCurveTo(96, 86, 92, 104);
    x.stroke();
    fillOnly(x, ell(70, 61, 5, 3, -0.5), 'rgba(255,255,255,0.7)');
  });
  make('isa_head_back', 116, 112, (x) => {
    ears(x);
    backHair('#8a8a94')(x);
  });

  // ── 인사팀: 꽉 묶은 똥머리 + 네모 안경, 베이지 정장 + 빨간 목걸이 사원증 + 클립보드
  body('insa_body', {
    coat: '#dcc7a6',
    pants: '#8d7b68',
    shoes: '#5d4e40',
    front: (x) => {
      stroke(x, (x) => (x.moveTo(32, 2), x.lineTo(44, 26), x.lineTo(56, 2)), '#e53935', 4);
      shape(x, rr(36, 26, 16, 18, 3), '#ffffff', { shade: false, line: 3 });
      fillOnly(x, rr(39, 30, 10, 3, 1), '#90caf9');
      shape(x, rr(58, 14, 20, 28, 3), '#a1887f', { shade: false, line: 3 });
      fillOnly(x, rr(61, 19, 14, 20, 1), '#ffffff');
    },
    back: { coat: '#cdb795' },
  });
  make('insa_head_front', 116, 112, (x) => {
    hair(x, circ(FX, 18, 16), '#5a3a30', [52, 12, 5, 3]);
    ears(x);
    face(x);
    hair(x, cap(44), '#5a3a30', [40, 34, 11, 5]);
    x.strokeStyle = OUT;
    x.lineWidth = 4;
    x.beginPath();
    x.roundRect(28, 58, 24, 17, 3);
    x.roundRect(64, 58, 24, 17, 3);
    x.moveTo(52, 64);
    x.lineTo(64, 64);
    x.stroke();
  });
  make('insa_head_back', 116, 112, (x) => {
    ears(x);
    backHair('#5a3a30')(x);
    hair(x, circ(FX, 18, 16), '#5a3a30', [52, 12, 5, 3]);
  });

  // ── 신입: 동글동글 까만 머리 + 바보털, 노란 카디건 + 새싹 배지 + 사원증
  body('newbie_body', {
    coat: '#ffe08a',
    pants: '#6d6a7c',
    front: (x) => {
      collar(x);
      stroke(x, (x) => (x.moveTo(44, 22), x.lineTo(44, 55)), OUT, 3);
      shape(x, ell(24, 22, 7, 4, -0.5), '#81c784', { shade: false, line: 2 });
      shape(x, ell(32, 22, 7, 4, 0.5), '#81c784', { shade: false, line: 2 });
      shape(x, rr(54, 24, 16, 20, 3), '#90caf9', { shade: false, line: 3 });
    },
    back: { coat: '#ffd65e' },
  });
  make('newbie_head_front', 116, 112, (x) => {
    ears(x);
    face(x);
    // 삐죽삐죽 앞머리
    hair(x, (x) => {
      x.arc(FX, FY, FR + 3, Math.PI * 1.08, Math.PI * 1.92);
      x.lineTo(96, 48);
      for (const [px, py] of [[86, 54], [78, 44], [70, 54], [62, 44], [54, 54], [46, 44], [38, 54], [30, 44], [20, 50]]) x.lineTo(px, py);
      x.closePath();
    }, '#3e2a25', [40, 32, 11, 5]);
    stroke(x, (x) => (x.moveTo(58, 22), x.quadraticCurveTo(60, 4, 74, 8)), OUT, 9);
    stroke(x, (x) => (x.moveTo(58, 22), x.quadraticCurveTo(60, 4, 74, 8)), '#3e2a25', 4);
  });
  make('newbie_head_back', 116, 112, (x) => {
    ears(x);
    backHair('#3e2a25')(x);
    stroke(x, (x) => (x.moveTo(58, 22), x.quadraticCurveTo(60, 4, 74, 8)), OUT, 9);
    stroke(x, (x) => (x.moveTo(58, 22), x.quadraticCurveTo(60, 4, 74, 8)), '#3e2a25', 4);
  });

  // ── 차장 오의심: 회색 짧은 머리 + 각진 안경, 회색 정장 + 보라 넥타이
  body('chajang_body', {
    coat: '#7f96a3',
    pants: '#546e7a',
    shoes: '#37474f',
    r: 12,
    front: (x) => {
      collar(x);
      tie(x, '#8e63d2');
    },
    back: { coat: '#738995', draw: (x) => stroke(x, (x) => (x.moveTo(44, 32), x.lineTo(44, 55)), OUT, 3) },
  });
  make('chajang_head_front', 116, 112, (x) => {
    ears(x);
    face(x);
    hair(x, cap(42), '#95a7b2', [40, 34, 11, 5]);
    x.strokeStyle = OUT;
    x.lineWidth = 5;
    x.beginPath();
    x.rect(27, 57, 25, 17);
    x.rect(64, 57, 25, 17);
    x.moveTo(52, 63);
    x.lineTo(64, 63);
    x.stroke();
  });
  make('chajang_head_back', 116, 112, (x) => {
    ears(x);
    backHair('#95a7b2')(x);
  });

  // ---------------------------------------------------------------- 소품
  // 8층 대표실 카펫 (자주빛 + 금색 테두리 무늬, 이어 붙는 타일)
  make('floor_carpet', 128, 128, (x, w, h) => {
    x.fillStyle = '#e8d2e4';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#e2c9de';
    x.fillRect(0, 0, w / 2, h / 2);
    x.fillRect(w / 2, h / 2, w / 2, h / 2);
    x.strokeStyle = '#efdc9c';
    x.lineWidth = 3;
    x.strokeRect(10, 10, w - 20, h - 20);
    x.fillStyle = '#efdc9c';
    x.beginPath();
    x.moveTo(w / 2, h / 2 - 9);
    x.lineTo(w / 2 + 9, h / 2);
    x.lineTo(w / 2, h / 2 + 9);
    x.lineTo(w / 2 - 9, h / 2);
    x.closePath();
    x.fill();
  });

  // 배전반 (STAGE 3 정전): 회색 철함 + 번개 표시 + 빨간 레버
  make('power_panel', 140, 208, (x) => {
    shape(x, rr(8, 6, 124, 196, 14), '#c9c6d4', { box: [8, 6, 124, 196], gloss: [34, 28, 14, 7] });
    shape(x, rr(26, 88, 88, 92, 8), '#5a5470', { shade: false, line: 5 });
    shape(x, poly(76, 22, 52, 58, 68, 58, 60, 82, 90, 44, 72, 44, 82, 22), '#ffd54f', { shade: false, line: 4 });
    shape(x, rr(58, 104, 24, 44, 6), '#3d3850', { shade: false, line: 4 });
    shape(x, rr(54, 110, 32, 22, 8), '#ef5350', { shade: false, gloss: [62, 116, 6, 3], line: 4 });
    for (const yy of [160, 170]) stroke(x, (x) => (x.moveTo(40, yy), x.lineTo(100, yy)), '#7d7794', 3);
  });

  // 펼친 신문 (대표가 읽는 것)
  make('newspaper', 112, 68, (x) => {
    shape(x, rr(4, 4, 104, 60, 6), '#f7f3ea', { box: [4, 4, 104, 60] });
    stroke(x, (x) => (x.moveTo(56, 6), x.lineTo(56, 62)), OUT, 3);
    for (const bx of [12, 64]) {
      fillOnly(x, rr(bx, 12, 36, 8, 2), '#583848');
      for (const yy of [28, 36, 44, 52]) stroke(x, (x) => (x.moveTo(bx, yy), x.lineTo(bx + 36, yy)), '#b9aeb4', 3);
    }
    fillOnly(x, rr(64, 26, 14, 12, 2), '#f48fb1');
  });
  make('newspaper_folded', 60, 28, (x) => {
    shape(x, rr(3, 3, 54, 22, 4), '#f7f3ea', { box: [3, 3, 54, 22] });
    fillOnly(x, rr(9, 8, 22, 5, 2), '#583848');
    stroke(x, (x) => (x.moveTo(9, 18), x.lineTo(50, 18)), '#b9aeb4', 3);
  });

  // 골프 퍼터 (대표 소품)
  make('putter', 40, 92, (x) => {
    stroke(x, (x) => (x.moveTo(24, 10), x.lineTo(22, 78)), OUT, 9);
    stroke(x, (x) => (x.moveTo(24, 10), x.lineTo(22, 78)), '#c9c6d4', 4);
    shape(x, rr(18, 2, 12, 24, 5), '#3d3850', { shade: false, line: 4 });
    shape(x, rr(4, 74, 30, 14, 5), '#5a5470', { shade: false, gloss: [12, 78, 5, 2], line: 4 });
  });

  // 방귀 방석 (STAGE 3 특별 미션)
  make('whoopee_cushion', 92, 60, (x) => {
    shape(x, rr(66, 22, 22, 16, 6), '#f06292', { shade: false, line: 5 });
    shape(x, ell(40, 32, 34, 24), '#f48fb1', { box: [6, 8, 68, 48], gloss: [26, 22, 10, 5] });
    stroke(x, (x) => (x.moveTo(24, 40), x.quadraticCurveTo(40, 48, 56, 40)), '#d6457d', 3);
  });

  // 아이템 아이콘 72x72: 모니터 전원 끄기 / 의자 높이 내리기
  make('item_monitor', 72, 72, (x) => {
    shape(x, rr(26, 50, 20, 10, 3), '#9e98b4', { shade: false, line: 4 });
    shape(x, rr(6, 10, 60, 42, 8), '#5a5470', { box: [6, 10, 60, 42], gloss: [18, 18, 7, 3] });
    fillOnly(x, rr(12, 16, 48, 30, 4), '#3d3850');
    x.strokeStyle = '#ff6b6b';
    x.lineWidth = 5;
    x.beginPath();
    x.arc(36, 32, 9, -Math.PI * 0.3, Math.PI * 1.3);
    x.moveTo(36, 20);
    x.lineTo(36, 31);
    x.stroke();
    shape(x, poly(60, 2, 63, 9, 70, 10, 64, 14, 66, 21, 60, 17, 54, 21, 56, 14, 50, 10, 57, 9), '#ffd54f', { shade: false, line: 2 });
  });
  make('item_chair', 72, 72, (x) => {
    shape(x, rr(14, 4, 34, 32, 10), '#a39cc0', { box: [14, 4, 34, 32], gloss: [24, 12, 6, 3] });
    shape(x, rr(10, 36, 42, 12, 6), '#a39cc0', { shade: false, line: 5 });
    stroke(x, (x) => (x.moveTo(31, 48), x.lineTo(31, 60), x.moveTo(16, 64), x.lineTo(46, 64)), OUT, 6);
    stroke(x, (x) => (x.moveTo(31, 48), x.lineTo(31, 60), x.moveTo(16, 64), x.lineTo(46, 64)), '#7d7794', 2);
    shape(x, poly(54, 10, 66, 10, 66, 34, 72, 34, 60, 50, 48, 34, 54, 34), '#4fc3f7', { shade: false, line: 4 });
  });

  return out;
});
await browser.close();
for (const [name, b64] of Object.entries(files)) writeFileSync(`${OUT_DIR}/${name}.png`, Buffer.from(b64, 'base64'));
console.log(`${Object.keys(files).length}개 저장: ${OUT_DIR}`);
