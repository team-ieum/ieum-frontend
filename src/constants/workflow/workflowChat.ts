export const CHAT_STAGE_LABEL: Record<string, string> = {
	designing: '워크플로우를 설계하고 있어요',
	reviewing: '결과를 검토하고 있어요',
}

export const CHAT_STAGE_FALLBACK_LABEL = '응답을 준비하고 있어요'

/** 스크롤바를 보이게 유지하는 시간 (스크롤 멈춘 뒤) */
export const CHAT_SCROLLBAR_VISIBLE_MS = 2000

/** 스크롤바 페이드 아웃 시간 (ms) — CSS transition과 맞출 것 */
export const CHAT_SCROLLBAR_FADE_MS = 500
