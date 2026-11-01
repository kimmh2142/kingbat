// 테스트(Playwright)와 콘솔 디버깅용으로 노출하는 값
interface Window {
  __kingbat?: {
    player?: { x: number; y: number };
    debug?: boolean;
    target?: { state: string; x: number; y: number; side?: number };
    score?: { confirmed: number; temp: number };
    poking?: boolean;
    caught?: number;
    hidden?: boolean;
  };
  __kingbatTest?: { teleport(x: number, y: number): void };
}
