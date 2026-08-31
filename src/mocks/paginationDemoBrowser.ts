import { setupWorker } from 'msw/browser'
import { onPaginationDemoUnhandledRequest, paginationDemoWorkflowListHandler } from '@/mocks/paginationDemo'
import { useAuthStore } from '@/stores/useAuthStore'

const worker = setupWorker(paginationDemoWorkflowListHandler)

export const seedPaginationDemoAuthState = (): void => {
	useAuthStore.setState({
		accessToken: 'pagination-demo-access-token',
		refreshToken: 'pagination-demo-refresh-token',
	})
}

export const startPaginationDemo = (): Promise<ServiceWorkerRegistration | undefined> => {
	seedPaginationDemoAuthState()
	return worker.start({ onUnhandledRequest: onPaginationDemoUnhandledRequest })
}
