import { describe, expect, it } from 'vitest'
import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { getFieldName, updateNodeField } from '@/utils/workflow/updateNodeField'

const providerField: NodeCatalogInputField = {
	key: 'llmProvider',
	title: 'AI 제공자',
	type: 'string',
	path: 'config.llmProvider',
	choices: [
		{ id: 'CLAUDE', name: 'Claude' },
		{ id: 'GEMINI', name: 'Gemini' },
	],
}
const modelField: NodeCatalogInputField = {
	key: 'model',
	title: '모델',
	type: 'string',
	path: 'config.model',
	optionsSource: 'ai.models',
	optionsInputs: ['llmProvider'],
}
const promptField: NodeCatalogInputField = { key: 'prompt', title: '프롬프트', type: 'text', path: 'config.prompt' }
const entry = { id: 'ai.agent', inputFields: [providerField, modelField, promptField] } as NodeCatalogEntry

const node: WorkflowNodeDto = {
	id: 'ai',
	type: 'AI',
	event: 'ai.agent',
	label: 'AI',
	config: {
		agentType: 'react',
		brand: 'openai',
		llmProvider: 'GEMINI',
		model: 'gemini-pro',
		prompt: '요약',
		_names: { model: 'Gemini Pro' },
	},
}

describe('updateNodeField', () => {
	it('폼에 없는 config 키를 보존하고 칸 값만 바꾼다', () => {
		const next = updateNodeField(node, entry, promptField, '분류')

		expect(next.config).toEqual({ ...node.config, prompt: '분류' })
		expect(node.config.prompt).toBe('요약')
	})

	it('비우면 키를 지운다', () => {
		expect(updateNodeField(node, entry, promptField, undefined).config).not.toHaveProperty('prompt')
	})

	it('부모 칸이 바뀌면 연쇄된 자식 칸 값과 표시 이름을 지우고 빈 _names도 지운다', () => {
		const next = updateNodeField(node, entry, providerField, 'CLAUDE')

		expect(next.config).toEqual({ agentType: 'react', brand: 'openai', llmProvider: 'CLAUDE', prompt: '요약' })
	})

	it('직접 입력으로 값을 바꾸면 그 칸의 표시 이름만 지운다', () => {
		const withNames = { ...node, config: { ...node.config, _names: { model: 'Gemini Pro', other: '유지' } } }

		const next = updateNodeField(withNames, entry, modelField, 'gemini-flash')

		expect(next.config).toMatchObject({ model: 'gemini-flash', _names: { other: '유지' } })
		expect(getFieldName(withNames, modelField)).toBe('Gemini Pro')
		expect(getFieldName(next, modelField)).toBeUndefined()
	})
})
