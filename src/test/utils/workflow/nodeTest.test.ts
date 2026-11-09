import { describe, expect, it } from 'vitest'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import { ApiError } from '@/utils/ApiError'
import {
	formatRemainingTime,
	getListenWindow,
	getMissingSampleNodeIds,
	getNodeTestAvailability,
	formatTestedAt,
	getNodeTestErrorMessage,
	isSampleRecordedSince,
	requiresRunConfirm,
} from '@/utils/workflow/nodeTest'

const findEntry = (id: string) => {
	const entry = nodeCatalogEntriesFixture.find(item => item.id === id)
	if (!entry) throw new Error(`fixture에 ${id} 항목이 없습니다.`)
	return entry
}

const READY = { isSaved: true, isTokenIssued: true }

describe('nodeTest', () => {
	describe('getNodeTestAvailability', () => {
		it('카탈로그 항목이 있는 일반 노드는 저장하지 않았거나 수신 주소가 없어도 테스트할 수 있다', () => {
			expect(getNodeTestAvailability(findEntry('http.request'), { isSaved: false, isTokenIssued: false })).toEqual({
				canTest: true,
			})
		})

		it('카탈로그에서 찾지 못한 노드는 사유와 함께 테스트를 끈다', () => {
			expect(getNodeTestAvailability(undefined, READY)).toEqual({
				canTest: false,
				reason: '지원하지 않는 작업이라 테스트할 수 없어요.',
			})
		})

		it.each([
			[
				'저장본과 다르면',
				{ isSaved: false, isTokenIssued: true },
				'저장한 뒤 테스트할 수 있어요. 받은 요청은 저장된 설정으로 처리돼요.',
			],
			['발급 여부를 아직 모르면', { isSaved: true, isTokenIssued: undefined }, '수신 주소를 확인하고 있어요.'],
			['수신 주소가 없으면', { isSaved: true, isTokenIssued: false }, '수신 주소를 먼저 만들어 주세요.'],
		])('webhook.catch는 %s 사유와 함께 테스트를 끈다', (_, conditions, reason) => {
			expect(getNodeTestAvailability(findEntry('webhook.catch'), conditions)).toEqual({ canTest: false, reason })
		})

		it('webhook.catch는 저장본과 같고 수신 주소가 있으면 테스트할 수 있다', () => {
			expect(getNodeTestAvailability(findEntry('webhook.catch'), READY)).toEqual({ canTest: true })
		})
	})

	describe('getListenWindow', () => {
		const now = Date.parse('2026-11-09T05:00:00Z')

		it('서버 만료 시각에서 서버 기준 시작 시각을 구하고, 화면 시계와 가까우면 만료 시각을 그대로 쓴다', () => {
			expect(getListenWindow('2026-11-09T05:04:59.500Z', now)).toEqual({
				serverStartedAt: Date.parse('2026-11-09T04:59:59.500Z'),
				deadline: Date.parse('2026-11-09T05:04:59.500Z'),
			})
		})

		it('오프셋 없는 문자열은 화면 시간대 시각으로 읽는다', () => {
			const local = new Date(now + 5 * 60_000)
			const pad = (value: number) => String(value).padStart(2, '0')
			const expiresAt = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}`
			expect(getListenWindow(expiresAt, now)).toEqual({ serverStartedAt: now, deadline: now + 5 * 60_000 })
		})

		it.each([
			['화면 시계가 서버보다 3분 빠르면', '2026-11-09T05:02:00Z', Date.parse('2026-11-09T04:57:00Z')],
			['화면 시계가 서버보다 3분 느리면', '2026-11-09T05:08:00Z', Date.parse('2026-11-09T05:03:00Z')],
		])('%s 끝 시각은 지금부터 5분으로 보고 시작 시각은 서버 값으로 둔다', (_, expiresAt, serverStartedAt) => {
			expect(getListenWindow(expiresAt, now)).toEqual({ serverStartedAt, deadline: now + 5 * 60_000 })
		})

		it.each([
			['값이 없으면', undefined],
			['읽을 수 없으면', '내일'],
		])('%s 화면 시계로 지금부터 5분을 쓴다', (_, expiresAt) => {
			expect(getListenWindow(expiresAt, now)).toEqual({ serverStartedAt: now, deadline: now + 5 * 60_000 })
		})
	})

	it.each([
		['대기 시작 뒤에 기록됐으면', '2026-11-09T05:00:01Z', true],
		['대기 시작과 같은 시각이면', '2026-11-09T05:00:00Z', true],
		['대기 시작 전에 기록됐으면', '2026-11-09T04:59:59Z', false],
		['testedAt이 없으면', undefined, false],
		['testedAt을 읽을 수 없으면', '어제', false],
	])('샘플이 %s(testedAt: %s) 받은 것으로 보는지는 %s다', (_, testedAt, expected) => {
		expect(isSampleRecordedSince(testedAt, Date.parse('2026-11-09T05:00:00Z'))).toBe(expected)
	})

	it.each([
		[5 * 60_000, '5:00'],
		[65_001, '1:06'],
		[59_000, '0:59'],
		[400, '0:01'],
		[0, '0:00'],
		[-1_000, '0:00'],
	])('남은 시간 %ims를 %s로 보여 준다', (remainingMs, label) => {
		expect(formatRemainingTime(remainingMs)).toBe(label)
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

		it('WEBHOOK_TOKEN_NOT_ISSUED는 수신 주소를 먼저 만들라고 안내한다', () => {
			expect(
				getNodeTestErrorMessage(
					new ApiError('WEBHOOK_TOKEN_NOT_ISSUED', '수신 주소를 먼저 만들어 주세요.', { status: 400 })
				)
			).toBe('수신 주소를 먼저 만들어 주세요.')
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
