// 들킴 원인 컷인 문구 (기준 문서 2-6)
export const CAUGHT_REASONS = {
  turned: { text: '뒤돌아봤다!', tip: '손이 키보드를 떠나면 위험!' },
  monitor: { text: '모니터에 비쳤다!', tip: '모니터 정면 뒤쪽은 피하자' },
  secretary: { text: '비서에게 들켰다!', tip: '비서가 복사기로 가면 기회' },
  bossRage: { text: '부장 호통에 모두가 돌아봤다!', tip: '분노 게이지가 차면 파티션 뒤로' },
  callEnded: { text: '통화가 끝났다!', tip: '"그럼 이따 뵙겠습니다"는 중단 신호' },
  doubleCheck: { text: '두 번 확인했다!', tip: '돌아선 뒤 조용하면 한 번 더 본다' },
  footsteps: { text: '발소리를 들켰다!', tip: '가까이선 천천히 걷자' },
  escaping: { text: '도망치다 들켰다!', tip: '복귀 경로를 먼저 확인하자' },
} as const;

export type CaughtReasonId = keyof typeof CAUGHT_REASONS;
