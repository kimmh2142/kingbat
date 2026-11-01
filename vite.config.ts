import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 하위 경로에서도 동작하도록 상대 경로로 빌드
  base: './',
  server: {
    // 같은 Wi-Fi의 휴대폰에서 접속할 수 있게 LAN에 연다
    host: true,
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
