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
    hearts?: number;
    cutin?: boolean;
    failed?: boolean;
    remaining?: number;
    daeri?: { state: string; x: number; y: number; route?: number };
    caughtBy?: Record<string, number>;
  };
  __kingbatTest?: { teleport(x: number, y: number): void; setRemaining(seconds: number): void; forceGrab(): void };
}
