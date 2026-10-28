import { MarkerType } from '@xyflow/react'
import { isIntegrationBrand } from '@/constants/integration/brandConfig'
import { WORKFLOW_EDGE_COLOR } from '@/constants/workflow/workflowEdge'
import { WORKFLOW_SERVICE_META } from '@/constants/workflow/workflowList'
import { getWorkflowNodeMeta } from '@/constants/workflow/workflowNode'
import { APP_EVENT_TRIGGERS } from '@/constants/workflow/workflowTrigger'
import type { ProviderInfo } from '@/types/credential'
import type { WorkflowEdgeType, WorkflowNodeStatus, WorkflowNodeType, WorkflowTechnicalDetail } from '@/types/workflow'
import type { NodeExecutionStatus } from '@/types/workflowExecution'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import { describeCron } from '@/utils/workflow/describeCron'

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

const TRIGGER_EVENT_LABELS: Record<string, string> = {
	'manual.run': '수동 실행',
	'webhook.catch': '웹훅',
	'schedule.every': '스케줄',
	...Object.fromEntries(Object.values(APP_EVENT_TRIGGERS).map(trigger => [trigger.event, trigger.label])),
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

const toTriggerDetails = (event: string, config: Record<string, unknown>): WorkflowTechnicalDetail[] => {
	const details: WorkflowTechnicalDetail[] = []
	// 라벨을 모르는 트리거는 같은 원문이 두 번 보이지 않게 실행 방식 행을 뺀다.
	const label = TRIGGER_EVENT_LABELS[event]
	if (label) details.push({ label: '실행 방식', value: label })
	details.push({ label: '이벤트', value: event })

	const cron = event === 'schedule.every' ? readConfigString(config, 'cron') : undefined
	if (cron) details.push({ label: '주기', value: describeCron(cron), title: cron })

	return details
}

/** 노드의 기술 정보 행을 만든다. 트리거는 event 기준 실행 방식과 event 원문을 보여 준다. */
export const toWorkflowTechnicalDetails = ({
	type: nodeType,
	event,
	config,
}: Pick<WorkflowNodeDto, 'type' | 'event' | 'config'>): WorkflowTechnicalDetail[] => {
	const details: Array<WorkflowTechnicalDetail | undefined> = []

	if (nodeType === 'TRIGGER') {
		details.push(...toTriggerDetails(event, config))
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
		typeof node.event === 'string' &&
		node.event.trim() !== '' &&
		typeof node.label === 'string' &&
		(node.position === undefined || hasValidPosition(node.position)) &&
		isConfig(node.config)
	)
}

export const isWorkflowEdgeDto = (value: unknown): value is WorkflowEdgeDto => {
	if (typeof value !== 'object' || value === null) return false
	const edge = value as Partial<WorkflowEdgeDto>
	return (
		(edge.id === undefined || edge.id === null || typeof edge.id === 'string') &&
		typeof edge.source === 'string' &&
		typeof edge.target === 'string'
	)
}

export const normalizeWorkflowCanvasDocument = (rawNodes: unknown[], rawEdges: unknown[]) => {
	const nodes = rawNodes.filter(isWorkflowNodeDto)
	const nodeIds = new Set(nodes.map(node => node.id))
	const edges = rawEdges.filter(
		(edge): edge is WorkflowEdgeDto => isWorkflowEdgeDto(edge) && nodeIds.has(edge.source) && nodeIds.has(edge.target)
	)

	return { nodes, edges }
}

export const toWorkflowNodeStatus = (status?: NodeExecutionStatus): WorkflowNodeStatus => {
	if (status === 'failed') return 'error'
	return status ?? 'idle'
}

/**
 * 저장 노드를 캔버스 노드로 바꾼다.
 * `catalogEvents`를 넘기면 그 안에 없는 event 노드를 카탈로그 밖 노드로 표시한다.
 * 카탈로그를 아직 받지 못했으면 넘기지 않아야 정상 노드가 미지원으로 보이지 않는다.
 */
export const toWorkflowCanvasNodes = (
	nodes: WorkflowNodeDto[],
	modelNames: ReadonlyMap<string, string>,
	technicalMode: boolean,
	catalogEvents?: ReadonlySet<string>
): WorkflowNodeType[] => {
	return nodes.map((dto, index) => {
		const meta = getWorkflowNodeMeta(dto.type)
		const config = dto.config ?? {}
		const modelId = readConfigString(config, 'model')
		const brand = dto.type === 'ACTION' && isIntegrationBrand(config.brand) ? config.brand : undefined
		const isOutsideCatalog = catalogEvents ? !catalogEvents.has(dto.event) : false
		const technicalDetails = toWorkflowTechnicalDetails({ type: dto.type, event: dto.event, config })
		// 트리거는 이벤트 행을 이미 보여 주므로 그 밖의 카탈로그 밖 노드에만 event 원문을 덧붙인다.
		if (isOutsideCatalog && dto.type !== 'TRIGGER') technicalDetails.unshift({ label: '이벤트', value: dto.event })

		return {
			id: dto.id,
			type: 'workflowNode',
			deletable: false,
			// TODO: 서버가 노드 위치를 항상 반환하면 배열 순서 기반 배치를 제거합니다.
			position: dto.position ?? { x: index * 360, y: 100 },
			data: {
				nodeType: dto.type,
				brand,
				role: meta.role,
				// brand를 아는 ACTION 노드는 "앱 작업" 대신 서비스 이름을 보여 준다.
				typeLabel: brand ? WORKFLOW_SERVICE_META[brand].name : meta.label,
				step: index + 1,
				title: dto.label,
				// TODO: 서버가 설명을 항상 반환하면 대체 문구를 제거합니다.
				description: dto.description ?? FALLBACK_DESCRIPTION,
				technicalDetails,
				modelId,
				modelName: modelId ? (modelNames.get(modelId) ?? modelId) : undefined,
				isOutsideCatalog,
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
	data: { serverId: edge.id ?? undefined, conditionType: edge.conditionType ?? null },
	style: { stroke: WORKFLOW_EDGE_COLOR, strokeWidth: 1.5 },
	markerEnd: { type: MarkerType.ArrowClosed, color: WORKFLOW_EDGE_COLOR },
})

export const toWorkflowCanvasEdges = (edges: WorkflowEdgeDto[]): WorkflowEdgeType[] =>
	edges.map((edge, index) => createWorkflowCanvasEdge(edge, edge.id ?? `${edge.source}-${edge.target}-${index}`))

// 서버 id가 있는 엣지만 id를 싣는다. 새 엣지와 레거시 엣지는 id를 생략해 서버가 채우게 한다.
export const toWorkflowEdgeDtos = (edges: WorkflowEdgeType[]): WorkflowEdgeDto[] =>
	edges.map(edge => ({
		...(edge.data?.serverId ? { id: edge.data.serverId } : {}),
		source: edge.source,
		target: edge.target,
		conditionType: edge.data?.conditionType ?? null,
	}))
