import type { IntegrationBrand } from '@/types/integration'
import type { WorkflowAppTriggerId } from '@/types/workflowList'

type AppEventTrigger = {
	/** 워크플로우·실행 응답의 triggerType 값 */
	triggerType: string
	/** 트리거 노드 event 값 */
	event: string
	label: string
	brand: IntegrationBrand
}

/** 연동 앱 이벤트로 시작하는 트리거. 캔버스·목록·연동·대시보드가 같은 라벨과 로고를 쓴다. */
export const APP_EVENT_TRIGGERS: Record<WorkflowAppTriggerId, AppEventTrigger> = {
	gmailNewEmail: { triggerType: 'GMAIL_NEW_EMAIL', event: 'gmail.new_email', label: 'Gmail 메일', brand: 'gmail' },
	githubNewIssue: { triggerType: 'GITHUB_NEW_ISSUE', event: 'github.new_issue', label: 'GitHub 이슈', brand: 'github' },
}

export const isAppEventTriggerId = (value: string): value is WorkflowAppTriggerId => Object.hasOwn(APP_EVENT_TRIGGERS, value)

const APP_EVENT_TRIGGER_ENTRIES = Object.entries(APP_EVENT_TRIGGERS) as Array<[WorkflowAppTriggerId, AppEventTrigger]>

/** 서버 triggerType(대소문자·앞뒤 공백 무시)에 해당하는 앱 트리거 id를 찾는다. */
export const findAppEventTriggerId = (triggerType: string): WorkflowAppTriggerId | undefined => {
	const normalized = triggerType.trim().toUpperCase()
	return APP_EVENT_TRIGGER_ENTRIES.find(([, trigger]) => trigger.triggerType === normalized)?.[0]
}
