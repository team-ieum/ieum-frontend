import { api } from '@/utils/AxiosInstance'
import type {
	IntegrationServiceType,
	IntegrationServiceWorkflowDto,
	IntegrationServiceWorkflowsResponse,
} from '@/types/integrationWorkflows'

// OAuth 해제 명세의 소문자 경로를 사용하고, 기존 Slack·Discord 조회 경로는 유지한다.
const WORKFLOW_PATH_SERVICE_TYPE: Record<IntegrationServiceType, string> = {
	GOOGLE: 'google',
	NOTION: 'notion',
	GITHUB: 'github',
	SLACK: 'SLACK',
	DISCORD: 'DISCORD',
}

export const getIntegrationServiceWorkflows = async (
	serviceType: IntegrationServiceType,
	params?: { cursor?: string; size?: number },
	signal?: AbortSignal
): Promise<IntegrationServiceWorkflowsResponse> => {
	const response = await api.get<IntegrationServiceWorkflowsResponse>(
		`/api/v1/integrations/${WORKFLOW_PATH_SERVICE_TYPE[serviceType]}/workflows`,
		signal ? { params, signal } : { params }
	)
	return response.data
}

/** 해제 전 영향을 확인하기 위해 마지막 페이지까지 조회한다. 목록이 불완전하면 해제를 진행할 수 없다. */
export const getAllIntegrationServiceWorkflows = async (
	serviceType: IntegrationServiceType,
	signal?: AbortSignal
): Promise<IntegrationServiceWorkflowDto[]> => {
	const workflows = new Map<string, IntegrationServiceWorkflowDto>()
	const visitedCursors = new Set<string>()
	let cursor: string | undefined

	while (true) {
		const { data } = await getIntegrationServiceWorkflows(serviceType, { cursor, size: 100 }, signal)
		for (const workflow of data.content) workflows.set(workflow.id, workflow)
		if (!data.hasNext) return [...workflows.values()]
		if (!data.nextCursor || visitedCursors.has(data.nextCursor)) {
			throw new Error('워크플로우 목록을 끝까지 확인하지 못했습니다.')
		}
		cursor = data.nextCursor
		visitedCursors.add(cursor)
	}
}
