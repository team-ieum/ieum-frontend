import { useQueries } from '@tanstack/react-query'
import { nodeTestSampleQueryOptions } from '@/hooks/workflow/queries/nodeTestSampleQueryOptions'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { NodeReferenceGroup, NodeReferenceSource, NodeReferenceTarget } from '@/types/nodeReference'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import { getAncestorNodeIds } from '@/utils/workflow/getAncestorNodeIds'
import { getNodeOutputPaths, hasKnownOutputPaths } from '@/utils/workflow/getNodeOutputPaths'
import { formatNodeReference, isReferenceableNodeId } from '@/utils/workflow/nodeReference'

type UseNodeReferenceCandidatesOptions = {
	/** 비어 있으면(저장 전 문서) 테스트 샘플을 조회하지 않는다. */
	workflowId: string
	node: WorkflowNodeDto
	nodes: WorkflowNodeDto[]
	edges: WorkflowEdgeDto[]
	entries: NodeCatalogEntry[]
}

type UseNodeReferenceCandidatesResult = NodeReferenceSource & {
	/** 지금 노드 출력의 검사 정보. 아래 노드의 깨진 참조를 찾을 때 쓴다. */
	ownTarget: NodeReferenceTarget
}

/**
 * 설정 중인 노드가 참조할 수 있는 조상 노드 출력 후보와 참조 검사 문맥을 만든다.
 * 동적 출력 조상(`manual.run`, `webhook.catch`)만 최신 테스트 샘플을 조회해 경로를 만든다.
 * 참조식 규칙에 맞지 않는 id의 노드는 참조할 수 없어 후보에서 뺀다.
 */
export const useNodeReferenceCandidates = ({
	workflowId,
	node,
	nodes,
	edges,
	entries,
}: UseNodeReferenceCandidatesOptions): UseNodeReferenceCandidatesResult => {
	const entryByEvent = new Map(entries.map(entry => [entry.id, entry]))
	const nodeById = new Map(nodes.map(item => [item.id, item]))
	const ancestorIds = getAncestorNodeIds(node.id, nodes, edges)
	const ancestors = ancestorIds.flatMap(id => nodeById.get(id) ?? []).filter(item => isReferenceableNodeId(item.id))
	const sampledAncestors = ancestors.filter(item => entryByEvent.get(item.event)?.outputDynamic)

	const sampleQueries = useQueries({
		queries: sampledAncestors.map(item => ({
			...nodeTestSampleQueryOptions(workflowId, item.id),
			enabled: Boolean(workflowId),
		})),
	})

	const groups = ancestors.map((ancestor): NodeReferenceGroup => {
		const entry = entryByEvent.get(ancestor.event)
		const base = { nodeId: ancestor.id, label: ancestor.label, entryTitle: entry?.title }
		const toOptions = (sampleOutput?: Record<string, unknown>) =>
			getNodeOutputPaths({ node: ancestor, entry, sampleOutput }).map(path => ({
				...path,
				expression: formatNodeReference(ancestor.id, path.path),
			}))

		if (!entry?.outputDynamic) return { ...base, status: 'ready', options: toOptions() }
		const query = sampleQueries[sampledAncestors.indexOf(ancestor)]
		if (query?.isLoading) return { ...base, status: 'loading', options: [] }
		const sample = query?.data
		return sample?.status === 'SUCCESS' && sample.output
			? { ...base, status: 'ready', options: toOptions(sample.output) }
			: { ...base, status: 'needsSample', options: [] }
	})

	const toTarget = (item: WorkflowNodeDto): NodeReferenceTarget => {
		const entry = entryByEvent.get(item.event)
		return {
			label: item.label,
			event: item.event,
			paths: hasKnownOutputPaths(entry) ? getNodeOutputPaths({ node: item, entry }) : null,
		}
	}

	return {
		groups,
		context: {
			ancestorIds: new Set(ancestorIds),
			targets: new Map(nodes.map(item => [item.id, toTarget(item)])),
		},
		ownTarget: toTarget(node),
	}
}
