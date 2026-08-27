import { render, type RenderOptions } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, type InitialEntry } from 'react-router'
import { appRoutes } from '@/app/routes'
import Modal from '@/components/common/Modal'
import { useAuthStore } from '@/stores/useAuthStore'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { registerHarnessCleanup } from '@/test/harnessCleanup'

type TestAuth = {
	accessToken: string
	refreshToken: string
}

type RenderAppRouteOptions = Omit<RenderOptions, 'wrapper'> & {
	auth?: TestAuth | null
	queryClient?: QueryClient
}

const DEFAULT_TEST_AUTH: TestAuth = {
	accessToken: 'test-access-token',
	refreshToken: 'test-refresh-token',
}

export const renderAppRoute = (
	initialEntry: InitialEntry,
	{ auth = DEFAULT_TEST_AUTH, queryClient = createTestQueryClient(), ...renderOptions }: RenderAppRouteOptions = {}
) => {
	if (auth) {
		useAuthStore.getState().setAuth(auth.accessToken, auth.refreshToken)
	} else {
		useAuthStore.getState().clearAuth()
	}

	const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] })
	const renderResult = render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<Modal />
		</QueryClientProvider>,
		renderOptions
	)
	const unregisterCleanup = registerHarnessCleanup(() => {
		router.dispose()
		queryClient.clear()
	})

	return {
		...renderResult,
		queryClient,
		router,
		dispose: () => {
			unregisterCleanup()
			renderResult.unmount()
			router.dispose()
			queryClient.clear()
		},
	}
}
