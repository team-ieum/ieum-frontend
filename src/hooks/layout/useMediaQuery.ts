import { useCallback, useSyncExternalStore } from 'react'

/** CSS media query의 현재 일치 여부를 구독한다. */
export const useMediaQuery = (query: string): boolean => {
	const subscribe = useCallback(
		(onChange: () => void) => {
			const mediaQueryList = window.matchMedia(query)
			mediaQueryList.addEventListener('change', onChange)
			return () => mediaQueryList.removeEventListener('change', onChange)
		},
		[query]
	)

	return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
