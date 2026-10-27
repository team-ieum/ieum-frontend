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
	],
	outputFields: [{ key: 'output', title: '결과', type: 'text' }],
} satisfies NodeCatalogEntry

const aiReasoningEntry = {
	...aiAgentEntry,
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

export const nodeCatalogEntriesFixture: NodeCatalogEntry[] = [
	aiAgentEntry,
	aiReasoningEntry,
	gmailNewEmailEntry,
	httpRequestEntry,
	manualRunEntry,
	scheduleEveryEntry,
	slackBotSendEntry,
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
