import type { IntegrationServiceWorkflowDto } from '@/types/integrationWorkflows'
import type { DisconnectImpact } from '@/types/oauthDisconnect'

/** 해제 후에도 활성 상태로 남아 자동 실행 때마다 실패하는 워크플로우를 표시한다. */
export const getDisconnectImpact = (workflows: IntegrationServiceWorkflowDto[]): DisconnectImpact => {
	const items = workflows.map(({ id, name, active, triggerType }) => ({
		id,
		name,
		isActive: active,
		isAutomaticExecutionAtRisk: active && (triggerType === 'SCHEDULE' || triggerType === 'WEBHOOK'),
	}))

	return { workflows: items, automaticCount: items.filter(item => item.isAutomaticExecutionAtRisk).length }
}
