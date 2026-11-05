import { cn } from '@/utils/cn'

/** 설정 패널 입력 칸 공통 스타일. `aria-invalid`면 테두리를 오류 색으로 바꾼다. */
export const INPUT_CLASS = cn(
	'w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-[#27273b]',
	'placeholder:text-neutral-400 focus:border-main-blue focus:outline-none',
	'aria-invalid:border-[#d4664a]'
)
export const TEXTAREA_CLASS = cn(INPUT_CLASS, 'min-h-20 resize-y leading-relaxed')

/** 설정 패널 선택 목록 팝업(채팅 'AI 모델' 메뉴 모양). 칸 아래에 띄운다. */
export const DROPDOWN_POPUP_CLASS =
	'absolute inset-x-0 top-[calc(100%+6px)] z-20 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_16px_32px_-12px_rgba(16,24,40,.22)]'
/** 선택 목록의 한 행. 강조·현재 값 배경은 사용처가 덧붙인다. */
export const DROPDOWN_OPTION_CLASS =
	'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 typo-body3_regular transition-colors motion-reduce:transition-none'
