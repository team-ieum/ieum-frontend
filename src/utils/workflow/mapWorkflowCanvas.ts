import { MarkerType } from '@xyflow/react'
import { getWorkflowNodeMeta } from '@/constants/workflow/workflowNode'
import type { ProviderInfo } from '@/types/credential'
import type { WorkflowEdgeType, WorkflowNodeStatus, WorkflowNodeType } from '@/types/workflow'
import type { NodeExecutionStatus } from '@/types/workflowExecution'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'

const EDGE_COLOR = '#6d5ce7'
const FALLBACK_DESCRIPTION = '설명 정보가 아직 없어요'

const readConfigString = (config: Record<string, unknown>, key: string) => {
	const value = config[key]
	return typeof value === 'string' && value.trim() ? value : undefined
}

export const createModelNameMap = (providers: ProviderInfo[] = []) => {
	const modelNames = new Map<string, string>()
	providers.forEach(provider => {
		provider.models.forEach(model => modelNames.set(model.id, model.displayName))
	})
	return modelNames
}

const hasValidPosition = (position: unknown): position is { x: number; y: number } => {
	if (typeof position !== 'object' || position === null) return false
	const candidate = position as Partial<{ x: unknown; y: unknown }>
	return (
		typeof candidate.x === 'number' &&
		Number.isFinite(candidate.x) &&
		typeof candidate.y === 'number' &&
		Number.isFinite(candidate.y)
	)
}

const isConfig = (config: unknown): config is Record<string, unknown> =>
	typeof config === 'object' && config !== null && !Array.isArray(config)

export const isWorkflowNodeDto = (value: unknown): value is WorkflowNodeDto => {
	if (typeof value !== 'object' || value === null) return false
	const node = value as Partial<WorkflowNodeDto>
	return (
		typeof node.id === 'string' &&
		typeof node.type === 'string' &&
		typeof node.label === 'string' &&
		(node.position === undefined || hasValidPosition(node.position)) &&
		isConfig(node.config)
	)
}

export const isWorkflowEdgeDto = (value: unknown): value is WorkflowEdgeDto => {
	if (typeof value !== 'object' || value === null) return false
	const edge = value as Partial<WorkflowEdgeDto>
	return typeof edge.source === 'string' && typeof edge.target === 'string'
}

export const toWorkflowNodeStatus = (status?: NodeExecutionStatus): WorkflowNodeStatus => {
	if (status === 'failed') return 'error'
	return status ?? 'idle'
}

export const toWorkflowCanvasNodes = (
	nodes: WorkflowNodeDto[],
	modelNames: ReadonlyMap<string, string>,
	technicalMode: boolean
): WorkflowNodeType[] => {
	return nodes.map((dto, index) => {
		const meta = getWorkflowNodeMeta(dto.type)
		const config = dto.config ?? {}
		const modelId = readConfigString(config, 'model')

		return {
			id: dto.id,
			type: 'workflowNode',
			deletable: false,
			// TODO: 서버가 노드 위치를 항상 반환하면 배열 순서 기반 배치를 제거합니다.
			position: dto.position ?? { x: index * 360, y: 100 },
			data: {
				nodeType: dto.type,
				role: meta.role,
				typeLabel: meta.label,
				step: index + 1,
				title: dto.label,
				// TODO: 서버가 설명을 항상 반환하면 대체 문구를 제거합니다.
				description: dto.description ?? FALLBACK_DESCRIPTION,
				method: readConfigString(config, 'method'),
				url: readConfigString(config, 'url'),
				modelId,
				modelName: modelId ? (modelNames.get(modelId) ?? modelId) : undefined,
				status: 'idle',
				technicalMode,
			},
		}
	})
}

export const createWorkflowCanvasEdge = (edge: WorkflowEdgeDto, id: string): WorkflowEdgeType => ({
	id,
	source: edge.source,
	target: edge.target,
	type: 'animated',
	data: { conditionType: edge.conditionType ?? null },
	style: { stroke: EDGE_COLOR, strokeWidth: 2 },
	markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
})

export const toWorkflowCanvasEdges = (edges: WorkflowEdgeDto[]): WorkflowEdgeType[] =>
	edges.map((edge, index) => createWorkflowCanvasEdge(edge, `${edge.source}-${edge.target}-${index}`))

export const toWorkflowEdgeDtos = (edges: WorkflowEdgeType[]): WorkflowEdgeDto[] =>
	edges.map(edge => ({
		source: edge.source,
		target: edge.target,
		conditionType: edge.data?.conditionType ?? null,
	}))
