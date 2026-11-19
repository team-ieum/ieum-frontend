import type { IntegrationServiceWorkflowDto } from '@/types/integrationWorkflows'
import { formatAffectedWorkflowsNotice } from '@/utils/integration/formatAffectedWorkflowsNotice'

/** 전체 영향 목록을 확인 문구로 요약하고, 해제 후에도 자동 실행되는 워크플로우 수를 알린다. */
export const formatDisconnectImpactNotice = (workflows: IntegrationServiceWorkflowDto[]): string => {
	const notice = formatAffectedWorkflowsNotice({ names: workflows.map(workflow => workflow.name), hasMore: false })
	const automaticCount = workflows.filter(
		({ active, triggerType }) => active && (triggerType === 'SCHEDULE' || triggerType === 'WEBHOOK')
	).length

	return automaticCount > 0 ? `${notice} 이 중 ${automaticCount}개는 연결을 해제해도 계속 자동 실행을 시도해요.` : notice
}
