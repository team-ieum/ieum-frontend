import { describe, expect, it } from 'vitest'
import { nodeOptionsQueryOptions } from '@/hooks/workflow/queries/nodeOptionsQueryOptions'
import type { ProviderInfo } from '@/types/credential'
import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { ApiError } from '@/utils/ApiError'
import type { ApiErrorCode } from '@/types/api'
import {
	getDefaultModelName,
	getNodeOptionsErrorNotice,
	getOptionsInputsState,
	isOptionsComboboxField,
	isRetryableNodeOptionsError,
	showsOptionId,
} from '@/utils/workflow/nodeOptions'

// 명세상 event_id 칸이 calendar_id 칸보다 앞에 오므로 칸 순서와 무관하게 key로 부모를 찾는지 함께 본다.
const eventField: NodeCatalogInputField = {
	key: 'event_id',
	title: '일정',
	type: 'string',
	optionsSource: 'google.events',
	optionsInputs: ['calendar_id'],
	path: 'config.event_id',
}
const calendarField: NodeCatalogInputField = {
	key: 'calendar_id',
	title: '캘린더',
	type: 'string',
	optionsSource: 'google.writable_calendars',
	path: 'config.calendar_id',
}
const entry = { id: 'google_calendar.update', inputFields: [eventField, calendarField] } as NodeCatalogEntry

const createNode = (config: Record<string, unknown>): WorkflowNodeDto => ({
	id: 'calendar',
	type: 'ACTION',
	event: 'google_calendar.update',
	label: '일정 수정',
	config,
})

const apiError = (code: string, message = '서버 메시지') => new ApiError(code as ApiErrorCode, message)

describe('getOptionsInputsState', () => {
	it('optionsInputs key로 같은 노드의 부모 칸 값을 모은다', () => {
		expect(getOptionsInputsState(entry, createNode({ calendar_id: 'primary' }), eventField)).toEqual({
			status: 'ready',
			inputs: { calendar_id: 'primary' },
		})
	})

	it('부모 칸이 비었거나 참조식이면 목록을 막고 부모 칸 제목을 알려 준다', () => {
		expect(getOptionsInputsState(entry, createNode({ calendar_id: '  ' }), eventField)).toEqual({
			status: 'blocked',
			reason: 'empty',
			parentTitle: '캘린더',
		})
		expect(getOptionsInputsState(entry, createNode({ calendar_id: '{{nodes.a.output.id}}' }), eventField)).toEqual({
			status: 'blocked',
			reason: 'reference',
			parentTitle: '캘린더',
		})
	})

	it('optionsInputs가 없으면 바로 부를 수 있다', () => {
		expect(getOptionsInputsState(entry, createNode({}), calendarField)).toEqual({ status: 'ready', inputs: {} })
	})
})

describe('isOptionsComboboxField', () => {
	it('목록 공급원이 있는 단일 문자열 칸만 드롭다운으로 그린다', () => {
		expect(isOptionsComboboxField(eventField)).toBe(true)
		expect(isOptionsComboboxField({ ...eventField, list: true })).toBe(false)
		expect(isOptionsComboboxField({ ...eventField, optionsSource: undefined })).toBe(false)
	})
})

describe('getNodeOptionsErrorNotice', () => {
	it('연동이 필요한 code는 통합 설정으로 안내한다', () => {
		for (const code of [
			'AUTHENTICATION_REQUIRED',
			'ACCOUNT_NOT_CONNECTED',
			'SLACK_NOT_CONNECTED',
			'GOOGLE_SCOPE_REQUIRED',
			'TOKEN_REFRESH_FAILED',
		]) {
			expect(getNodeOptionsErrorNotice(apiError(code)).action).toBe('connect')
		}
	})

	it('401 UNAUTHORIZED는 앱 재연동이 아니라 다시 로그인을 안내한다', () => {
		expect(getNodeOptionsErrorNotice(apiError('UNAUTHORIZED'))).toEqual({
			message: '로그인이 만료됐어요. 다시 로그인한 뒤 열어 주세요.',
			action: 'retry',
		})
	})

	it('외부 서비스 일시 장애는 다시 시도를, INVALID_INPUT은 서버 message를 보여 준다', () => {
		expect(getNodeOptionsErrorNotice(apiError('SLACK_API_UNAVAILABLE')).message).toContain('잠시 후 다시 시도')
		expect(getNodeOptionsErrorNotice(apiError('INVALID_INPUT', 'spreadsheet_id 형식이 올바르지 않습니다'))).toEqual({
			message: 'spreadsheet_id 형식이 올바르지 않습니다',
			action: 'retry',
		})
	})

	it('모르는 code와 네트워크 오류는 서버 message 대신 일반 안내를 보여 준다', () => {
		expect(getNodeOptionsErrorNotice(apiError('PROVIDER_UNKNOWN', 'LLM 프로바이더 오류')).message).toBe(
			'목록을 불러오지 못했어요.'
		)
		expect(getNodeOptionsErrorNotice(new Error('Network Error')).message).toBe('목록을 불러오지 못했어요.')
	})
})

describe('options 조회 재시도', () => {
	const retry = nodeOptionsQueryOptions('slack.channels', {}).retry as (count: number, error: unknown) => boolean

	it('외부 서비스 일시 장애와 네트워크 오류만 재시도한다', () => {
		expect(isRetryableNodeOptionsError(apiError('SLACK_API_UNAVAILABLE'))).toBe(true)
		expect(isRetryableNodeOptionsError(new Error('Network Error'))).toBe(true)
		expect(isRetryableNodeOptionsError(apiError('SLACK_NOT_CONNECTED'))).toBe(false)
		expect(isRetryableNodeOptionsError(apiError('INVALID_INPUT'))).toBe(false)
	})

	it('연동 필요 오류는 바로 실패시키고 일시 장애는 3번까지만 재시도한다', () => {
		expect(retry(0, apiError('ACCOUNT_NOT_CONNECTED'))).toBe(false)
		expect(retry(2, apiError('GOOGLE_API_UNAVAILABLE'))).toBe(true)
		expect(retry(3, apiError('GOOGLE_API_UNAVAILABLE'))).toBe(false)
	})
})

describe('getDefaultModelName', () => {
	const providers = [
		{
			provider: 'GEMINI',
			displayName: 'Google Gemini',
			credentialTypes: ['API_KEY'],
			models: [
				{ id: 'gemini-pro', displayName: 'Gemini Pro', capabilities: [], maxOutputTokens: 1, contextWindow: 1 },
				{
					id: 'gemini-flash',
					displayName: 'Gemini Flash',
					capabilities: [],
					maxOutputTokens: 1,
					contextWindow: 1,
					default: true,
				},
			],
		},
	] satisfies ProviderInfo[]

	it('provider의 기본 모델 표시 이름을 돌려주고 모르면 undefined다', () => {
		expect(getDefaultModelName(providers, 'GEMINI')).toBe('Gemini Flash')
		expect(getDefaultModelName(providers, 'CLAUDE')).toBeUndefined()
		expect(getDefaultModelName(undefined, 'GEMINI')).toBeUndefined()
	})
})

describe('showsOptionId', () => {
	it('내부 UUID가 값인 공급원은 ID를 숨기고 외부 서비스 ID는 보여 준다', () => {
		expect(showsOptionId('ieum.credentials')).toBe(false)
		expect(showsOptionId('discord.webhooks')).toBe(false)
		expect(showsOptionId('slack.channels')).toBe(true)
	})
})
