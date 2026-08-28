import { useCallback } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { SidebarNavId } from '@/constants/layout'
import { credentialsQueryOptions, providersQueryOptions } from '@/hooks/aiCredentials/queries/aiCredentialsQueryOptions'
import {
	workflowDashboardErrorsQueryOptions,
	workflowDashboardExecutionsQueryOptions,
	workflowDashboardSummaryQueryOptions,
} from '@/hooks/dashboard/queries/workflowDashboardQueryOptions'
import { oauthConnectionsQueryOptions } from '@/hooks/oauthConnections/queries/oauthConnectionsQueryOptions'
import { workflowListQueryOptions } from '@/hooks/workflow/queries/workflowListQueryOptions'
import { webhookCredentialsQueryOptions } from '@/hooks/webhookCredentials/queries/webhookCredentialsQueryOptions'

type RouteDataPrefetcher = (queryClient: QueryClient) => void

const PREFETCH_QUERY_POLICY = { retry: false } as const

const ROUTE_DATA_PREFETCHERS: Record<SidebarNavId, RouteDataPrefetcher> = {
	dashboard: queryClient => {
		void queryClient.prefetchQuery({ ...workflowDashboardSummaryQueryOptions(), ...PREFETCH_QUERY_POLICY })
		void queryClient.prefetchInfiniteQuery({ ...workflowDashboardExecutionsQueryOptions(), ...PREFETCH_QUERY_POLICY })
		void queryClient.prefetchInfiniteQuery({ ...workflowDashboardErrorsQueryOptions(), ...PREFETCH_QUERY_POLICY })
	},
	canvas: queryClient => {
		void queryClient.prefetchInfiniteQuery({ ...workflowListQueryOptions(), ...PREFETCH_QUERY_POLICY })
	},
	refs: queryClient => {
		void queryClient.prefetchQuery({ ...oauthConnectionsQueryOptions(), ...PREFETCH_QUERY_POLICY })
		void queryClient.prefetchQuery({ ...webhookCredentialsQueryOptions(), ...PREFETCH_QUERY_POLICY })
		void queryClient.prefetchQuery({ ...providersQueryOptions(), ...PREFETCH_QUERY_POLICY })
		void queryClient.prefetchQuery({ ...credentialsQueryOptions(), ...PREFETCH_QUERY_POLICY })
	},
	settings: () => undefined,
}

export const useSidebarRouteDataPrefetch = () => {
	const queryClient = useQueryClient()

	return useCallback((navId: SidebarNavId) => ROUTE_DATA_PREFETCHERS[navId](queryClient), [queryClient])
}
