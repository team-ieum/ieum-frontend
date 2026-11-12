import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import type { NodeOption, NodeOptionsResponse } from '@/types/nodeOptions'

const NODE_OPTIONS_PATH = '*/api/v1/integrations/:app/options/:resource'

type NodeOptionsHandlersOptions = {
	delayMs?: number
}

type NodeOptionsPage = { items: NodeOption[]; nextCursor?: string | null }

const ok = (page: NodeOptionsPage) =>
	HttpResponse.json<NodeOptionsResponse>({ success: true, data: page, message: 'OK', code: 'OK' })

const calendars: NodeOption[] = [
	{ id: 'primary', name: '내 캘린더' },
	{ id: 'team@group.calendar.google.com', name: '팀 일정' },
]

// 쓰기 가능한 캘린더만 거른 첫 페이지가 비어도 다음 cursor가 있는 실제 응답 모양을 재현한다.
const writableCalendarPages: Record<string, NodeOptionsPage> = {
	first: { items: [], nextCursor: 'writable-2' },
	'writable-2': { items: calendars, nextCursor: null },
}

const eventsByCalendar: Record<string, NodeOption[]> = {
	primary: [
		{ id: 'evt-weekly_20261116T010000Z', name: '주간 회의 (11월 16일 10:00)' },
		{ id: 'evt-lunch', name: '팀 점심 (11월 18일 12:00)' },
	],
	'team@group.calendar.google.com': [{ id: 'evt-release', name: '배포 (11월 20일 15:00)' }],
}

const getOptionsPage = (source: string, params: URLSearchParams): NodeOptionsPage => {
	if (source === 'google.calendars')
		return {
			items: [
				...calendars,
				{ id: 'ko.south_korea#holiday@group.v.calendar.google.com', name: '대한민국의 휴일 (읽기 전용)' },
			],
		}
	if (source === 'google.writable_calendars') return writableCalendarPages[params.get('cursor') ?? 'first'] ?? { items: [] }
	if (source === 'google.events') return { items: eventsByCalendar[params.get('calendar_id') ?? ''] ?? [] }
	return { items: [] }
}

/**
 * 노드 설정 드롭다운 목록(options API) mock. Google Calendar 공급원만 항목을 주고 나머지는 빈 목록이다.
 * 단위 테스트는 공급원별 응답을 `server.use`로 덮어쓴다.
 */
export const createNodeOptionsHandlers = ({ delayMs }: NodeOptionsHandlersOptions = {}): HttpHandler[] => [
	http.get(NODE_OPTIONS_PATH, async ({ params, request }) => {
		if (delayMs) await delay(delayMs)
		const source = `${String(params.app)}.${String(params.resource)}`
		return ok(getOptionsPage(source, new URL(request.url).searchParams))
	}),
]
