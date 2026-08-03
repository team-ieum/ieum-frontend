import { describe, expect, it } from 'vitest'
import type { ProviderInfo } from '@/types/credential'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import {
	createModelNameMap,
	toWorkflowCanvasEdges,
	toWorkflowCanvasNodes,
	toWorkflowNodeStatus,
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
		config: { method: 'POST', url: '/hooks/inquiry' },
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
	it('API 노드를 컬러 블록 표시 데이터로 변환한다', () => {
		const modelNames = createModelNameMap(providers)
		const result = toWorkflowCanvasNodes(nodes, edges, modelNames, false)

		expect(result[0]).toMatchObject({
			position: { x: 40, y: 80 },
			data: {
				role: 'trigger',
				typeLabel: '시작 조건',
				step: 1,
				description: '새 문의가 들어오면 시작해요',
				method: 'POST',
				url: '/hooks/inquiry',
				status: 'idle',
				hasIncoming: false,
				hasOutgoing: true,
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
				hasIncoming: true,
				hasOutgoing: true,
			},
		})
		expect(result[2].data).toMatchObject({ role: 'action', typeLabel: '조건', step: 3 })
	})

	it('Provider에 없는 모델은 원본 ID를 사용하고 기술 정보 모드를 반영한다', () => {
		const result = toWorkflowCanvasNodes(
			[{ id: 'ai', type: 'AI', label: 'AI 작업', config: { model: 'custom-model' } }],
			[],
			new Map(),
			true
		)

		expect(result[0].data).toMatchObject({ modelName: 'custom-model', technicalMode: true })
	})

	it('조회한 연결 관계를 방향 표시가 있는 연결선으로 변환한다', () => {
		const result = toWorkflowCanvasEdges(edges)

		expect(result).toHaveLength(2)
		expect(result[0]).toMatchObject({ source: 'trigger', target: 'ai', type: 'animated' })
		expect(result[0].markerEnd).toMatchObject({ color: '#6d5ce7' })
	})

	it('실행 실패 상태를 노드 오류 상태로 변환한다', () => {
		expect(toWorkflowNodeStatus()).toBe('idle')
		expect(toWorkflowNodeStatus('running')).toBe('running')
		expect(toWorkflowNodeStatus('success')).toBe('success')
		expect(toWorkflowNodeStatus('failed')).toBe('error')
	})
})
