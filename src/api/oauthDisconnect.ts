import { isOAuthDisconnectProvider, type OAuthDisconnectProvider } from '@/constants/integration/oauthDisconnect'
import type { IntegrationServiceWorkflowDto, IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'
import { isApiError } from '@/utils/ApiError'
import { api } from '@/utils/AxiosInstance'

const IMPACT_PAGE_SIZE = 100

const assertSupportedProvider = (provider: OAuthDisconnectProvider) => {
	if (!isOAuthDisconnectProvider(provider)) throw new Error(`해제할 수 없는 OAuth 공급자입니다: ${provider}`)
}

/** 목록이 불완전하면 해제를 진행할 수 없으므로 마지막 페이지까지 읽는다. */
export const getAllIntegrationServiceWorkflows = async (
	provider: OAuthDisconnectProvider,
	signal?: AbortSignal
): Promise<IntegrationServiceWorkflowDto[]> => {
	assertSupportedProvider(provider)
	const path = `/api/v1/integrations/${provider.toLowerCase()}/workflows`
	const workflows = new Map<string, IntegrationServiceWorkflowDto>()
	const visitedCursors = new Set<string>()
	let cursor: string | undefined

	while (true) {
		const params = { cursor, size: IMPACT_PAGE_SIZE }
		const { data: response } = await api.get<IntegrationServiceWorkflowsResponse>(
			path,
			signal ? { params, signal } : { params }
		)
		const { content, hasNext, nextCursor } = response.data
		for (const workflow of content) workflows.set(workflow.id, workflow)
		if (!hasNext) return [...workflows.values()]
		if (!nextCursor || visitedCursors.has(nextCursor)) {
			throw new Error('워크플로우 목록을 끝까지 확인하지 못했습니다.')
		}
		cursor = nextCursor
		visitedCursors.add(cursor)
	}
}

/** Notion·GitHub 연결을 해제한다. 다른 화면에서 이미 해제한 경우에도 완료로 처리한다. */
export const deleteIntegrationOAuthConnection = async (provider: OAuthDisconnectProvider): Promise<void> => {
	assertSupportedProvider(provider)
	try {
		await api.delete(`/api/v1/oauth/connections/${provider}`)
	} catch (error) {
		if (!isApiError(error)) throw error
		const code: string = error.code
		if (code !== 'ACCOUNT_NOT_CONNECTED') throw error
	}
}
