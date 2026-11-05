import type { NodeOutputPath, NodeReference, NodeReferenceContext, NodeReferenceIssue } from '@/types/nodeReference'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { collectNodeReferences } from '@/utils/workflow/nodeReference'

// 목록은 첫 항목 경로(`items.0`)만 알고 있어, 다른 인덱스도 같은 칸으로 본다.
const normalizeIndexes = (path: string) =>
	path
		.split('.')
		.map(segment => (/^\d+$/.test(segment) ? '0' : segment))
		.join('.')

/**
 * 경로가 노드 출력에 있는지. 알려진 경로 자체, 그 상위 경로(object·목록 전체), `dynamic` 칸 아래 경로를 허용한다.
 */
const isOutputPathKnown = (path: string, paths: NodeOutputPath[]) => {
	const normalized = normalizeIndexes(path)
	return paths.some(
		known =>
			known.path === normalized ||
			known.path.startsWith(`${normalized}.`) ||
			(known.isOpenEnded === true && normalized.startsWith(`${known.path}.`))
	)
}

/**
 * 참조식마다 가리키는 노드와 경로를 편집 문서 기준으로 검사해 문제만 돌려준다.
 * 출력 경로를 알 수 없는 노드(동적 출력·카탈로그 밖)는 노드가 있는지와 앞에 연결됐는지만 본다.
 */
export const findNodeReferenceIssues = (
	references: NodeReference[],
	{ ancestorIds, targets }: NodeReferenceContext
): NodeReferenceIssue[] =>
	references.flatMap((reference): NodeReferenceIssue[] => {
		const { nodeId, path } = reference
		const target = targets.get(nodeId)
		if (!target) return [{ kind: 'missingNode', nodeId, path }]
		if (!ancestorIds.has(nodeId)) return [{ kind: 'notAncestor', nodeId, path, nodeLabel: target.label }]
		if (target.paths && !isOutputPathKnown(path, target.paths)) {
			return [{ kind: 'missingPath', nodeId, path, nodeLabel: target.label }]
		}
		return []
	})

/** 칸 아래나 요약에 보여 줄 문제 문구. */
export const getNodeReferenceIssueMessage = (issue: NodeReferenceIssue) => {
	if (issue.kind === 'missingNode') return `없는 노드(${issue.nodeId})를 가리켜요.`
	if (issue.kind === 'notAncestor') return `'${issue.nodeLabel}' 노드는 이 노드 앞에 연결된 노드가 아니에요.`
	return `'${issue.nodeLabel}' 노드에 없는 출력(${issue.path})을 가리켜요.`
}

/**
 * `nodeId` 노드 출력에 없는 경로를 참조하는 다른 노드 목록. 출력 칸 이름을 바꾸거나 지웠을 때 그 노드 패널에서 알린다.
 * 출력 경로를 알 수 없으면(`paths`가 `null`) 빈 목록이다.
 */
export const findNodesReferencingMissingOutputs = (
	nodeId: string,
	paths: NodeOutputPath[] | null,
	nodes: WorkflowNodeDto[]
): WorkflowNodeDto[] => {
	if (!paths) return []
	return nodes.filter(
		node =>
			node.id !== nodeId &&
			collectNodeReferences(node.config).some(
				reference => reference.nodeId === nodeId && !isOutputPathKnown(reference.path, paths)
			)
	)
}
