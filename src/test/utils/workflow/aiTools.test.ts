import { describe, expect, it } from 'vitest'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import {
	addAiTool,
	createAiToolFieldEntry,
	ensureAiToolObject,
	findAiToolEntry,
	findAiToolsField,
	isAiDecidedWhenEmpty,
	readAiToolNames,
	removeAiTool,
} from '@/utils/workflow/aiTools'

const SLACK_TOOL = 'builtin:slack_send_channel_message'
const entries = nodeCatalogEntriesFixture

const createAiNode = (overrides: Partial<WorkflowNodeDto> = {}): WorkflowNodeDto => ({
	id: 'ai-1',
	type: 'AI',
	event: 'ai.reasoning',
	label: 'AI',
	config: { agentType: 'simple', credentialId: '', tools: [], brand: 'openai', prompt: '요약해줘' },
	...overrides,
})

describe('aiTools', () => {
	it('도구 칸 정의는 도구 칸이 없는 ai.reasoning 대신 ai.agent 항목에서 찾는다', () => {
		expect(findAiToolsField(nodeCatalogEntriesFixture)).toMatchObject({ key: 'tools', path: 'config.tools' })
		expect(findAiToolsField(nodeCatalogEntriesFixture.filter(entry => entry.id !== 'ai.agent'))).toBeUndefined()
	})

	it('도구 키와 toolKey가 같은 ACTION 항목을 찾는다', () => {
		expect(findAiToolEntry(nodeCatalogEntriesFixture, 'discord')?.id).toBe('discord.send_message')
		expect(findAiToolEntry(nodeCatalogEntriesFixture, 'builtin:web_search')).toBeUndefined()
	})

	it('문자열 원소도 도구 이름으로 읽고 이름을 읽을 수 없는 원소는 빈 이름으로 둔다', () => {
		const node = createAiNode({ config: { tools: ['discord', { name: SLACK_TOOL, config: {} }, { config: {} }] } })
		expect(readAiToolNames(node)).toEqual(['discord', SLACK_TOOL, ''])
		expect(readAiToolNames(createAiNode({ config: {} }))).toEqual([])
	})

	it('도구를 추가하면 {name, config} 원소를 붙이고 도구 없는 AI 노드를 ai.agent로 바꾸며 다른 config 키는 보존한다', () => {
		const next = addAiTool(createAiNode(), SLACK_TOOL, entries)

		expect(next.event).toBe('ai.agent')
		expect(next.config).toEqual({
			agentType: 'react',
			credentialId: '',
			tools: [{ name: SLACK_TOOL, config: {} }],
			brand: 'openai',
			prompt: '요약해줘',
		})
	})

	it('이미 고른 도구는 다시 추가하지 않고, 이미 ai.agent면 event를 그대로 둔다', () => {
		const agent = addAiTool(createAiNode(), SLACK_TOOL, entries)
		expect(addAiTool(agent, SLACK_TOOL, entries)).toBe(agent)

		const next = addAiTool(agent, 'discord', entries)
		expect(next.event).toBe('ai.agent')
		expect(next.config.tools).toEqual([
			{ name: SLACK_TOOL, config: {} },
			{ name: 'discord', config: {} },
		])
	})

	it('도구를 빼면 원소를 통째로 지우고, 마지막 도구를 빼면 ai.reasoning으로 되돌린다', () => {
		const node = createAiNode({
			event: 'ai.agent',
			config: {
				agentType: 'react',
				tools: [
					{ name: SLACK_TOOL, config: { channel: 'C1' } },
					{ name: 'discord', config: {} },
				],
			},
		})

		const first = removeAiTool(node, 0, entries)
		expect(first.event).toBe('ai.agent')
		expect(first.config.tools).toEqual([{ name: 'discord', config: {} }])

		const last = removeAiTool(first, 0, entries)
		expect(last.event).toBe('ai.reasoning')
		expect(last.config).toEqual({ agentType: 'simple', tools: [] })
	})

	it('바꿀 event의 agentType은 카탈로그 항목 fixed.config에서 읽고, 그 항목이 없으면 event를 바꾸지 않는다', () => {
		const customEntries = entries.map(entry =>
			entry.id === 'ai.agent'
				? { ...entry, fixed: { ...entry.fixed, config: { ...entry.fixed.config, agentType: 'plan' } } }
				: entry
		)
		expect(addAiTool(createAiNode(), SLACK_TOOL, customEntries).config.agentType).toBe('plan')

		const withoutAgent = entries.filter(entry => entry.id !== 'ai.agent')
		const next = addAiTool(createAiNode(), SLACK_TOOL, withoutAgent)
		expect(next.event).toBe('ai.reasoning')
		expect(next.config).toMatchObject({ agentType: 'simple', tools: [{ name: SLACK_TOOL, config: {} }] })
	})

	it('바꿀 event 항목 fixed.config에 agentType이 없으면 event만 바꾸고 기존 agentType을 그대로 둔다', () => {
		const entriesWithoutAgentType = entries.map(entry => {
			if (entry.id !== 'ai.agent') return entry
			const config = Object.fromEntries(Object.entries(entry.fixed.config).filter(([key]) => key !== 'agentType'))
			return { ...entry, fixed: { ...entry.fixed, config } }
		})

		const next = addAiTool(createAiNode(), SLACK_TOOL, entriesWithoutAgentType)

		expect(next.event).toBe('ai.agent')
		// undefined 키가 생겨도 toEqual은 통과하므로 키가 있고 값이 그대로인지 따로 본다.
		expect(next.config).toHaveProperty('agentType', 'simple')
	})

	it('AI 노드가 아니면 도구를 바꿔도 event를 바꾸지 않는다', () => {
		const node = createAiNode({ type: 'ACTION', event: 'test.typed', config: {} })
		expect(addAiTool(node, SLACK_TOOL, entries).event).toBe('test.typed')
	})

	it('문자열 원소는 칸을 쓰기 전에 객체 원소로 바꾸고 객체 원소는 그대로 둔다', () => {
		const node = createAiNode({ config: { tools: ['discord', { name: SLACK_TOOL, config: {} }] } })

		expect(ensureAiToolObject(node, 0).config.tools).toEqual([
			{ name: 'discord', config: {} },
			{ name: SLACK_TOOL, config: {} },
		])
		expect(ensureAiToolObject(node, 1)).toBe(node)
	})

	it('도구 항목 칸 path를 그 원소의 config로 옮기고 반드시 고정해야 하는 칸만 필수로 남긴다', () => {
		const discordEntry = findAiToolEntry(nodeCatalogEntriesFixture, 'discord')!
		const fields = createAiToolFieldEntry(discordEntry, 2).inputFields

		expect(fields.map(field => [field.path, field.required])).toEqual([
			['config.tools.2.config.webhookCredentialId', true],
			['config.tools.2.config.content', false],
			['config.tools.2.config.username', false],
		])
		// 원본 카탈로그 항목은 바꾸지 않는다.
		expect(discordEntry.inputFields[0].path).toBe('config.webhookCredentialId')
	})

	it('웹훅 칸과 서버 기본값으로 고정되는 캘린더 칸은 비워도 AI가 정하지 않는다', () => {
		expect(isAiDecidedWhenEmpty('discord', 'content')).toBe(true)
		expect(isAiDecidedWhenEmpty('discord', 'webhookCredentialId')).toBe(false)
		expect(isAiDecidedWhenEmpty('builtin:google_calendar_update', 'scope')).toBe(false)
		expect(isAiDecidedWhenEmpty('builtin:google_calendar_update', 'summary')).toBe(true)
	})
})
