import { APP_EVENT_TRIGGERS } from '@/constants/workflow/workflowTrigger'

/** 대문자 `triggerType`을 키로 쓰는 트리거 문구. 서버가 모르는 값을 보낼 수 있어 조회하는 곳에서 fallback을 둔다. */
export const INTEGRATION_TRIGGER_LABELS: Record<string, string> = {
	MANUAL: '수동',
	SCHEDULE: '스케줄',
	WEBHOOK: '웹훅',
	EVENT: '이벤트',
	...Object.fromEntries(Object.values(APP_EVENT_TRIGGERS).map(trigger => [trigger.triggerType, trigger.label])),
}
