import { describe, expect, it } from 'vitest'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import { getAppFieldRule } from '@/utils/workflow/getAppFieldRule'

const field = (key: string): NodeCatalogInputField => ({ key, title: key, type: 'string', path: `config.${key}` })

describe('getAppFieldRule', () => {
	it('카탈로그 app으로 Calendar 규칙을 골라 일정 칸에 참조식 전환을 켠다', () => {
		const rule = getAppFieldRule({ id: 'google_calendar.update', app: 'google_calendar' }, field('event_id'), undefined, {
			target: 'node',
		})

		expect(rule.canUseOptionsReference).toBe(true)
		expect(rule.notice?.tone).toBe('info')
	})

	it('카탈로그 app으로 Slack 봇 규칙을 골라 채널 칸에 안내를 붙인다', () => {
		const rule = getAppFieldRule({ id: 'slack_bot.send_channel_message', app: 'slack_bot' }, field('channel'), undefined, {
			target: 'aiTool',
		})

		expect(rule.notice?.tone).toBe('warning')
	})

	it('카탈로그 app으로 Discord 봇 규칙을 골라 채널 칸에 참조식 전환을 켠다', () => {
		const rule = getAppFieldRule(
			{ id: 'discord_bot.send_channel_message', app: 'discord_bot' },
			field('channel_id'),
			undefined,
			{ target: 'node' }
		)

		expect(rule.canUseOptionsReference).toBe(true)
	})

	it('카탈로그 app으로 AI 규칙을 골라 빈 API 키 칸에 경고를 붙인다', () => {
		const rule = getAppFieldRule({ id: 'ai.reasoning', app: 'ai' }, field('credentialId'), '', { target: 'node' })

		expect(rule.notice?.tone).toBe('warning')
	})

	it.each([
		// 다른 앱에 같은 key가 있어도 그 앱 칸에는 Calendar·Slack 규칙이 붙지 않아야 한다.
		['slack.send_message', 'slack', 'channel'],
		['discord.send_message', 'discord', 'event_id'],
		['discord.send_message', 'discord', 'channel_id'],
		['google_calendar.update', 'other_app', 'calendar_id'],
	])('규칙이 없는 앱(%s, app %s)의 %s 칸은 그대로 돌려준다', (id, app, key) => {
		const catalogField = field(key)

		expect(getAppFieldRule({ id, app }, catalogField, undefined, { target: 'node' })).toEqual({
			field: catalogField,
			canUseOptionsReference: false,
			notice: null,
		})
	})

	it.each(['constructor', '__proto__', 'toString'])(
		'상속 속성 이름인 app(%s)도 규칙이 없는 앱으로 보고 칸을 그대로 돌려준다',
		app => {
			const catalogField = field('channel')

			expect(getAppFieldRule({ id: `${app}.send`, app }, catalogField, undefined, { target: 'node' })).toEqual({
				field: catalogField,
				canUseOptionsReference: false,
				notice: null,
			})
		}
	)
})
