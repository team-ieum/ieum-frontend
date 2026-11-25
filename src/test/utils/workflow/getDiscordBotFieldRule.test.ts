import { describe, expect, it } from 'vitest'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import { getDiscordBotFieldRule } from '@/utils/workflow/getDiscordBotFieldRule'

const ENTRY_ID = 'discord_bot.send_channel_message'

const field = (key: string): NodeCatalogInputField => ({ key, title: key, type: 'string', path: `config.${key}` })

describe('getDiscordBotFieldRule', () => {
	it('노드 폼의 채널 칸은 값/참조식 전환을 켜고 안내는 붙이지 않는다', () => {
		expect(getDiscordBotFieldRule(ENTRY_ID, field('channel_id'), undefined, { target: 'node' })).toEqual({
			field: field('channel_id'),
			canUseOptionsReference: true,
			notice: null,
		})
	})

	it.each([undefined, '', '   '])('AI 도구의 채널 칸이 비면(%j) 채널 고정 권장 경고를 붙이고 참조식 전환은 끈다', value => {
		const rule = getDiscordBotFieldRule(ENTRY_ID, field('channel_id'), value, { target: 'aiTool' })

		expect(rule.notice).toEqual({ tone: 'warning', message: expect.stringContaining('채널을 골라 고정해 두는 걸 권장해요.') })
		expect(rule.canUseOptionsReference).toBe(false)
	})

	it('AI 도구의 채널 칸을 고르면 경고를 붙이지 않는다', () => {
		expect(
			getDiscordBotFieldRule(ENTRY_ID, field('channel_id'), '1490957748668727358', { target: 'aiTool' }).notice
		).toBeNull()
	})

	it.each(['guild_id', 'content'])('채널이 아닌 %s 칸은 안내·참조식 전환 없이 그대로 돌려준다', key => {
		const otherField = field(key)
		for (const target of ['node', 'aiTool'] as const) {
			expect(getDiscordBotFieldRule(ENTRY_ID, otherField, undefined, { target })).toEqual({
				field: otherField,
				canUseOptionsReference: false,
				notice: null,
			})
		}
	})
})
