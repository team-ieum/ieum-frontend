import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Tailwind 클래스를 병합하고 조건부로 깔끔하게 적용해주는 함수
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
