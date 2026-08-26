import { describe, expect, it } from 'vitest'
import { getWorkflowNodeMeta } from '@/constants/workflow/workflowNode'
import type { ProviderInfo } from '@/types/credential'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import {
	createModelNameMap,
	isWorkflowNodeDto,
	toWorkflowCanvasEdges,
	toWorkflowCanvasNodes,
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
		label: '문의가 도착하면',
		description: '새 문의가 들어오면 시작해요',
		position: { x: 40, y: 80 },
		config: { triggerType: 'MANUAL' },
	},
	{
		id: 'ai',
		type: 'AI',
		label: '문의 분류하기',
		config: { model: 'gemini-2.5-flash' },
	},
	{
		id: 'condition',
		type: 'CONDITION',
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

	it('잘못된 AI 캔버스 위치를 노드 DTO로 허용하지 않는다', () => {
		const node = { id: 'ai', type: 'AI', label: 'AI 작업', config: {} }

		expect(isWorkflowNodeDto(node)).toBe(true)
		expect(isWorkflowNodeDto({ ...node, position: { x: 40, y: 80 } })).toBe(true)
		expect(isWorkflowNodeDto({ ...node, position: { x: 'bad', y: 0 } })).toBe(false)
		expect(isWorkflowNodeDto({ ...node, position: { x: 0, y: Number.POSITIVE_INFINITY } })).toBe(false)
		expect(isWorkflowNodeDto({ id: 'ai', type: 'AI', label: 'AI 작업' })).toBe(false)
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
				technicalDetails: [{ label: '실행 방식', value: '수동 실행 (MANUAL)' }],
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

	it('타입별 허용 목록에 포함된 기술 정보만 변환한다', () => {
		expect(toWorkflowTechnicalDetails('TRIGGER', { triggerType: 'WEBHOOK', brand: 'webhook' })).toEqual([
			{ label: '실행 방식', value: '웹훅 (WEBHOOK)' },
		])
		expect(toWorkflowTechnicalDetails('HTTP', { method: 'GET', url: 'https://example.com/todos/1' })).toEqual([
			{ label: 'Method', value: 'GET' },
			{ label: 'URL', value: 'https://example.com/todos/1' },
		])
		expect(
			toWorkflowTechnicalDetails('CONDITION', {
				left: '{{nodes.transform.output.completed}}',
				operator: 'equals',
				right: false,
			})
		).toEqual([{ label: '비교 방식', value: '같음 (equals)' }])
	})

	it('민감하거나 복잡한 config와 미정의 필드를 기술 정보에서 제외한다', () => {
		const details = toWorkflowTechnicalDetails('AI', {
			llmProvider: 'GEMINI',
			model: 'gemini-3.5-flash',
			credentialId: 'credential-secret',
			agentType: 'simple',
			tools: ['discord'],
			brand: 'openai',
			prompt: 'private prompt',
			mappings: { id: '{{nodes.http.output.id}}' },
			unknown: 'hidden value',
		})

		expect(details).toEqual([
			{ label: '제공자', value: 'GEMINI' },
			{ label: '모델 ID', value: 'gemini-3.5-flash' },
		])
		expect(toWorkflowTechnicalDetails('TRANSFORM', { mappings: { id: 'value' }, brand: 'filter' })).toEqual([])
	})

	it('Provider에 없는 모델은 원본 ID를 사용하고 기술 정보 모드를 반영한다', () => {
		const result = toWorkflowCanvasNodes(
			[{ id: 'ai', type: 'AI', label: 'AI 작업', config: { model: 'custom-model' } }],
			new Map(),
			true
		)

		expect(result[0].data).toMatchObject({ modelName: 'custom-model', technicalMode: true })
	})

	it('조회한 연결 관계를 방향 표시가 있는 연결선으로 변환한다', () => {
		const result = toWorkflowCanvasEdges(edges)

		expect(result).toHaveLength(2)
		expect(result[0]).toMatchObject({ source: 'trigger', target: 'ai', type: 'animated' })
		expect(result[0].data).toEqual({ conditionType: null })
		expect(result[0].markerEnd).toMatchObject({ color: '#6d5ce7' })
	})

	it('실행 실패 상태를 노드 오류 상태로 변환한다', () => {
		expect(toWorkflowNodeStatus()).toBe('idle')
		expect(toWorkflowNodeStatus('running')).toBe('running')
		expect(toWorkflowNodeStatus('success')).toBe('success')
		expect(toWorkflowNodeStatus('failed')).toBe('error')
	})
})
