import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import type { NodeReferenceContext } from '@/types/nodeReference'
import type { NodeFieldNotice } from '@/utils/workflow/nodeFieldValue'
import { getAiFieldRule } from '@/utils/workflow/getAiFieldRule'
import { getGoogleCalendarFieldRule } from '@/utils/workflow/getGoogleCalendarFieldRule'
import { getSlackBotFieldRule } from '@/utils/workflow/getSlackBotFieldRule'

/** 설정 칸 하나에 앱 전용 규칙을 입힌 결과. */
export type AppFieldRule = {
	/** 그릴 칸. 규칙이 없으면 카탈로그 칸 그대로다. key·path는 바꾸지 않는다. */
	field: NodeCatalogInputField
	/** 목록 공급원 드롭다운 칸이 값/참조식 전환을 함께 쓰는지. */
	canUseOptionsReference: boolean
	/** 칸 설명 아래에 덧붙이는 안내. 없으면 null이다. */
	notice: NodeFieldNotice | null
}

export type AppFieldRuleContext = {
	/** 칸을 그리는 곳. `aiTool`은 AI 노드 도구 카드의 칸이다(비우면 AI가 값을 정함). */
	target: 'node' | 'aiTool'
	/** 이 노드가 참조할 수 있는 노드 정보. 참조식 값을 검사하는 규칙만 쓰고, 없으면 그 검사를 건너뛴다. */
	references?: NodeReferenceContext
}

/** 앱 하나의 칸 규칙. 디스패처가 카탈로그 `app`으로 골라 부르므로 앱을 다시 검사하지 않는다. */
export type AppFieldRuleGetter = (
	entryId: string,
	field: NodeCatalogInputField,
	value: unknown,
	context: AppFieldRuleContext
) => AppFieldRule

// 카탈로그 항목 `app` → 그 앱의 칸 규칙.
const APP_FIELD_RULES: Partial<Record<string, AppFieldRuleGetter>> = {
	ai: getAiFieldRule,
	google_calendar: getGoogleCalendarFieldRule,
	slack_bot: getSlackBotFieldRule,
}

/**
 * 카탈로그 항목의 앱 전용 칸 규칙을 돌려준다. 규칙이 없는 앱은 칸을 그대로 두고 참조식 전환·안내 없이 돌려준다.
 * 노드 설정 패널의 칸과 AI 도구 카드의 칸(도구 ACTION 항목 기준)이 함께 쓴다.
 */
export const getAppFieldRule = (
	entry: Pick<NodeCatalogEntry, 'id' | 'app'>,
	field: NodeCatalogInputField,
	value: unknown,
	context: AppFieldRuleContext
): AppFieldRule => {
	// 카탈로그 app은 임의 문자열이라 `constructor`처럼 상속 속성 이름이면 그 값을 규칙으로 부르게 되므로 자체 키만 조회한다.
	const getRule = Object.hasOwn(APP_FIELD_RULES, entry.app) ? APP_FIELD_RULES[entry.app] : undefined
	return getRule ? getRule(entry.id, field, value, context) : { field, canUseOptionsReference: false, notice: null }
}
