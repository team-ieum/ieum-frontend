import { describe, expect, it } from 'vitest'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import type { NodeReferenceContext } from '@/types/nodeReference'
import { getGoogleCalendarFieldRule } from '@/utils/workflow/getGoogleCalendarFieldRule'

const field = (key: string, overrides: Partial<NodeCatalogInputField> = {}): NodeCatalogInputField => ({
	key,
	title: key,
	type: 'string',
	path: `config.${key}`,
	...overrides,
})

const context: NodeReferenceContext = {
	ancestorIds: new Set(['find', 'http']),
	targets: new Map([
		['find', { label: '일정 찾기', event: 'google_calendar.find', paths: null }],
		['http', { label: 'HTTP', event: 'http.request', paths: null }],
	]),
}

describe('getGoogleCalendarFieldRule', () => {
	it.each([
		['google_calendar.update', 'event_id', true],
		['google_calendar.delete', 'calendar_id', true],
		['google_calendar.find', 'calendar_id', true],
		['google_calendar.update', 'summary', false],
		// 다른 앱에 같은 key가 생겨도 그 앱 드롭다운은 선택 전용으로 남아야 한다.
		['other.app', 'event_id', false],
		['other.app', 'calendar_id', false],
		['slack_bot.send_channel_message', 'channel', false],
	])('%s의 %s 칸 참조식 전환 여부는 %s이다', (entryId, key, expected) => {
		expect(getGoogleCalendarFieldRule(entryId, field(key), undefined, undefined).canUseOptionsReference).toBe(expected)
	})

	it('수정 노드의 시간대 칸에만 시간대 선택지를 넣고 다른 칸은 그대로 돌려준다', () => {
		const timeZone = field('time_zone')
		const summary = field('summary')

		expect(getGoogleCalendarFieldRule('google_calendar.update', timeZone, undefined, undefined).field.choices).toEqual(
			expect.arrayContaining([{ id: 'UTC', name: expect.stringMatching(/^UTC/) }])
		)
		expect(getGoogleCalendarFieldRule('google_calendar.create', timeZone, undefined, undefined).field).toBe(timeZone)
		expect(getGoogleCalendarFieldRule('other.app', timeZone, undefined, undefined).field).toBe(timeZone)
		expect(getGoogleCalendarFieldRule('google_calendar.update', summary, undefined, undefined).field).toBe(summary)
	})

	it('일정 칸에는 지난 일정·반복 일정 안내를 붙이고 다른 앱에는 붙이지 않는다', () => {
		expect(getGoogleCalendarFieldRule('google_calendar.delete', field('event_id'), undefined, undefined).notice).toEqual({
			tone: 'info',
			message: expect.stringContaining('지난 일정이나 앞 노드가 찾은 일정은 참조식으로 넣어 주세요.'),
		})
		expect(getGoogleCalendarFieldRule('other.app', field('event_id'), undefined, undefined).notice).toBeNull()
	})

	it.each([
		['찾기 결과 첫 일정의 종료', '{{nodes.find.output.items.0.end}}', true],
		['찾기 결과 다른 일정의 종료', '{{nodes.find.output.items.3.end}}', true],
		['찾기 결과의 시작', '{{nodes.find.output.items.0.start}}', false],
		['찾기가 아닌 노드의 end', '{{nodes.http.output.items.0.end}}', false],
		['고정 값', '2026-11-20T10:00', false],
	])('수정 노드 새 종료가 %s를 가리키면 경고 여부는 %s이다', (_, value, warns) => {
		const { notice } = getGoogleCalendarFieldRule('google_calendar.update', field('end_datetime'), value, context)
		expect(notice?.tone === 'warning').toBe(warns)
	})

	it('참조 문맥이 없거나 만들기 노드면 종료 참조를 검사하지 않는다', () => {
		const value = '{{nodes.find.output.items.0.end}}'

		expect(getGoogleCalendarFieldRule('google_calendar.update', field('end_datetime'), value, undefined).notice).toBeNull()
		expect(getGoogleCalendarFieldRule('google_calendar.create', field('end_datetime'), value, context).notice).toBeNull()
	})
})
