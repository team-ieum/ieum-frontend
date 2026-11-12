import { isApiError } from '@/utils/ApiError'
import { getAtPath } from '@/utils/workflow/objectPath'
import type { ProviderInfo } from '@/types/credential'
import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'

/** AI 모델 목록 공급원. 이 칸은 비우면 provider 기본 모델로 실행된다. */
export const AI_MODELS_SOURCE = 'ai.models'

// 값이 서비스 내부 UUID라 사용자에게 의미가 없고, 크레덴셜은 키처럼 보여 오해를 부른다.
const INTERNAL_ID_SOURCES = new Set([
	'ieum.credentials',
	'ieum.webhooks',
	'slack.webhooks',
	'discord.webhooks',
	'ieum.mcp_servers',
])

/** 목록 행과 칸 아래에 항목 ID를 함께 보여 줄 공급원인지. 외부 서비스 ID(채널·페이지 등)만 보여 준다. */
export const showsOptionId = (source: string) => !INTERNAL_ID_SOURCES.has(source)

/** 목록 공급원이 있는 단일 문자열 칸만 선택 전용 드롭다운으로 그린다. 나머지는 0-D 입력 칸으로 ID를 직접 받는다. */
export const isOptionsComboboxField = (field: NodeCatalogInputField) =>
	Boolean(field.optionsSource) && field.type === 'string' && !field.list && !field.choices

/**
 * 목록 공급원이 있는 문자열 목록 칸은 고른 항목을 칩으로 보여 주고 드롭다운에서 하나씩 더한다.
 * 칩 목록에는 참조식을 넣을 자리가 없어 참조식을 쓰지 않는 칸(`ref: false`)만 대상으로 한다.
 */
export const isOptionsListField = (field: NodeCatalogInputField) =>
	Boolean(field.optionsSource) && field.type === 'string' && Boolean(field.list) && !field.choices && field.ref === false

export type NodeOptionsInputsState =
	| { status: 'ready'; inputs: Record<string, string> }
	/** 부모 칸이 비었거나 참조식이면 목록을 부르지 않는다. */
	| { status: 'blocked'; reason: 'empty' | 'reference'; parentTitle: string }

/**
 * 연쇄 칸의 부모 값을 options 쿼리로 모은다.
 * 부모 칸은 칸 순서가 아니라 `optionsInputs`의 key로 같은 노드에서 찾는다.
 * 비운 부모 칸에 카탈로그 기본값이 있으면 실행과 같게 그 값으로 부른다(예: 캘린더를 비우면 `primary`).
 */
export const getOptionsInputsState = (
	entry: NodeCatalogEntry,
	node: WorkflowNodeDto,
	field: NodeCatalogInputField
): NodeOptionsInputsState => {
	const inputs: Record<string, string> = {}
	for (const key of field.optionsInputs ?? []) {
		const parent = entry.inputFields.find(item => item.key === key)
		const value = parent ? getAtPath(node, parent.path) : undefined
		const parentTitle = parent?.title ?? key
		if (value === undefined || value === null || String(value).trim() === '') {
			const fallback = parent?.default
			if (typeof fallback === 'string' && fallback.trim() !== '') {
				inputs[key] = fallback
				continue
			}
			return { status: 'blocked', reason: 'empty', parentTitle }
		}
		if (String(value).includes('{{')) return { status: 'blocked', reason: 'reference', parentTitle }
		inputs[key] = String(value)
	}
	return { status: 'ready', inputs }
}

/**
 * 부모 칸이 막혀 목록을 부를 수 없을 때 칸 아래에 보여 줄 이유. 막히지 않았으면 null이다.
 * `canUseReference`면 부모가 참조식일 때 이 칸도 참조식으로 넣으라고 안내한다.
 */
export const getOptionsBlockedMessage = (inputsState: NodeOptionsInputsState, canUseReference = false) => {
	if (inputsState.status !== 'blocked') return null
	if (inputsState.reason === 'empty') return `'${inputsState.parentTitle}' 칸을 먼저 채우면 목록에서 고를 수 있어요.`
	const message = `'${inputsState.parentTitle}' 칸이 참조식이라 목록에서 고를 수 없어요.`
	return canUseReference ? `${message} 이 칸도 '참조식'으로 바꿔 넣어 주세요.` : message
}

/** 드롭다운 칸이 목록을 부르는 데 필요한 정보. */
export type NodeFieldOptions = {
	source: string
	inputsState: NodeOptionsInputsState
	/** 칸이 비었을 때 보여 줄 안내(예: AI 기본 모델). */
	emptyHint?: string
	/** 목록 맨 위 비우기 행 이름. 없으면 '선택 안 함'이다. */
	clearLabel?: string
	/** 드롭다운과 함께 값/참조식 전환을 두는지. 앞 노드 출력을 넘겨야 하는 칸만 켠다(Calendar 일정·캘린더). */
	canUseReference?: boolean
}

export type NodeOptionsErrorNotice = {
	message: string
	/** `connect`면 통합 설정으로 보내고, 그 밖에는 다시 시도를 보여 준다. */
	action: 'connect' | 'retry'
}

const CONNECT_MESSAGES: Record<string, string> = {
	AUTHENTICATION_REQUIRED: '연동이 만료됐어요. 통합 설정에서 다시 연결해 주세요.',
	ACCOUNT_NOT_CONNECTED: '연결된 계정이 없어요. 통합 설정에서 먼저 연결해 주세요.',
	SLACK_NOT_CONNECTED: 'Slack 봇이 연결되지 않았어요. 통합 설정에서 먼저 연결해 주세요.',
	GOOGLE_SCOPE_REQUIRED: 'Google 권한이 더 필요해요. 통합 설정에서 다시 연결해 주세요.',
	TOKEN_REFRESH_FAILED: '연동을 갱신하지 못했어요. 통합 설정에서 다시 연결해 주세요.',
}

const RETRY_MESSAGES: Record<string, string> = {
	UNAUTHORIZED: '로그인이 만료됐어요. 다시 로그인한 뒤 열어 주세요.',
	GOOGLE_RESOURCE_NOT_FOUND: 'Google에서 항목을 찾을 수 없거나 볼 권한이 없어요.',
	NOT_FOUND: '이 칸은 목록을 불러올 수 없어요.',
}

/** options 오류를 code별 안내로 바꾼다. 401이 두 종류라 status가 아니라 code로 구분한다. */
export const getNodeOptionsErrorNotice = (error: unknown): NodeOptionsErrorNotice => {
	if (!isApiError(error)) return { message: '목록을 불러오지 못했어요.', action: 'retry' }
	const code: string = error.code
	if (CONNECT_MESSAGES[code]) return { message: CONNECT_MESSAGES[code], action: 'connect' }
	if (RETRY_MESSAGES[code]) return { message: RETRY_MESSAGES[code], action: 'retry' }
	if (code.endsWith('_API_UNAVAILABLE')) {
		return { message: '연동한 서비스가 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.', action: 'retry' }
	}
	// INVALID_INPUT은 쿼리 값이나 외부 서비스 4xx 이유를 서버 message로 알려 준다.
	if (code === 'INVALID_INPUT' && error.message) return { message: error.message, action: 'retry' }
	return { message: '목록을 불러오지 못했어요.', action: 'retry' }
}

/**
 * options 조회를 다시 시도해도 결과가 달라질 수 있는 오류인지 판정한다.
 * 연동 필요·입력 오류 같은 code는 재시도해도 같으므로 바로 안내하고, 외부 서비스 일시 장애와 네트워크 오류만 재시도한다.
 */
export const isRetryableNodeOptionsError = (error: unknown) =>
	!isApiError(error) || (error.code as string).endsWith('_API_UNAVAILABLE')

/** model 칸을 비웠을 때 실행에 쓰일 provider 기본 모델 이름. 모르면 undefined. */
export const getDefaultModelName = (providers: ProviderInfo[] | undefined, provider: string | undefined) => {
	if (!providers || !provider) return undefined
	const model = providers.find(item => item.provider === provider)?.models.find(item => item.default)
	return model?.displayName
}
