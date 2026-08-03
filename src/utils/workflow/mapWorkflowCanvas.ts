import { MarkerType, type Edge } from '@xyflow/react'
import { getWorkflowNodeMeta } from '@/constants/workflow/workflowNode'
import type { ProviderInfo } from '@/types/credential'
import type { WorkflowNodeStatus, WorkflowNodeType } from '@/types/workflow'
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

export const isWorkflowNodeDto = (value: unknown): value is WorkflowNodeDto => {
	if (typeof value !== 'object' || value === null) return false
	const node = value as Partial<WorkflowNodeDto>
	return (
		typeof node.id === 'string' &&
		typeof node.type === 'string' &&
		typeof node.label === 'string' &&
		(node.position === undefined || hasValidPosition(node.position))
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
	edges: WorkflowEdgeDto[],
	modelNames: ReadonlyMap<string, string>,
	technicalMode: boolean
): WorkflowNodeType[] => {
	const incomingNodeIds = new Set(edges.map(edge => edge.target))
	const outgoingNodeIds = new Set(edges.map(edge => edge.source))

	return nodes.map((dto, index) => {
		const meta = getWorkflowNodeMeta(dto.type)
		const config = dto.config ?? {}
		const modelId = readConfigString(config, 'model')

		return {
			id: dto.id,
			type: 'workflowNode',
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
				hasIncoming: incomingNodeIds.has(dto.id),
				hasOutgoing: outgoingNodeIds.has(dto.id),
			},
		}
	})
}

export const toWorkflowCanvasEdges = (edges: WorkflowEdgeDto[]): Edge[] =>
	edges.map((edge, index) => ({
		id: `${edge.source}-${edge.target}-${index}`,
		source: edge.source,
		target: edge.target,
		type: 'animated',
		style: { stroke: EDGE_COLOR, strokeWidth: 2 },
		markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
	}))
