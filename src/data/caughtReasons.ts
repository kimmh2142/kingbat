// 들킴 원인 컷인 문구 (기준 문서 2-6)
export const CAUGHT_REASONS = {
  turned: { text: '뒤돌아봤다!', tip: '손이 키보드를 떠나면 위험!' },
  monitor: { text: '모니터에 비쳤다!', tip: '모니터 정면 뒤쪽은 피하자' },
  secretary: { text: '비서에게 들켰다!', tip: '비서가 복사기로 가면 기회' },
  bossRage: { text: '부장 호통에 모두가 돌아봤다!', tip: '분노 게이지가 차면 파티션 뒤로' },
  callEnded: { text: '통화가 끝났다!', tip: '"그럼 이따 뵙겠습니다"는 중단 신호' },
  doubleCheck: { text: '두 번 확인했다!', tip: '돌아선 뒤 조용하면 한 번 더 본다' },
  footsteps: { text: '발소리를 들켰다!', tip: '가까이선 천천히 걷자' },
  sticking: { text: '붙이다 들켰다!', tip: '붙이는 데 시간이 걸려. 전조부터 보자' },
  filing: { text: '서류 끼우다 들켰다!', tip: '과장이 돌아오는 길부터 확인하자' },
  cushion: { text: '방석 깔다 들켰다!', tip: '대표가 돌아오기 전에 깔고 빠지자' },
  hr: { text: '인사팀에게 걸렸다!', tip: '엘리베이터 "띵—" 소리가 나면 숨자' },
  escaping: { text: '도망치다 들켰다!', tip: '복귀 경로를 먼저 확인하자' },
  trashMoved: { text: '쓰레기통이 움직였다!', tip: '쓰레기통 안에선 보일 때 멈추자' },
} as const;

export type CaughtReasonId = keyof typeof CAUGHT_REASONS;

/** "뒤돌아봤다!" 팁은 공략 대상마다 진짜 전조가 달라서 따로 (11/10. 동기 문장이 과장·대표에도 나오던 문제) */
const TURNED_TIP: Record<string, string> = {
  dongi: '손이 키보드를 떠나면 위험!',
  gwajang: '"…잠깐만요" 하고 수화기를 막으면 돌아본다!',
  daepyo: '신문을 접어 내려놓으면 돌아본다!',
};

/** 들킴 컷인·실패 화면의 한 줄 팁 */
export function caughtTip(reason: CaughtReasonId, targetId: string): string {
  return (reason === 'turned' && TURNED_TIP[targetId]) || CAUGHT_REASONS[reason].tip;
}
