import { TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'
import { ERROR_PAGE_ACTION_LABEL, ROUTE_ERROR_PAGE_TEXT } from '@/constants/errorPage'
import { useNotFoundPageViewModel } from '@/hooks/routing/useNotFoundPageViewModel'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ErrorPageViewModel } from '@/types/errorPage'

export const useRouteErrorViewModel = (): ErrorPageViewModel => {
	const error = useRouteError()
	const navigate = useNavigate()
	const isLoggedIn = useAuthStore(state => Boolean(state.accessToken))
	const notFound = useNotFoundPageViewModel()

	if (isRouteErrorResponse(error) && error.status === 404) return notFound

	return {
		...ROUTE_ERROR_PAGE_TEXT,
		icon: TriangleAlert,
		primaryAction: { label: ERROR_PAGE_ACTION_LABEL.retry, onClick: () => window.location.reload() },
		secondaryAction: {
			label: ERROR_PAGE_ACTION_LABEL.home,
			onClick: () => navigate(isLoggedIn ? '/main' : '/', { replace: true }),
		},
	}
}
