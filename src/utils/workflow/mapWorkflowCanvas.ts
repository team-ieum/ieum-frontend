import { MarkerType } from '@xyflow/react'
import { getWorkflowNodeMeta } from '@/constants/workflow/workflowNode'
import type { ProviderInfo } from '@/types/credential'
import type { WorkflowEdgeType, WorkflowNodeStatus, WorkflowNodeType, WorkflowTechnicalDetail } from '@/types/workflow'
import type { NodeExecutionStatus } from '@/types/workflowExecution'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'

const EDGE_COLOR = '#6d5ce7'
const FALLBACK_DESCRIPTION = '설명 정보가 아직 없어요'

const readConfigString = (config: Record<string, unknown>, key: string) => {
	const value = config[key]
	return typeof value === 'string' && value.trim() ? value : undefined
}

const readConfigScalar = (config: Record<string, unknown>, key: string) => {
	const value = config[key]
	if (typeof value === 'string') return value.trim() || undefined
	if (typeof value === 'number' && Number.isFinite(value)) return String(value)
	if (typeof value === 'boolean') return String(value)
	return undefined
}

const TRIGGER_TYPE_LABELS: Record<string, string> = {
	MANUAL: '수동 실행',
	SCHEDULE: '예약 실행',
	WEBHOOK: '웹훅',
}

const CONDITION_OPERATOR_LABELS: Record<string, string> = {
	equals: '같음',
}

const formatKnownValue = (value: string, labels: Record<string, string>) =>
	labels[value] ? `${labels[value]} (${value})` : value

const createDetail = (
	config: Record<string, unknown>,
	key: string,
	label: string,
	format?: (value: string) => string
): WorkflowTechnicalDetail | undefined => {
	const value = readConfigScalar(config, key)
	if (!value) return undefined
	return { label, value: format?.(value) ?? value }
}

export const toWorkflowTechnicalDetails = (nodeType: string, config: Record<string, unknown>): WorkflowTechnicalDetail[] => {
	const details: Array<WorkflowTechnicalDetail | undefined> = []

	if (nodeType === 'TRIGGER') {
		details.push(createDetail(config, 'triggerType', '실행 방식', value => formatKnownValue(value, TRIGGER_TYPE_LABELS)))
	}

	if (nodeType === 'HTTP') {
		details.push(createDetail(config, 'method', 'Method'), createDetail(config, 'url', 'URL'))
	}

	if (nodeType === 'CONDITION') {
		details.push(createDetail(config, 'operator', '비교 방식', value => formatKnownValue(value, CONDITION_OPERATOR_LABELS)))
	}

	if (nodeType === 'AI') {
		details.push(createDetail(config, 'llmProvider', '제공자'), createDetail(config, 'model', '모델 ID'))
	}

	return details.filter((detail): detail is WorkflowTechnicalDetail => detail !== undefined)
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
				technicalDetails: toWorkflowTechnicalDetails(dto.type, config),
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
