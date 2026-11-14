import type { NodeCatalogEntry, NodeCatalogResponse } from '@/types/nodeCatalog'

const manualRunEntry = {
	id: 'manual.run',
	kind: 'trigger',
	provider: 'ieum',
	app: 'manual',
	appTitle: '수동 실행',
	nodeType: 'TRIGGER',
	title: '직접 실행할 때',
	description: '실행 버튼을 누르면 시작합니다.',
	fixed: { type: 'TRIGGER', event: 'manual.run', config: { brand: 'ieum' } },
	inputFields: [],
	outputFields: [],
	outputDynamic: true,
} satisfies NodeCatalogEntry

const scheduleEveryEntry = {
	id: 'schedule.every',
	kind: 'trigger',
	provider: 'ieum',
	app: 'schedule',
	appTitle: '스케줄',
	nodeType: 'TRIGGER',
	title: '정해진 주기마다',
	fixed: { type: 'TRIGGER', event: 'schedule.every', config: { brand: 'ieum' } },
	inputFields: [{ key: 'cron', title: '주기', type: 'cron', required: true, ref: false, path: 'config.cron' }],
	outputFields: [{ key: 'firedAt', title: '실행 시각', type: 'datetime' }],
} satisfies NodeCatalogEntry

const webhookCatchEntry = {
	id: 'webhook.catch',
	kind: 'trigger',
	provider: 'ieum',
	app: 'webhook',
	appTitle: '웹훅',
	nodeType: 'TRIGGER',
	title: '웹훅을 받으면',
	fixed: { type: 'TRIGGER', event: 'webhook.catch', config: { brand: 'ieum' } },
	inputFields: [],
	outputFields: [],
	outputDynamic: true,
} satisfies NodeCatalogEntry

const gmailNewEmailEntry = {
	id: 'gmail.new_email',
	kind: 'trigger',
	provider: 'google',
	app: 'gmail',
	appTitle: 'Gmail',
	nodeType: 'TRIGGER',
	title: '새 메일이 오면',
	fixed: { type: 'TRIGGER', event: 'gmail.new_email', config: { brand: 'gmail' } },
	inputFields: [],
	outputFields: [
		{ key: 'subject', title: '제목', type: 'string' },
		{ key: 'from', title: '보낸 사람', type: 'string' },
	],
} satisfies NodeCatalogEntry

const httpRequestEntry = {
	id: 'http.request',
	kind: 'action',
	provider: 'ieum',
	app: 'http',
	appTitle: 'HTTP',
	nodeType: 'HTTP',
	title: 'HTTP 요청 보내기',
	fixed: { type: 'HTTP', event: 'http.request', config: { brand: 'ieum' } },
	inputFields: [
		{
			key: 'method',
			title: 'Method',
			type: 'string',
			required: true,
			ref: false,
			choices: [
				{ id: 'GET', name: 'GET' },
				{ id: 'POST', name: 'POST' },
			],
			path: 'config.method',
		},
		{ key: 'url', title: 'URL', type: 'string', required: true, path: 'config.url' },
	],
	outputFields: [{ key: 'status', title: '상태 코드', type: 'integer' }],
} satisfies NodeCatalogEntry

const aiAgentEntry = {
	id: 'ai.agent',
	kind: 'action',
	provider: 'ieum',
	app: 'ai',
	appTitle: 'AI',
	nodeType: 'AI',
	title: 'AI 에이전트',
	description: '도구를 골라 쓰며 작업합니다.',
	fixed: {
		type: 'AI',
		event: 'ai.agent',
		config: { agentType: 'react', credentialId: '', tools: [], brand: 'openai' },
	},
	inputFields: [
		{
			key: 'llmProvider',
			title: 'AI 제공자',
			type: 'string',
			required: true,
			ref: false,
			choices: [
				{ id: 'CLAUDE', name: 'Claude' },
				{ id: 'OPENAI', name: 'OpenAI' },
				{ id: 'GEMINI', name: 'Gemini' },
			],
			path: 'config.llmProvider',
		},
		{ key: 'prompt', title: '프롬프트', type: 'text', required: true, path: 'config.prompt' },
		{
			key: 'tools',
			title: '도구',
			type: 'object',
			list: true,
			required: true,
			ref: false,
			description: 'AI가 쓸 앱 동작을 골라요. 고른 도구의 칸은 직접 채우거나 AI에게 맡길 수 있어요.',
			choices: [
				{ id: 'discord', name: 'Discord 웹훅으로 보내기' },
				{ id: 'builtin:slack_send_channel_message', name: 'Slack 채널에 메시지 보내기' },
				{ id: 'builtin:google_calendar_update', name: '캘린더 일정 수정' },
			],
			path: 'config.tools',
		},
	],
	outputFields: [{ key: 'output', title: '결과', type: 'text' }],
} satisfies NodeCatalogEntry

// 실제 카탈로그처럼 ai.reasoning에는 도구 칸이 없다. 두 AI 노드의 도구 칸은 ai.agent 항목의 칸을 함께 쓴다.
// 출력 칸(outputFields)은 ai.reasoning에만 있다(실제 카탈로그 events/ai/reasoning.json과 같은 모양).
const aiReasoningEntry = {
	...aiAgentEntry,
	inputFields: [
		...aiAgentEntry.inputFields.filter(field => field.key !== 'tools'),
		{
			key: 'outputFields',
			title: '출력 칸',
			type: 'object',
			list: true,
			ref: false,
			path: 'config.outputFields',
			description: 'AI가 이 칸들로만 답해요. 다음 단계에서 칸 하나씩 골라 쓸 수 있어요. 비우면 결과 한 칸이에요.',
			children: [
				{ key: 'key', title: '이름', type: 'string', required: true },
				{
					key: 'type',
					title: '타입',
					type: 'string',
					required: true,
					choices: [
						{ id: 'text', name: '텍스트' },
						{ id: 'number', name: '숫자' },
						{ id: 'boolean', name: '참/거짓' },
					],
				},
				{ key: 'description', title: '설명', type: 'text' },
			],
		},
	],
	id: 'ai.reasoning',
	title: 'AI 답변 만들기',
	description: '도구 없이 글을 만들거나 분류합니다.',
	fixed: {
		type: 'AI',
		event: 'ai.reasoning',
		config: { agentType: 'simple', credentialId: '', tools: [], brand: 'openai' },
	},
	outputsFrom: 'config.outputFields',
} satisfies NodeCatalogEntry

const discordSendEntry = {
	id: 'discord.send_message',
	kind: 'action',
	provider: 'discord',
	app: 'discord',
	appTitle: 'Discord (웹훅)',
	toolKey: 'discord',
	nodeType: 'ACTION',
	title: 'Discord 웹훅으로 보내기',
	fixed: { type: 'ACTION', event: 'discord.send_message', config: { brand: 'discord' } },
	inputFields: [
		{
			key: 'webhookCredentialId',
			title: '웹훅',
			type: 'string',
			required: true,
			ref: false,
			optionsSource: 'discord.webhooks',
			path: 'config.webhookCredentialId',
		},
		{ key: 'content', title: '메시지', type: 'text', path: 'config.content' },
		{ key: 'username', title: '보낸 사람 이름', type: 'string', path: 'config.username' },
	],
	outputFields: [{ key: 'id', title: '메시지 ID', type: 'string' }],
} satisfies NodeCatalogEntry

const slackBotSendEntry = {
	id: 'slack_bot.send_channel_message',
	kind: 'action',
	provider: 'slack',
	app: 'slack_bot',
	appTitle: 'Slack',
	toolKey: 'builtin:slack_send_channel_message',
	nodeType: 'ACTION',
	title: 'Slack 채널에 메시지 보내기',
	fixed: { type: 'ACTION', event: 'slack_bot.send_channel_message', config: { brand: 'slack' } },
	inputFields: [
		{
			key: 'channel',
			title: '채널',
			type: 'string',
			required: true,
			optionsSource: 'slack.channels',
			path: 'config.channel',
		},
		{ key: 'text', title: '메시지', type: 'text', required: true, path: 'config.text' },
		{ key: 'thread_ts', title: '스레드', type: 'string', default: '', path: 'config.thread_ts' },
	],
	outputFields: [
		{ key: 'ts', title: '메시지 ts', type: 'string' },
		{ key: 'channel', title: '채널 ID', type: 'string' },
		{ key: 'permalink', title: '메시지 링크', type: 'string' },
	],
} satisfies NodeCatalogEntry

// Google Calendar 4종. 실제 카탈로그(ieum-node-catalog events/google_calendar)와 같은 칸·기본값·선택지 모양이다.
const GOOGLE_CALENDAR_BASE = {
	provider: 'google',
	app: 'google_calendar',
	appTitle: 'Google Calendar',
	nodeType: 'ACTION',
} as const

const calendarIdField = (description: string, optionsSource: string) => ({
	key: 'calendar_id',
	title: '캘린더',
	type: 'string' as const,
	default: 'primary',
	description,
	optionsSource,
	path: 'config.calendar_id',
})

const eventIdField = (description: string) => ({
	key: 'event_id',
	title: '일정',
	type: 'string' as const,
	required: true,
	description,
	optionsSource: 'google.events',
	optionsInputs: ['calendar_id'],
	path: 'config.event_id',
})

const scopeField = (description: string) => ({
	key: 'scope',
	title: '적용 범위',
	type: 'string' as const,
	default: 'this',
	ref: false,
	description,
	choices: [
		{ id: 'this', name: '이 일정만' },
		{ id: 'all', name: '반복 전체' },
	],
	path: 'config.scope',
})

const sendUpdatesField = {
	key: 'send_updates',
	title: '참석자 알림',
	type: 'string' as const,
	ref: false,
	description: '비우면 Google 기본 동작',
	choices: [
		{ id: 'all', name: '모두에게' },
		{ id: 'externalOnly', name: '외부 참석자에게만' },
		{ id: 'none', name: '보내지 않음' },
	],
	path: 'config.send_updates',
}

const calendarEventOutputFields = [
	{ key: 'eventId', title: '일정 ID', type: 'string' as const },
	{ key: 'htmlLink', title: '일정 링크', type: 'string' as const },
]

const googleCalendarCreateEntry = {
	...GOOGLE_CALENDAR_BASE,
	id: 'google_calendar.create',
	kind: 'action',
	toolKey: 'builtin:google_calendar_create',
	title: '캘린더 일정 만들기',
	fixed: { type: 'ACTION', event: 'google_calendar.create', config: {} },
	inputFields: [
		calendarIdField('대상 캘린더 (비우면 기본 캘린더)', 'google.writable_calendars'),
		{ key: 'summary', title: '제목', type: 'string', required: true, path: 'config.summary' },
		{ key: 'start_datetime', title: '시작', type: 'datetime', required: true, path: 'config.start_datetime' },
		{ key: 'end_datetime', title: '종료', type: 'datetime', required: true, path: 'config.end_datetime' },
		{ key: 'description', title: '설명', type: 'text', default: '', path: 'config.description' },
	],
	outputFields: calendarEventOutputFields,
} satisfies NodeCatalogEntry

const googleCalendarFindEntry = {
	...GOOGLE_CALENDAR_BASE,
	id: 'google_calendar.find',
	kind: 'search',
	toolKey: 'builtin:google_calendar_find',
	title: '캘린더 일정 찾기',
	fixed: { type: 'ACTION', event: 'google_calendar.find', config: {} },
	inputFields: [
		calendarIdField('읽을 캘린더 (비우면 기본 캘린더, 공휴일 캘린더 포함)', 'google.calendars'),
		{ key: 'query', title: '검색어', type: 'string', default: '', path: 'config.query' },
		{
			key: 'period',
			title: '기간',
			type: 'string',
			default: '',
			choices: [
				{ id: 'today', name: '오늘' },
				{ id: 'tomorrow', name: '내일' },
				{ id: 'this_week', name: '이번 주(월~일)' },
				{ id: 'next_7_days', name: '앞으로 7일' },
			],
			path: 'config.period',
		},
		{ key: 'time_min', title: '시작 시각', type: 'datetime', default: '', path: 'config.time_min' },
		{ key: 'time_max', title: '종료 시각', type: 'datetime', default: '', path: 'config.time_max' },
		{ key: 'max_results', title: '최대 개수', type: 'integer', default: 50, path: 'config.max_results' },
	],
	outputFields: [
		{ key: 'found', title: '찾음', type: 'boolean' },
		{ key: 'total', title: '개수', type: 'integer' },
		{
			key: 'items',
			title: '일정',
			type: 'object',
			list: true,
			children: [
				{ key: 'id', title: 'ID', type: 'string' },
				{ key: 'summary', title: '제목', type: 'string' },
				{ key: 'start', title: '시작', type: 'datetime' },
				{
					key: 'end',
					title: '종료',
					type: 'datetime',
					description: '종일 일정은 날짜이고, Google 규칙대로 끝나는 날의 다음 날이에요',
				},
				{ key: 'allDay', title: '종일', type: 'boolean' },
			],
		},
	],
} satisfies NodeCatalogEntry

const googleCalendarUpdateEntry = {
	...GOOGLE_CALENDAR_BASE,
	id: 'google_calendar.update',
	kind: 'action',
	toolKey: 'builtin:google_calendar_update',
	title: '캘린더 일정 수정',
	fixed: { type: 'ACTION', event: 'google_calendar.update', config: {} },
	inputFields: [
		eventIdField('수정할 일정'),
		calendarIdField('대상 캘린더 (비우면 기본 캘린더, 쓰기 권한이 있는 캘린더만)', 'google.writable_calendars'),
		{ key: 'summary', title: '새 제목', type: 'string', description: '비우면 그대로', path: 'config.summary' },
		{
			key: 'start_datetime',
			title: '새 시작',
			type: 'datetime',
			description: '비우면 그대로. 시작만 바꾸면 길이를 유지해요',
			path: 'config.start_datetime',
		},
		{
			key: 'end_datetime',
			title: '새 종료',
			type: 'datetime',
			description: '비우면 그대로. 종일 일정은 끝나는 날(포함)',
			path: 'config.end_datetime',
		},
		{ key: 'description', title: '새 설명', type: 'text', description: '비우면 그대로', path: 'config.description' },
		scopeField('반복 일정일 때 이 일정만 또는 반복 전체(반복 전체는 날짜는 두고 시각만 바꿔요)'),
		{
			key: 'all_day',
			title: '종일',
			type: 'boolean',
			ref: false,
			description: '켜면 종일 일정, 끄면 시각 일정. 비우면 그대로',
			path: 'config.all_day',
		},
		{
			key: 'time_zone',
			title: '시간대',
			type: 'string',
			description: 'IANA 이름(예: Asia/Seoul). 비우면 캘린더 시간대',
			path: 'config.time_zone',
		},
		{ key: 'location', title: '새 장소', type: 'string', description: '비우면 그대로', path: 'config.location' },
		{
			key: 'attendees',
			title: '참석자',
			type: 'string',
			description: '이메일을 쉼표로 구분, 기존 참석자를 모두 바꿉니다. 비우면 그대로',
			path: 'config.attendees',
		},
		sendUpdatesField,
	],
	outputFields: calendarEventOutputFields,
} satisfies NodeCatalogEntry

const googleCalendarDeleteEntry = {
	...GOOGLE_CALENDAR_BASE,
	id: 'google_calendar.delete',
	kind: 'action',
	toolKey: 'builtin:google_calendar_delete',
	title: '캘린더 일정 삭제',
	fixed: { type: 'ACTION', event: 'google_calendar.delete', config: {} },
	inputFields: [
		eventIdField('삭제할 일정'),
		calendarIdField('대상 캘린더 (비우면 기본 캘린더, 쓰기 권한이 있는 캘린더만)', 'google.writable_calendars'),
		scopeField('반복 일정일 때 이 일정만 또는 반복 전체'),
		sendUpdatesField,
	],
	outputFields: [
		{ key: 'eventId', title: '일정 ID', type: 'string' },
		{ key: 'deleted', title: '삭제됨', type: 'boolean' },
	],
} satisfies NodeCatalogEntry

export const nodeCatalogEntriesFixture: NodeCatalogEntry[] = [
	aiAgentEntry,
	aiReasoningEntry,
	discordSendEntry,
	gmailNewEmailEntry,
	googleCalendarCreateEntry,
	googleCalendarDeleteEntry,
	googleCalendarFindEntry,
	googleCalendarUpdateEntry,
	httpRequestEntry,
	manualRunEntry,
	scheduleEveryEntry,
	slackBotSendEntry,
	webhookCatchEntry,
]

export const nodeCatalogResponse = {
	success: true,
	data: { entries: nodeCatalogEntriesFixture },
	message: 'OK',
	code: 'OK',
} satisfies NodeCatalogResponse

export const emptyNodeCatalogResponse = {
	...nodeCatalogResponse,
	data: { entries: [] },
} satisfies NodeCatalogResponse
