import { queryOptions } from '@tanstack/react-query'
import { getOAuthDisconnectWorkflowsPage } from '@/api/oauthDisconnect'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'
import type { IntegrationServiceWorkflowDto } from '@/types/integrationWorkflows'
import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'
import { getDisconnectImpact } from '@/utils/integration/getDisconnectImpact'

const IMPACT_PAGE_SIZE = 100

/** 중간 페이지가 빠지면 해제를 확인할 수 없도록 전체 목록을 하나의 query 결과로 반환한다. */
const getAllIntegrationServiceWorkflows = async (
	provider: OAuthDisconnectProvider,
	signal: AbortSignal
): Promise<IntegrationServiceWorkflowDto[]> => {
	const workflows = new Map<string, IntegrationServiceWorkflowDto>()
	const visitedCursors = new Set<string>()
	let cursor: string | undefined

	while (true) {
		const { data } = await getOAuthDisconnectWorkflowsPage(provider, { cursor, size: IMPACT_PAGE_SIZE }, signal)
		for (const workflow of data.content) workflows.set(workflow.id, workflow)
		if (!data.hasNext) return [...workflows.values()]
		if (!data.nextCursor || visitedCursors.has(data.nextCursor)) {
			throw new Error('워크플로우 목록을 끝까지 확인하지 못했습니다.')
		}
		cursor = data.nextCursor
		visitedCursors.add(cursor)
	}
}

export const oauthDisconnectImpactQueryOptions = (provider: OAuthDisconnectProvider, connectionId: string) =>
	queryOptions({
		queryKey: queryKeys.integrations.oauthDisconnectImpact(provider, connectionId),
		queryFn: ({ signal }) => getAllIntegrationServiceWorkflows(provider, signal),
		select: getDisconnectImpact,
		staleTime: QUERY_STALE_TIME_MS.oauthDisconnectImpact,
		gcTime: 0,
		refetchOnMount: 'always',
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry: false,
	})
