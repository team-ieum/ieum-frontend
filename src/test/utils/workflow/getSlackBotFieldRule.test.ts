import { describe, expect, it } from 'vitest'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import { getSlackBotFieldRule } from '@/utils/workflow/getSlackBotFieldRule'

const ENTRY_ID = 'slack_bot.send_channel_message'

const field = (key: string): NodeCatalogInputField => ({ key, title: key, type: 'string', path: `config.${key}` })

describe('getSlackBotFieldRule', () => {
	it.each([undefined, 'C0123456789'])('노드 폼의 채널 칸은 값(%s)과 관계없이 공개 채널 안내를 붙인다', value => {
		expect(getSlackBotFieldRule(ENTRY_ID, field('channel'), value, { target: 'node' }).notice).toEqual({
			tone: 'info',
			message: expect.stringContaining('봇을 채널에 초대하지 않아도 공개 채널에는 보내져요.'),
		})
	})

	it.each([undefined, '', '   '])('AI 도구의 채널 칸이 비면(%j) 채널 고정 권장 경고를 붙인다', value => {
		expect(getSlackBotFieldRule(ENTRY_ID, field('channel'), value, { target: 'aiTool' }).notice).toEqual({
			tone: 'warning',
			message: expect.stringContaining('채널을 골라 고정해 두는 걸 권장해요.'),
		})
	})

	it('AI 도구의 채널 칸을 고르면 경고 대신 공개 채널 안내를 붙인다', () => {
		expect(getSlackBotFieldRule(ENTRY_ID, field('channel'), 'C0123456789', { target: 'aiTool' }).notice?.tone).toBe('info')
	})

	it.each(['text', 'thread_ts'])('채널이 아닌 %s 칸은 안내 없이 그대로 돌려준다', key => {
		const textField = field(key)
		expect(getSlackBotFieldRule(ENTRY_ID, textField, undefined, { target: 'aiTool' })).toEqual({
			field: textField,
			canUseOptionsReference: false,
			notice: null,
		})
	})

	it('채널 드롭다운은 선택 전용이라 참조식 전환을 쓰지 않는다', () => {
		expect(getSlackBotFieldRule(ENTRY_ID, field('channel'), undefined, { target: 'node' }).canUseOptionsReference).toBe(false)
	})
})
