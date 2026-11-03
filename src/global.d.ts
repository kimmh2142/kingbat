// 테스트(Playwright)와 콘솔 디버깅용으로 노출하는 값
interface Window {
  __kingbat?: {
    player?: { x: number; y: number };
    debug?: boolean;
    target?: { state: string; x: number; y: number; side?: number; left?: number };
    score?: { confirmed: number; temp: number };
    poking?: boolean;
    caught?: number;
    hidden?: boolean;
    hearts?: number;
    cutin?: boolean;
    intro?: boolean;
    failed?: boolean;
    remaining?: number;
    daeri?: { kind?: string; state: string; x: number; y: number; route?: number };
    caughtBy?: Record<string, number>;
    items?: {
      slots: (string | null)[];
      selected: number;
      onMap: { id: string; spot: string; x: number; y: number }[];
      sticking: boolean;
      postit: boolean;
      gum: boolean;
      bag: { x: number; y: number };
      guide?: string;
    };
  };
  __kingbatTest?: { teleport(x: number, y: number): void; setRemaining(seconds: number): void; forceGrab(): void; giveItem(id: string): boolean };
}
