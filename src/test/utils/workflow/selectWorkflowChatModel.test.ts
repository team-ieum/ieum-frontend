import { describe, expect, it } from 'vitest'
import type { ProviderModel } from '@/types/credential'
import { selectWorkflowChatModel } from '@/utils/workflow/selectWorkflowChatModel'

const createModel = (id: string, isDefault = false): ProviderModel => ({
	id,
	displayName: id,
	capabilities: ['text'],
	maxOutputTokens: 8192,
	contextWindow: 200000,
	...(isDefault ? { default: true } : {}),
})

const MODELS = [createModel('flash-lite'), createModel('flash', true), createModel('pro')]

describe('selectWorkflowChatModel', () => {
	it.each([
		{ condition: '고른 모델이 목록에 있으면 그 모델', models: MODELS, preferred: 'pro', expected: 'pro' },
		{
			condition: '고른 모델이 다른 제공자 모델이면 기본 모델',
			models: MODELS,
			preferred: 'claude-opus-5-5',
			expected: 'flash',
		},
		{ condition: '고른 모델이 없으면 기본 모델', models: MODELS, preferred: null, expected: 'flash' },
		{
			condition: '기본 표시가 없으면 첫 모델',
			models: [createModel('a'), createModel('b')],
			preferred: null,
			expected: 'a',
		},
	])('$condition을 고른다', ({ models, preferred, expected }) => {
		expect(selectWorkflowChatModel(models, preferred)?.id).toBe(expected)
	})

	it('모델 목록이 비면 null을 돌려준다', () => {
		expect(selectWorkflowChatModel([], 'pro')).toBeNull()
	})
})
