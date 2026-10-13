import { useLocation, useNavigate } from 'react-router'
import notFoundSymbol from '@/assets/404symbol.png'
import { ERROR_PAGE_ACTION_LABEL, NOT_FOUND_PAGE_TEXT } from '@/constants/errorPage'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ErrorPageViewModel } from '@/types/errorPage'

export const useNotFoundPageViewModel = (): ErrorPageViewModel => {
	const navigate = useNavigate()
	const location = useLocation()
	const isLoggedIn = useAuthStore(state => Boolean(state.accessToken))
	// 앱 안에서 이동해 온 경우에만 key가 'default'가 아니다.
	const hasPreviousEntry = location.key !== 'default'

	return {
		...NOT_FOUND_PAGE_TEXT,
		illustrationSrc: notFoundSymbol,
		primaryAction: {
			label: ERROR_PAGE_ACTION_LABEL.home,
			onClick: () => navigate(isLoggedIn ? '/main' : '/', { replace: true }),
		},
		secondaryAction: hasPreviousEntry ? { label: ERROR_PAGE_ACTION_LABEL.back, onClick: () => navigate(-1) } : undefined,
	}
}
