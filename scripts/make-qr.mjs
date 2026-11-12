// 타이틀 화면 "폰으로 하기" QR 그림 만들기 (11/12). 주소가 바뀌면 다시 돌린다: node scripts/make-qr.mjs
import QRCode from 'qrcode';

const URL = 'https://kimmh2142.github.io/kingbat/';
await QRCode.toFile('public/assets/qr.png', URL, { width: 600, margin: 2, color: { dark: '#4a3a4aff', light: '#ffffffff' } });
console.log('public/assets/qr.png', URL);
