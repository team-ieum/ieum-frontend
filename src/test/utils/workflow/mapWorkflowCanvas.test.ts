import { describe, expect, it } from 'vitest'
import { getWorkflowNodeMeta } from '@/constants/workflow/workflowNode'
import type { ProviderInfo } from '@/types/credential'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import {
	createModelNameMap,
	createWorkflowCanvasEdge,
	isWorkflowEdgeDto,
	isWorkflowNodeDto,
	normalizeWorkflowCanvasDocument,
	toWorkflowCanvasEdges,
	toWorkflowCanvasNodes,
	toWorkflowEdgeDtos,
	toWorkflowNodeStatus,
	toWorkflowTechnicalDetails,
} from '@/utils/workflow/mapWorkflowCanvas'

const providers: ProviderInfo[] = [
	{
		provider: 'GEMINI',
		displayName: 'Google Gemini',
		credentialTypes: ['API_KEY'],
		models: [
			{
				id: 'gemini-2.5-flash',
				displayName: 'Gemini 2.5 Flash',
				capabilities: [],
				maxOutputTokens: 8192,
				contextWindow: 1_000_000,
			},
		],
	},
]

const edges: WorkflowEdgeDto[] = [
	{ source: 'trigger', target: 'ai', conditionType: null },
	{ source: 'ai', target: 'condition' },
]

const nodes: WorkflowNodeDto[] = [
	{
		id: 'trigger',
		type: 'TRIGGER',
		event: 'manual.run',
		label: '문의가 도착하면',
		description: '새 문의가 들어오면 시작해요',
		position: { x: 40, y: 80 },
		config: {},
	},
	{
		id: 'ai',
		type: 'AI',
		event: 'ai.reasoning',
		label: '문의 분류하기',
		config: { model: 'gemini-2.5-flash' },
	},
	{
		id: 'condition',
		type: 'CONDITION',
		event: 'branch.if',
		label: '긴급 문의 확인',
		config: {},
	},
]

describe('mapWorkflowCanvas', () => {
	it.each([
		['TRIGGER', 'trigger', '시작 조건', 'play', '#2e8b68'],
		['HTTP', 'action', 'HTTP 요청', 'globe', '#c75146'],
		['TRANSFORM', 'action', '데이터 변환', 'shuffle', '#287fa4'],
		['CONDITION', 'action', '조건', 'branch', '#9a6700'],
		['AI', 'ai', 'AI 작업', 'bot', '#6d5ce7'],
		['ACTION', 'action', '앱 작업', 'app', '#b8407a'],
		['APPROVAL', 'action', '승인 요청', 'approval', '#b4532a'],
	])('%s 타입의 역할, 표시명, 아이콘과 색상을 반환한다', (type, role, label, iconKey, color) => {
		expect(getWorkflowNodeMeta(type)).toMatchObject({ role, label, iconKey })
		expect(getWorkflowNodeMeta(type).toneClass).toContain(color)
	})

	it('알 수 없는 타입은 원본 타입명과 중립 스타일을 사용한다', () => {
		expect(getWorkflowNodeMeta('CUSTOM')).toMatchObject({
			role: 'action',
			label: 'CUSTOM',
			iconKey: 'workflow',
		})
	})

	it('event가 없거나 빈 문자열인 노드를 노드 DTO로 허용하지 않는다', () => {
		const node = { id: 'ai', type: 'AI', event: 'ai.reasoning', label: 'AI 작업', config: {} }

		expect(isWorkflowNodeDto(node)).toBe(true)
		expect(isWorkflowNodeDto({ id: 'ai', type: 'AI', label: 'AI 작업', config: {} })).toBe(false)
		expect(isWorkflowNodeDto({ ...node, event: '' })).toBe(false)
		expect(isWorkflowNodeDto({ ...node, event: '   ' })).toBe(false)
		expect(isWorkflowNodeDto({ ...node, event: 42 })).toBe(false)
	})

	it('엣지 id는 문자열·null·생략만 허용한다', () => {
		const edge = { source: 'trigger', target: 'ai' }

		expect(isWorkflowEdgeDto(edge)).toBe(true)
		expect(isWorkflowEdgeDto({ ...edge, id: 'edge-1' })).toBe(true)
		expect(isWorkflowEdgeDto({ ...edge, id: null })).toBe(true)
		expect(isWorkflowEdgeDto({ ...edge, id: 7 })).toBe(false)
	})

	it('잘못된 AI 캔버스 위치를 노드 DTO로 허용하지 않는다', () => {
		const node = { id: 'ai', type: 'AI', event: 'ai.reasoning', label: 'AI 작업', config: {} }

		expect(isWorkflowNodeDto(node)).toBe(true)
		expect(isWorkflowNodeDto({ ...node, position: { x: 40, y: 80 } })).toBe(true)
		expect(isWorkflowNodeDto({ ...node, position: { x: 'bad', y: 0 } })).toBe(false)
		expect(isWorkflowNodeDto({ ...node, position: { x: 0, y: Number.POSITIVE_INFINITY } })).toBe(false)
		expect(isWorkflowNodeDto({ id: 'ai', type: 'AI', event: 'ai.reasoning', label: 'AI 작업' })).toBe(false)
	})

	it('공통 canvas 입력에서 잘못된 좌표와 orphan 연결선을 제거한다', () => {
		const validNode = {
			id: 'valid',
			type: 'TRIGGER',
			event: 'manual.run',
			label: '유효 노드',
			position: { x: 0, y: 80 },
			config: {},
		}
		const fallbackNode = { id: 'fallback', type: 'AI', event: 'ai.reasoning', label: '좌표 없는 노드', config: {} }
		const rawNodes: unknown[] = [
			validNode,
			fallbackNode,
			{ ...validNode, id: 'string-position', position: { x: '40', y: 0 } },
			{ ...validNode, id: 'nan-position', position: { x: Number.NaN, y: 0 } },
			{ ...validNode, id: 'infinite-position', position: { x: 0, y: Number.POSITIVE_INFINITY } },
			{ ...validNode, id: 'missing-config', config: undefined },
			{ ...validNode, id: 'missing-event', event: undefined },
		]
		const validEdge = { source: 'valid', target: 'fallback' }
		const rawEdges: unknown[] = [
			validEdge,
			{ source: 'valid', target: 'missing' },
			{ source: 'string-position', target: 'fallback' },
			{ source: 'valid', target: 'nan-position' },
			{ source: 'valid', target: 'infinite-position' },
			{ source: 'valid', target: 42 },
		]

		expect(normalizeWorkflowCanvasDocument(rawNodes, rawEdges)).toEqual({
			nodes: [validNode, fallbackNode],
			edges: [validEdge],
		})
		expect(rawNodes).toHaveLength(7)
		expect(rawEdges).toHaveLength(6)
	})

	it('API 노드를 컬러 블록 표시 데이터로 변환한다', () => {
		const modelNames = createModelNameMap(providers)
		const result = toWorkflowCanvasNodes(nodes, modelNames, false)

		expect(result[0]).toMatchObject({
			position: { x: 40, y: 80 },
			deletable: false,
			data: {
				role: 'trigger',
				typeLabel: '시작 조건',
				step: 1,
				description: '새 문의가 들어오면 시작해요',
				technicalDetails: [
					{ label: '실행 방식', value: '수동 실행' },
					{ label: '이벤트', value: 'manual.run' },
				],
				status: 'idle',
			},
		})
		expect(result[1]).toMatchObject({
			position: { x: 360, y: 100 },
			data: {
				role: 'ai',
				typeLabel: 'AI 작업',
				description: '설명 정보가 아직 없어요',
				modelId: 'gemini-2.5-flash',
				modelName: 'Gemini 2.5 Flash',
			},
		})
		expect(result[2].data).toMatchObject({ role: 'action', typeLabel: '조건', step: 3 })
	})

	it('트리거는 실행 방식과 event 원문을 두 행으로 표시한다', () => {
		expect(toWorkflowTechnicalDetails({ type: 'TRIGGER', event: 'webhook.catch', config: { brand: 'webhook' } })).toEqual([
			{ label: '실행 방식', value: '웹훅' },
			{ label: '이벤트', value: 'webhook.catch' },
		])
		expect(toWorkflowTechnicalDetails({ type: 'TRIGGER', event: 'gmail.new_email', config: {} })).toEqual([
			{ label: '실행 방식', value: 'Gmail 메일' },
			{ label: '이벤트', value: 'gmail.new_email' },
		])
		expect(toWorkflowTechnicalDetails({ type: 'TRIGGER', event: 'github.new_issue', config: {} })).toEqual([
			{ label: '실행 방식', value: 'GitHub 이슈' },
			{ label: '이벤트', value: 'github.new_issue' },
		])
	})

	it('스케줄 트리거는 cron을 한국어 문장으로 바꾸고 원문을 title로 남긴다', () => {
		expect(toWorkflowTechnicalDetails({ type: 'TRIGGER', event: 'schedule.every', config: { cron: '0 9 * * 1' } })).toEqual([
			{ label: '실행 방식', value: '스케줄' },
			{ label: '이벤트', value: 'schedule.every' },
			{ label: '주기', value: '오전 09:00, 월요일에만', title: '0 9 * * 1' },
		])
	})

	it('해석할 수 없는 cron은 원문을 주기로 표시하고 cron이 없으면 주기 행을 뺀다', () => {
		expect(
			toWorkflowTechnicalDetails({ type: 'TRIGGER', event: 'schedule.every', config: { cron: 'every day' } })
		).toContainEqual({ label: '주기', value: 'every day', title: 'every day' })
		expect(toWorkflowTechnicalDetails({ type: 'TRIGGER', event: 'schedule.every', config: {} })).toEqual([
			{ label: '실행 방식', value: '스케줄' },
			{ label: '이벤트', value: 'schedule.every' },
		])
	})

	it('표시 규칙이 없는 트리거 event는 실행 방식 행 없이 event 원문만 표시한다', () => {
		expect(toWorkflowTechnicalDetails({ type: 'TRIGGER', event: 'calendar.new_event', config: {} })).toEqual([
			{ label: '이벤트', value: 'calendar.new_event' },
		])
	})

	it('트리거 외 노드는 타입별 허용 목록에 포함된 기술 정보만 변환하고 event 행을 넣지 않는다', () => {
		expect(
			toWorkflowTechnicalDetails({
				type: 'HTTP',
				event: 'http.request',
				config: { method: 'GET', url: 'https://example.com/todos/1' },
			})
		).toEqual([
			{ label: 'Method', value: 'GET' },
			{ label: 'URL', value: 'https://example.com/todos/1' },
		])
		expect(
			toWorkflowTechnicalDetails({
				type: 'CONDITION',
				event: 'branch.if',
				config: {
					left: '{{nodes.transform.output.completed}}',
					operator: 'equals',
					right: false,
				},
			})
		).toEqual([{ label: '비교 방식', value: '같음 (equals)' }])
		expect(
			toWorkflowTechnicalDetails({ type: 'ACTION', event: 'slack_bot.send_channel_message', config: { brand: 'slack' } })
		).toEqual([])
	})

	it('민감하거나 복잡한 config와 미정의 필드를 기술 정보에서 제외한다', () => {
		const details = toWorkflowTechnicalDetails({
			type: 'AI',
			event: 'ai.agent',
			config: {
				llmProvider: 'GEMINI',
				model: 'gemini-3.5-flash',
				credentialId: 'credential-secret',
				agentType: 'simple',
				tools: ['discord'],
				brand: 'openai',
				prompt: 'private prompt',
				mappings: { id: '{{nodes.http.output.id}}' },
				unknown: 'hidden value',
			},
		})

		expect(details).toEqual([
			{ label: '제공자', value: 'GEMINI' },
			{ label: '모델 ID', value: 'gemini-3.5-flash' },
		])
		expect(
			toWorkflowTechnicalDetails({ type: 'TRANSFORM', event: 'transform.map', config: { mappings: { id: 'value' } } })
		).toEqual([])
	})

	it('Provider에 없는 모델은 원본 ID를 사용하고 기술 정보 모드를 반영한다', () => {
		const result = toWorkflowCanvasNodes(
			[{ id: 'ai', type: 'AI', event: 'ai.reasoning', label: 'AI 작업', config: { model: 'custom-model' } }],
			new Map(),
			true
		)

		expect(result[0].data).toMatchObject({ modelName: 'custom-model', technicalMode: true })
	})

	it('ACTION 노드는 알려진 config.brand만 쓰고 그때 헤더 라벨을 서비스 이름으로 바꾼다', () => {
		const result = toWorkflowCanvasNodes(
			[
				{
					id: 'slack',
					type: 'ACTION',
					event: 'slack_bot.send_channel_message',
					label: '알림',
					config: { brand: 'slack' },
				},
				{ id: 'sheets', type: 'ACTION', event: 'sheets.append_row', label: '기록', config: { brand: 'sheets' } },
				{ id: 'unknown', type: 'ACTION', event: 'unknown.app', label: '알 수 없음', config: { brand: 'unknown' } },
				{ id: 'http', type: 'HTTP', event: 'http.request', label: '요청', config: { brand: 'slack' } },
			],
			new Map(),
			false
		)

		expect(result.map(node => [node.data.brand, node.data.typeLabel])).toEqual([
			['slack', 'Slack'],
			['sheets', 'Google Sheets'],
			[undefined, '앱 작업'],
			[undefined, 'HTTP 요청'],
		])
	})

	it('카탈로그에 없는 event 노드는 type 기준 기본 표시를 유지한다', () => {
		const [result] = toWorkflowCanvasNodes(
			[{ id: 'future', type: 'CUSTOM', event: 'future_app.do_something', label: '새 노드', config: {} }],
			new Map(),
			true
		)

		expect(result.data).toMatchObject({ typeLabel: 'CUSTOM', role: 'action', technicalDetails: [] })
	})

	it('카탈로그 밖 event 노드를 표시하고 트리거가 아닌 노드에는 event 행을 앞에 붙인다', () => {
		const catalogEvents = new Set(['manual.run', 'http.request'])
		const result = toWorkflowCanvasNodes(
			[
				{ id: 'known', type: 'HTTP', event: 'http.request', label: '요청', config: { method: 'GET' } },
				{ id: 'future', type: 'ACTION', event: 'future_app.do_something', label: '새 노드', config: {} },
				{ id: 'trigger', type: 'TRIGGER', event: 'calendar.new_event', label: '새 일정', config: {} },
			],
			new Map(),
			true,
			catalogEvents
		)

		expect(result.map(node => node.data.isOutsideCatalog)).toEqual([false, true, true])
		expect(result[0].data.technicalDetails).toEqual([{ label: 'Method', value: 'GET' }])
		expect(result[1].data.technicalDetails).toEqual([{ label: '이벤트', value: 'future_app.do_something' }])
		expect(result[2].data.technicalDetails).toEqual([{ label: '이벤트', value: 'calendar.new_event' }])
	})

	it('카탈로그를 받기 전에는 어떤 노드도 카탈로그 밖으로 판정하지 않는다', () => {
		const [result] = toWorkflowCanvasNodes(
			[{ id: 'future', type: 'ACTION', event: 'future_app.do_something', label: '새 노드', config: {} }],
			new Map(),
			true
		)

		expect(result.data.isOutsideCatalog).toBe(false)
		expect(result.data.technicalDetails).toEqual([])
	})

	it('조회한 연결 관계를 방향 표시가 있는 연결선으로 변환한다', () => {
		const result = toWorkflowCanvasEdges(edges)

		expect(result).toHaveLength(2)
		expect(result[0]).toMatchObject({ source: 'trigger', target: 'ai', type: 'animated' })
		expect(result[0].data).toEqual({ conditionType: null })
		expect(result[0]).toMatchObject({ style: { stroke: '#a8b0ba', strokeWidth: 1.5 } })
		expect(result[0].markerEnd).toMatchObject({ color: '#a8b0ba' })
	})

	it('서버 엣지 id는 캔버스 id로 쓰고 저장 요청에 그대로 싣는다', () => {
		const canvasEdges = toWorkflowCanvasEdges([
			{ id: 'edge-server', source: 'trigger', target: 'ai', conditionType: null },
			{ id: null, source: 'ai', target: 'condition', conditionType: 'true' },
		])

		expect(canvasEdges.map(edge => edge.id)).toEqual(['edge-server', 'ai-condition-1'])
		expect(toWorkflowEdgeDtos(canvasEdges)).toEqual([
			{ id: 'edge-server', source: 'trigger', target: 'ai', conditionType: null },
			{ source: 'ai', target: 'condition', conditionType: 'true' },
		])
	})

	it('캔버스에서 새로 이은 엣지는 id 없이 저장 요청을 만든다', () => {
		const edge = createWorkflowCanvasEdge({ source: 'trigger', target: 'ai', conditionType: null }, 'manual-trigger-ai')

		expect(toWorkflowEdgeDtos([edge])).toEqual([{ source: 'trigger', target: 'ai', conditionType: null }])
		expect(toWorkflowEdgeDtos([edge])[0]).not.toHaveProperty('id')
	})

	it('실행 실패 상태를 노드 오류 상태로 변환한다', () => {
		expect(toWorkflowNodeStatus()).toBe('idle')
		expect(toWorkflowNodeStatus('running')).toBe('running')
		expect(toWorkflowNodeStatus('success')).toBe('success')
		expect(toWorkflowNodeStatus('failed')).toBe('error')
		expect(toWorkflowNodeStatus('waitingApproval')).toBe('waitingApproval')
		expect(toWorkflowNodeStatus('skipped')).toBe('skipped')
	})
})
