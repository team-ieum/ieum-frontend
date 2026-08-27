import { QueryClient } from '@tanstack/react-query'

export const createAppQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: false,
				retry: 3,
			},
		},
	})
