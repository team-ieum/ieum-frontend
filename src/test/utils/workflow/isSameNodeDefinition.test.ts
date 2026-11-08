import { describe, expect, it } from 'vitest'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { isSameNodeDefinition } from '@/utils/workflow/isSameNodeDefinition'

describe('isSameNodeDefinition', () => {
	const base: WorkflowNodeDto = {
		id: 'slack-1',
		type: 'ACTION',
		event: 'slack_bot.send_channel_message',
		label: '알리기',
		config: { channel: 'C1', text: '안녕', _names: { channel: '#일반', user: '홍' } },
	}

	it('위치·라벨이나 config 키 순서만 다르면 같은 정의로 본다', () => {
		// 드롭다운에서 같은 값을 다시 고르면 `_names`의 키를 지웠다 다시 넣어 순서만 바뀐다.
		const reordered = {
			...base,
			label: '다른 이름',
			position: { x: 1, y: 2 },
			config: { _names: { user: '홍', channel: '#일반' }, text: '안녕', channel: 'C1' },
		}
		expect(isSameNodeDefinition(base, reordered)).toBe(true)
	})

	it('event나 config 값, 배열 순서가 다르면 다른 정의로 본다', () => {
		expect(isSameNodeDefinition(base, { ...base, event: 'discord.send_message' })).toBe(false)
		expect(isSameNodeDefinition(base, { ...base, config: { ...base.config, text: '바뀜' } })).toBe(false)
		expect(isSameNodeDefinition({ ...base, config: { tools: ['a', 'b'] } }, { ...base, config: { tools: ['b', 'a'] } })).toBe(
			false
		)
	})
})
