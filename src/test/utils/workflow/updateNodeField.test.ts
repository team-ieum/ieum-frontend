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
const labelsField: NodeCatalogInputField = {
	key: 'label_ids',
	title: '보낸 뒤 붙일 라벨',
	type: 'string',
	list: true,
	ref: false,
	optionsSource: 'google.gmail_labels',
	path: 'config.label_ids',
}
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

	it('목록에서 고른 항목은 값과 함께 칸 path 부모의 _names에 이름을 저장한다', () => {
		const next = updateNodeField(node, entry, modelField, 'gemini-flash', 'Gemini Flash')

		expect(next.config).toMatchObject({ model: 'gemini-flash', _names: { model: 'Gemini Flash' } })
	})

	it('비우면 이름을 넘겨도 _names를 쓰지 않는다', () => {
		const next = updateNodeField(node, entry, modelField, undefined, 'Gemini Flash')

		expect(next.config).not.toHaveProperty('model')
		expect(next.config).not.toHaveProperty('_names')
	})

	it('목록 칸은 id별 이름 객체를 _names에 저장하고, 값을 모두 비우면 _names도 지운다', () => {
		const gmailNode: WorkflowNodeDto = {
			id: 'gmail',
			type: 'ACTION',
			event: 'gmail.send_email',
			label: '메일',
			config: { subject: '안녕' },
		}
		const gmailEntry = { id: 'gmail.send_email', inputFields: [labelsField] } as NodeCatalogEntry

		const next = updateNodeField(gmailNode, gmailEntry, labelsField, ['IMPORTANT', 'Label_12'], {
			IMPORTANT: '중요',
			Label_12: '고객',
		})
		const cleared = updateNodeField(next, gmailEntry, labelsField, undefined)

		expect(next.config).toEqual({
			subject: '안녕',
			label_ids: ['IMPORTANT', 'Label_12'],
			_names: { label_ids: { IMPORTANT: '중요', Label_12: '고객' } },
		})
		expect(cleared.config).toEqual({ subject: '안녕' })
	})
})

describe('getFieldName', () => {
	it('목록 칸은 문자열 이름만 담은 객체를, 단일 칸은 문자열 이름만 돌려준다', () => {
		const withNames: WorkflowNodeDto = {
			...node,
			config: {
				...node.config,
				label_ids: ['IMPORTANT', 'Label_12'],
				_names: { model: 'Gemini Pro', label_ids: { IMPORTANT: '중요', Label_12: 12 } },
			},
		}

		expect(getFieldName(withNames, labelsField)).toEqual({ IMPORTANT: '중요' })
		expect(getFieldName(withNames, modelField)).toBe('Gemini Pro')
		expect(getFieldName({ ...withNames, config: { _names: { label_ids: '중요' } } }, labelsField)).toBeUndefined()
		expect(getFieldName({ ...withNames, config: { _names: { model: { a: 'b' } } } }, modelField)).toBeUndefined()
	})
})
