import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import { isApiError } from '@/utils/ApiError'

/** 실행하지 않고 수신 주소로 들어오는 첫 요청을 기다리는 테스트 방식의 event */
const WEBHOOK_CATCH_EVENT = 'webhook.catch'

/** 서버 수신 대기 시간(`WebhookListenStore.TTL`). 응답의 `expiresAt`을 믿을 수 없을 때 쓴다. */
const LISTEN_DURATION_MS = 5 * 60_000
/** 화면과 서버 시계가 이만큼까지 어긋난 `expiresAt`은 그대로 쓴다. */
const LISTEN_CLOCK_SKEW_MS = 60_000

export const isWebhookCatch = (entry: NodeCatalogEntry | undefined) => entry?.id === WEBHOOK_CATCH_EVENT

/** 테스트 요청의 `input`을 트리거 출력으로 쓰는 event. 서버는 다른 노드의 `input`을 무시한다. */
const MANUAL_RUN_EVENT = 'manual.run'

export const isManualRun = (entry: NodeCatalogEntry | undefined) => entry?.id === MANUAL_RUN_EVENT

type ManualRunInputParseResult = { ok: true; input?: Record<string, unknown> } | { ok: false; error: string }

/**
 * `manual.run` 테스트 입력 칸의 JSON을 요청 `input`으로 바꾼다. 비어 있으면 입력 없이 테스트한다(`input` 없음).
 * 서버 `input`은 객체만 받으므로 배열·null·문자열·숫자는 거부한다.
 */
export const parseManualRunInput = (text: string): ManualRunInputParseResult => {
	if (!text.trim()) return { ok: true }
	let parsed: unknown
	try {
		parsed = JSON.parse(text)
	} catch {
		return { ok: false, error: 'JSON 형식이 올바르지 않아요.' }
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		return { ok: false, error: '중괄호로 감싼 객체({ … })만 넣을 수 있어요.' }
	}
	return { ok: true, input: parsed as Record<string, unknown> }
}

export type NodeTestAvailability = { canTest: true } | { canTest: false; reason: string }

type NodeTestConditions = {
	/** 편집 중인 노드가 저장본과 같은지. 수신 샘플은 저장된 노드 config로 만들어진다. */
	isSaved: boolean
	/** 수신 주소 발급 여부. 아직 모르면 `undefined`다. */
	isTokenIssued: boolean | undefined
}

/**
 * 노드를 테스트할 수 있는지와, 없으면 화면에 보여 줄 사유. 카탈로그 항목을 찾지 못한 노드는 `entry`가 없다.
 * `webhook.catch`만 저장 여부와 수신 주소 발급 여부를 따진다.
 */
export const getNodeTestAvailability = (
	entry: NodeCatalogEntry | undefined,
	{ isSaved, isTokenIssued }: NodeTestConditions
): NodeTestAvailability => {
	if (!entry) return { canTest: false, reason: '지원하지 않는 작업이라 테스트할 수 없어요.' }
	if (!isWebhookCatch(entry)) return { canTest: true }
	if (!isSaved) return { canTest: false, reason: '저장한 뒤 테스트할 수 있어요. 받은 요청은 저장된 설정으로 처리돼요.' }
	if (isTokenIssued === undefined) return { canTest: false, reason: '수신 주소를 확인하고 있어요.' }
	if (!isTokenIssued) return { canTest: false, reason: '수신 주소를 먼저 만들어 주세요.' }
	return { canTest: true }
}

/** 수신 대기 한 번의 시간 범위(epoch ms). */
type ListenWindow = {
	/** 서버 시계로 대기를 시작한 시각. 서버 시각인 샘플 `testedAt`과만 비교한다. */
	serverStartedAt: number
	/** 화면 시계로 대기가 끝나는 시각. 남은 시간 표시와 폴링 종료에 쓴다. */
	deadline: number
}

/**
 * `LISTENING` 응답의 `expiresAt`(`…Z` 또는 오프셋 없는 서버 시각)으로 대기 범위를 정한다.
 * 서버는 `expiresAt = 시작 + TTL`이고 샘플 `testedAt`도 같은 서버 시계로 기록하므로, 시작 시각은 서버 값에서 거꾸로 구한다.
 * 화면 시계와 ±1분 넘게 어긋나면 끝 시각은 지금부터 5분으로 본다. `expiresAt`을 읽지 못하면 화면 시계로 시작 시각을 대신한다.
 */
export const getListenWindow = (expiresAt: string | undefined, now: number): ListenWindow => {
	const fallbackDeadline = now + LISTEN_DURATION_MS
	const serverExpiresAt = expiresAt ? Date.parse(expiresAt) : Number.NaN
	if (Number.isNaN(serverExpiresAt)) return { serverStartedAt: now, deadline: fallbackDeadline }
	const isClockClose = Math.abs(serverExpiresAt - fallbackDeadline) <= LISTEN_CLOCK_SKEW_MS
	return {
		serverStartedAt: serverExpiresAt - LISTEN_DURATION_MS,
		deadline: isClockClose ? serverExpiresAt : fallbackDeadline,
	}
}

/** 샘플이 대기를 시작한 뒤 서버에 기록됐는지. `testedAt`이 없거나 읽지 못하면 받은 것으로 보지 않는다. */
export const isSampleRecordedSince = (testedAt: string | undefined, serverStartedAt: number) => {
	const recordedAt = testedAt ? Date.parse(testedAt) : Number.NaN
	return !Number.isNaN(recordedAt) && recordedAt >= serverStartedAt
}

/** 남은 대기 시간을 `4:05`처럼 보여 준다. 1초 미만은 올려 0:00이 되기 전까지 0을 보이지 않는다. */
export const formatRemainingTime = (remainingMs: number) => {
	const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
	return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
}

/** 메시지 발송·HTTP 요청·AI 사용량 차감처럼 되돌릴 수 없는 일을 하는 노드인지. 실행 전에 한 번 더 확인받는다. */
export const requiresRunConfirm = (entry: NodeCatalogEntry) => entry.kind === 'action'

/**
 * `TEST_SAMPLE_MISSING` 오류가 알려 준, 먼저 테스트해야 하는 노드 id 목록.
 * 그 밖의 오류이거나 `data` 형태가 다르면 빈 배열이다.
 */
export const getMissingSampleNodeIds = (error: unknown): string[] => {
	if (!isApiError(error) || error.code !== 'TEST_SAMPLE_MISSING') return []
	const data = error.data
	if (typeof data !== 'object' || data === null || !('missingNodeIds' in data)) return []
	const { missingNodeIds } = data
	if (!Array.isArray(missingNodeIds)) return []
	return missingNodeIds.filter((id): id is string => typeof id === 'string')
}

const DEFAULT_ERROR_MESSAGE = '테스트하지 못했어요. 잠시 후 다시 시도해 주세요.'

/**
 * 노드 테스트 요청 오류를 화면 문구로 바꾼다.
 * `PROVIDER_*` message는 "LLM 프로바이더 …" 같은 내부 문구라 보여 주지 않는다.
 */
export const getNodeTestErrorMessage = (error: unknown): string => {
	if (!isApiError(error)) return DEFAULT_ERROR_MESSAGE
	const code: string = error.code
	// 만료된 access token도 TOKEN_EXPIRED가 아니라 UNAUTHORIZED로 와서 자동 갱신되지 않는다(BE 수정 대기).
	if (code === 'UNAUTHORIZED') return '로그인이 만료됐어요. 다시 로그인한 뒤 테스트해 주세요.'
	if (code.startsWith('PROVIDER_')) return 'AI 제공자가 응답하지 않아요. 잠시 후 다시 시도해 주세요.'
	if (code === 'WORKFLOW_NOT_FOUND') return '워크플로우를 찾을 수 없어요. 목록에서 다시 열어 주세요.'
	if (code === 'WEBHOOK_TOKEN_NOT_ISSUED') return '수신 주소를 먼저 만들어 주세요.'
	// 400 INVALID_INPUT·INVALID_WORKFLOW는 노드 설정의 무엇이 틀렸는지 서버 message로 알려 준다.
	if ((code === 'INVALID_INPUT' || code === 'INVALID_WORKFLOW') && error.message) return error.message
	return DEFAULT_ERROR_MESSAGE
}
