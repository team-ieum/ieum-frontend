import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import { isApiError } from '@/utils/ApiError'

/** 수신 대기 테스트(토큰 발급·저장·sample 폴링)가 필요해 아직 테스트를 지원하지 않는 event */
const WEBHOOK_CATCH_EVENT = 'webhook.catch'

export type NodeTestAvailability = { canTest: true } | { canTest: false; reason: string }

/** 노드를 테스트할 수 있는지와, 없으면 화면에 보여 줄 사유. 카탈로그 항목을 찾지 못한 노드는 `entry`가 없다. */
export const getNodeTestAvailability = (entry: NodeCatalogEntry | undefined): NodeTestAvailability => {
	if (!entry) return { canTest: false, reason: '지원하지 않는 작업이라 테스트할 수 없어요.' }
	if (entry.id === WEBHOOK_CATCH_EVENT) return { canTest: false, reason: '웹훅 수신 테스트는 준비 중이에요.' }
	return { canTest: true }
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
	// 400 INVALID_INPUT·INVALID_WORKFLOW는 노드 설정의 무엇이 틀렸는지 서버 message로 알려 준다.
	if ((code === 'INVALID_INPUT' || code === 'INVALID_WORKFLOW') && error.message) return error.message
	return DEFAULT_ERROR_MESSAGE
}

/**
 * 오프셋 없는 서버 LocalDateTime(`2026-11-02T10:05:00`)을 `11월 2일 10:05`로 보여 준다.
 * 시간대 정보가 없으므로 변환하지 않고 숫자만 옮기며, 형식이 다르면 받은 값을 그대로 쓴다.
 */
export const formatTestedAt = (value: string) => {
	const match = /^\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
	if (!match) return value
	const [, month, day, hour, minute] = match
	return `${Number(month)}월 ${Number(day)}일 ${hour}:${minute}`
}
