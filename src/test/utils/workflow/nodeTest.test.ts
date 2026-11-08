import { describe, expect, it } from 'vitest'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import { ApiError } from '@/utils/ApiError'
import {
	getMissingSampleNodeIds,
	getNodeTestAvailability,
	formatTestedAt,
	getNodeTestErrorMessage,
	requiresRunConfirm,
} from '@/utils/workflow/nodeTest'

const findEntry = (id: string) => {
	const entry = nodeCatalogEntriesFixture.find(item => item.id === id)
	if (!entry) throw new Error(`fixture에 ${id} 항목이 없습니다.`)
	return entry
}

describe('nodeTest', () => {
	describe('getNodeTestAvailability', () => {
		it('카탈로그 항목이 있는 일반 노드는 테스트할 수 있다', () => {
			expect(getNodeTestAvailability(findEntry('http.request'))).toEqual({ canTest: true })
		})

		it('카탈로그에서 찾지 못한 노드는 사유와 함께 테스트를 끈다', () => {
			expect(getNodeTestAvailability(undefined)).toEqual({
				canTest: false,
				reason: '지원하지 않는 작업이라 테스트할 수 없어요.',
			})
		})

		it('수신 대기가 필요한 webhook.catch는 준비 중으로 끈다', () => {
			expect(getNodeTestAvailability(findEntry('webhook.catch'))).toEqual({
				canTest: false,
				reason: '웹훅 수신 테스트는 준비 중이에요.',
			})
		})
	})

	it('action 노드만 실행 전 확인을 받는다', () => {
		expect(requiresRunConfirm(findEntry('slack_bot.send_channel_message'))).toBe(true)
		expect(requiresRunConfirm(findEntry('ai.reasoning'))).toBe(true)
		expect(requiresRunConfirm(findEntry('manual.run'))).toBe(false)
		expect(requiresRunConfirm(findEntry('gmail.new_email'))).toBe(false)
	})

	describe('getMissingSampleNodeIds', () => {
		it('TEST_SAMPLE_MISSING의 data.missingNodeIds를 읽는다', () => {
			const error = new ApiError('TEST_SAMPLE_MISSING', '먼저 테스트해야 하는 노드가 있습니다: a, b', {
				data: { missingNodeIds: ['a', 'b'] },
				status: 400,
			})
			expect(getMissingSampleNodeIds(error)).toEqual(['a', 'b'])
		})

		it('문자열이 아닌 원소는 버린다', () => {
			const error = new ApiError('TEST_SAMPLE_MISSING', '', { data: { missingNodeIds: ['a', 1, null] } })
			expect(getMissingSampleNodeIds(error)).toEqual(['a'])
		})

		it.each([
			['data가 없음', new ApiError('TEST_SAMPLE_MISSING', '')],
			['missingNodeIds가 배열이 아님', new ApiError('TEST_SAMPLE_MISSING', '', { data: { missingNodeIds: 'a' } })],
			['다른 code', new ApiError('INVALID_INPUT', '', { data: { missingNodeIds: ['a'] } })],
			['ApiError가 아님', new Error('network')],
		])('%s이면 빈 배열이다', (_name, error) => {
			expect(getMissingSampleNodeIds(error)).toEqual([])
		})
	})

	describe('getNodeTestErrorMessage', () => {
		it('PROVIDER_* 오류는 서버 message를 숨긴다', () => {
			const message = getNodeTestErrorMessage(new ApiError('PROVIDER_ERROR' as never, 'LLM 프로바이더 호출 실패'))
			expect(message).toBe('AI 제공자가 응답하지 않아요. 잠시 후 다시 시도해 주세요.')
		})

		it('UNAUTHORIZED는 다시 로그인하라고 안내한다', () => {
			expect(getNodeTestErrorMessage(new ApiError('UNAUTHORIZED', '인증 필요'))).toBe(
				'로그인이 만료됐어요. 다시 로그인한 뒤 테스트해 주세요.'
			)
		})

		it.each(['INVALID_INPUT', 'INVALID_WORKFLOW'] as const)('%s는 설정 오류를 서버 message로 보여 준다', code => {
			expect(getNodeTestErrorMessage(new ApiError(code, '알 수 없는 노드 종류입니다: foo'))).toBe(
				'알 수 없는 노드 종류입니다: foo'
			)
		})

		it('WORKFLOW_NOT_FOUND는 워크플로우를 다시 열라고 안내한다', () => {
			expect(getNodeTestErrorMessage(new ApiError('WORKFLOW_NOT_FOUND', '없음'))).toBe(
				'워크플로우를 찾을 수 없어요. 목록에서 다시 열어 주세요.'
			)
		})

		it('ApiError가 아니거나 모르는 code면 기본 문구를 쓴다', () => {
			expect(getNodeTestErrorMessage(new Error('Network Error'))).toBe('테스트하지 못했어요. 잠시 후 다시 시도해 주세요.')
			expect(getNodeTestErrorMessage(new ApiError('INTERNAL_SERVER_ERROR', '서버 오류'))).toBe(
				'테스트하지 못했어요. 잠시 후 다시 시도해 주세요.'
			)
		})
	})

	it('오프셋 없는 서버 시각을 변환하지 않고 월·일·시각으로 보여 주며 모르는 형식은 그대로 둔다', () => {
		expect(formatTestedAt('2026-11-02T09:05:30')).toBe('11월 2일 09:05')
		expect(formatTestedAt('2026-11-02T09:05:30.123456')).toBe('11월 2일 09:05')
		expect(formatTestedAt('어제')).toBe('어제')
	})
})
