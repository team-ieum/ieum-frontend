import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'

/**
 * 엣지를 거슬러 올라가 닿는 노드(조상) id를 가까운 순서로 돌려준다. 거리가 같으면 편집 문서의 노드 순서를 따른다.
 * 순환이 있어도 자기 자신은 넣지 않고, 문서에 없는 노드를 가리키는 엣지는 무시한다.
 */
export const getAncestorNodeIds = (nodeId: string, nodes: WorkflowNodeDto[], edges: WorkflowEdgeDto[]): string[] => {
	const sourcesByTarget = new Map<string, string[]>()
	edges.forEach(edge => sourcesByTarget.set(edge.target, [...(sourcesByTarget.get(edge.target) ?? []), edge.source]))

	const distances = new Map<string, number>()
	let frontier = [nodeId]
	for (let distance = 1; frontier.length > 0; distance += 1) {
		const next: string[] = []
		frontier.forEach(id =>
			(sourcesByTarget.get(id) ?? []).forEach(source => {
				if (source === nodeId || distances.has(source)) return
				distances.set(source, distance)
				next.push(source)
			})
		)
		frontier = next
	}

	const documentOrder = new Map(nodes.map((node, index) => [node.id, index]))
	return [...distances.keys()]
		.filter(id => documentOrder.has(id))
		.sort(
			(a, b) =>
				(distances.get(a) ?? 0) - (distances.get(b) ?? 0) || (documentOrder.get(a) ?? 0) - (documentOrder.get(b) ?? 0)
		)
}
