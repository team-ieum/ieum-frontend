import { QueryClient } from '@tanstack/react-query'

export const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: false,
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	})
