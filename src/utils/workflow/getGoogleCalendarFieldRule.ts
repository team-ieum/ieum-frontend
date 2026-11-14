import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import type { NodeReferenceContext } from '@/types/nodeReference'
import type { NodeFieldNotice } from '@/utils/workflow/nodeFieldValue'
import { getTimeZoneChoices } from '@/utils/workflow/getTimeZoneChoices'
import { collectNodeReferences } from '@/utils/workflow/nodeReference'

const GOOGLE_CALENDAR_EVENT_PREFIX = 'google_calendar.'
const UPDATE_EVENT = 'google_calendar.update'
const FIND_EVENT = 'google_calendar.find'

// 앞 노드(찾기 등)가 고른 일정·캘린더를 넘겨야 해 선택 전용 드롭다운에 참조식 방식을 함께 둔다.
// 검색(`q`)·ID 직접 입력은 하지 않는다(선택 전용 드롭다운 결정).
const REFERENCE_OPTION_FIELD_KEYS = new Set(['event_id', 'calendar_id'])

// 찾기 출력 `items[].end`. 종일 일정이면 Google 규칙대로 끝난 다음 날(배타)이다.
const FIND_ITEM_END_PATH = /^items(\.\d+)?\.end$/

const EVENT_ID_NOTICE =
	"목록에는 지금 이후 일정만 보여요. 지난 일정이나 앞 노드가 찾은 일정은 참조식으로 넣어 주세요. 반복 일정은 회차를 고르거나 적용 범위를 '반복 전체'로 골라 주세요."
const FIND_END_REFERENCE_NOTICE =
	'찾기 결과의 종료는 종일 일정이면 다음 날이라, 그대로 넣으면 일정이 하루 늘어나요. 종일 일정의 종료는 끝나는 날로 넣어 주세요.'

/** 설정 칸 하나에 Calendar 전용 규칙을 입힌 결과. */
export type GoogleCalendarFieldRule = {
	/** 그릴 칸. 규칙이 없으면 카탈로그 칸 그대로다. key·path는 바꾸지 않는다. */
	field: NodeCatalogInputField
	/** 목록 공급원 드롭다운 칸이 값/참조식 전환을 함께 쓰는지. */
	canUseOptionsReference: boolean
	/** 칸 설명 아래에 덧붙이는 안내. 없으면 null이다. */
	notice: NodeFieldNotice | null
}

const getNotice = (
	entryId: string,
	field: NodeCatalogInputField,
	value: unknown,
	context: NodeReferenceContext | undefined
): NodeFieldNotice | null => {
	if (field.key === 'event_id') return { tone: 'info', message: EVENT_ID_NOTICE }
	if (entryId !== UPDATE_EVENT || field.key !== 'end_datetime' || !context) return null
	const refersFindEnd = collectNodeReferences(value).some(
		reference => context.targets.get(reference.nodeId)?.event === FIND_EVENT && FIND_ITEM_END_PATH.test(reference.path)
	)
	return refersFindEnd ? { tone: 'warning', message: FIND_END_REFERENCE_NOTICE } : null
}

/**
 * Google Calendar 노드(`google_calendar.*`)의 설정 칸 규칙을 돌려준다. 다른 노드의 칸은 규칙 없이 그대로 돌려준다.
 * - 일정·캘린더 드롭다운 칸은 값/참조식 전환을 함께 쓴다.
 * - 수정 노드의 `time_zone`은 IANA 시간대 선택지를 넣어 공통 선택 상자(비우기·목록에 없는 값 보존·참조식 전환 포함)로 그린다.
 * - 일정 칸에는 지난 일정·반복 일정 안내를, 수정 노드의 종료 칸이 찾기 노드의 일정 종료를 참조하면 경고를 붙인다.
 *   경고는 `context`가 있을 때만 검사한다.
 */
export const getGoogleCalendarFieldRule = (
	entryId: string,
	field: NodeCatalogInputField,
	value: unknown,
	context: NodeReferenceContext | undefined
): GoogleCalendarFieldRule => {
	if (!entryId.startsWith(GOOGLE_CALENDAR_EVENT_PREFIX)) return { field, canUseOptionsReference: false, notice: null }
	const hasTimeZoneChoices = entryId === UPDATE_EVENT && field.key === 'time_zone' && !field.choices
	return {
		field: hasTimeZoneChoices ? { ...field, choices: getTimeZoneChoices() } : field,
		canUseOptionsReference: REFERENCE_OPTION_FIELD_KEYS.has(field.key),
		notice: getNotice(entryId, field, value, context),
	}
}
