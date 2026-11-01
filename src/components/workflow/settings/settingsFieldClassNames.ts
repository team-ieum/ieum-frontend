import { cn } from '@/utils/cn'

/** 설정 패널 입력 칸 공통 스타일. `aria-invalid`면 테두리를 오류 색으로 바꾼다. */
export const INPUT_CLASS = cn(
	'w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-[#27273b]',
	'placeholder:text-neutral-400 focus:border-main-blue focus:outline-none',
	'aria-invalid:border-[#d4664a]'
)
export const TEXTAREA_CLASS = cn(INPUT_CLASS, 'min-h-20 resize-y leading-relaxed')
