import { INTEGRATION_TRIGGER_LABELS } from '@/constants/integration/integrationTriggerLabels'
import { MAX_DISCONNECT_PREVIEW_WORKFLOWS, OAUTH_DISCONNECT_AUTOMATIC_NOTICE } from '@/constants/integration/oauthDisconnect'
import type { IntegrationServiceWorkflowDto } from '@/types/integrationWorkflows'
import type { OAuthDisconnectImpact } from '@/types/oauthDisconnect'

/** 중복을 제거한 전체 조회 결과에서 해제 확인창의 목록과 자동 실행 개수를 구한다. */
export const getOAuthDisconnectImpact = (workflows: IntegrationServiceWorkflowDto[]): OAuthDisconnectImpact => {
	const previewWorkflows: OAuthDisconnectImpact['workflows'] = []
	let automaticCount = 0

	for (const { id, name, active, triggerType } of workflows) {
		const trigger = triggerType.toUpperCase()
		const automaticNotice =
			active && (trigger === 'SCHEDULE' || trigger === 'WEBHOOK') ? OAUTH_DISCONNECT_AUTOMATIC_NOTICE[trigger] : null
		if (automaticNotice !== null) automaticCount += 1
		if (previewWorkflows.length < MAX_DISCONNECT_PREVIEW_WORKFLOWS) {
			previewWorkflows.push({
				id,
				name,
				statusLabel: automaticNotice ? '자동 실행 중' : active ? '활성' : '일시정지',
				triggerLabel: INTEGRATION_TRIGGER_LABELS[trigger] ?? triggerType,
				automaticNotice,
			})
		}
	}

	return { totalCount: workflows.length, automaticCount, workflows: previewWorkflows }
}
