import { describe, expect, it } from 'vitest'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import { createWorkflowNodeFromCatalogEntry, groupNodeCatalogEntries } from '@/utils/workflow/nodeCatalog'

const findEntry = (id: string): NodeCatalogEntry => {
	const entry = nodeCatalogEntriesFixture.find(candidate => candidate.id === id)
	if (!entry) throw new Error(`fixture에 ${id} 항목이 없습니다.`)
	return entry
}

describe('groupNodeCatalogEntries', () => {
	it('앱은 응답에 처음 나온 순서로, 종류는 트리거·작업·검색 순서로 묶고 빈 종류는 뺀다', () => {
		const searchEntry = { ...findEntry('slack_bot.send_channel_message'), id: 'slack_bot.find_message', kind: 'search' }
		const triggerEntry = { ...findEntry('slack_bot.send_channel_message'), id: 'slack_bot.new_message', kind: 'trigger' }
		const groups = groupNodeCatalogEntries([
			findEntry('slack_bot.send_channel_message'),
			findEntry('manual.run'),
			searchEntry as NodeCatalogEntry,
			triggerEntry as NodeCatalogEntry,
		])

		expect(groups.map(group => group.app)).toEqual(['slack_bot', 'manual'])
		expect(groups[0].kinds.map(kind => [kind.kind, kind.entries.map(entry => entry.id)])).toEqual([
			['trigger', ['slack_bot.new_message']],
			['action', ['slack_bot.send_channel_message']],
			['search', ['slack_bot.find_message']],
		])
		expect(groups[1].kinds.map(kind => kind.kind)).toEqual(['trigger'])
	})

	it('알려진 fixed brand만 앱 로고 브랜드로 쓰고 내장 앱은 첫 항목 노드 종류로 아이콘을 고른다', () => {
		const groups = groupNodeCatalogEntries([findEntry('slack_bot.send_channel_message'), findEntry('ai.agent')])

		expect(groups.map(group => [group.title, group.brand, group.nodeType])).toEqual([
			['Slack', 'slack', 'ACTION'],
			['AI', undefined, 'AI'],
		])
	})
})

describe('createWorkflowNodeFromCatalogEntry', () => {
	it('항목 id를 event로, 제목을 label로 쓰고 fixed config만 담은 새 노드를 만든다', () => {
		const node = createWorkflowNodeFromCatalogEntry(findEntry('slack_bot.send_channel_message'), { x: 10, y: 20 }, 'node-1')

		expect(node).toEqual({
			id: 'node-1',
			event: 'slack_bot.send_channel_message',
			type: 'ACTION',
			label: 'Slack 채널에 메시지 보내기',
			position: { x: 10, y: 20 },
			config: { brand: 'slack' },
		})
	})

	it('AI 노드는 빈 칸을 채우지 않고 fixed 뼈대를 노드마다 독립된 복사본으로 쓴다', () => {
		const entry = findEntry('ai.agent')
		const first = createWorkflowNodeFromCatalogEntry(entry, { x: 0, y: 0 }, 'ai-1')
		const second = createWorkflowNodeFromCatalogEntry(entry, { x: 0, y: 0 }, 'ai-2')
		;(first.config.tools as unknown[]).push({ name: 'builtin:web_search', config: {} })

		expect(second.config).toEqual({ agentType: 'react', credentialId: '', tools: [], brand: 'openai' })
		expect(entry.fixed.config.tools).toEqual([])
		expect(first.config).not.toHaveProperty('llmProvider')
	})

	it('id를 넘기지 않으면 UUID를 만든다', () => {
		const node = createWorkflowNodeFromCatalogEntry(findEntry('manual.run'), { x: 0, y: 0 })

		expect(node.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
	})
})
