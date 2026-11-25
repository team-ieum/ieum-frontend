import { describe, expect, it } from 'vitest'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import { getAiFieldRule } from '@/utils/workflow/getAiFieldRule'

const field = (key: string): NodeCatalogInputField => ({ key, title: key, type: 'string', path: `config.${key}` })

describe('getAiFieldRule', () => {
	it.each([
		['ai.agent', undefined],
		['ai.reasoning', ''],
		['ai.agent', '   '],
	])('%s 노드 폼의 API 키 칸이 비면(%j) 경고를 붙인다', (entryId, value) => {
		expect(getAiFieldRule(entryId, field('credentialId'), value, { target: 'node' }).notice).toEqual({
			tone: 'warning',
			message: expect.stringContaining('등록한 API 키를 골라 주세요.'),
		})
	})

	it('API 키를 고르면 경고를 붙이지 않는다', () => {
		expect(getAiFieldRule('ai.agent', field('credentialId'), 'credential-1', { target: 'node' }).notice).toBeNull()
	})

	it('AI 도구 카드의 칸이면 API 키 칸이 비어도 경고를 붙이지 않는다', () => {
		expect(getAiFieldRule('ai.agent', field('credentialId'), undefined, { target: 'aiTool' }).notice).toBeNull()
	})

	it.each(['llmProvider', 'model', 'prompt'])('API 키가 아닌 빈 %s 칸은 안내 없이 그대로 돌려준다', key => {
		const catalogField = field(key)

		expect(getAiFieldRule('ai.agent', catalogField, undefined, { target: 'node' })).toEqual({
			field: catalogField,
			canUseOptionsReference: false,
			notice: null,
		})
	})
})
