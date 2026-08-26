import type { Connection } from '@xyflow/react'
import type { WorkflowEdgeType, WorkflowNodeType } from '@/types/workflow'

type ConnectionCandidate = Pick<Connection, 'source' | 'target'>

export const isWorkflowConnectionValid = (
	connection: ConnectionCandidate,
	nodes: WorkflowNodeType[],
	edges: WorkflowEdgeType[],
	excludedEdgeId?: string | null
) => {
	const { source, target } = connection
	if (!source || !target || source === target) return false

	const sourceNode = nodes.find(node => node.id === source)
	const targetNode = nodes.find(node => node.id === target)
	if (!sourceNode || !targetNode || targetNode.data.role === 'trigger') return false

	const comparableEdges = excludedEdgeId ? edges.filter(edge => edge.id !== excludedEdgeId) : edges
	if (comparableEdges.some(edge => edge.source === source && edge.target === target)) return false

	const outgoing = new Map<string, string[]>()
	comparableEdges.forEach(edge => {
		const targets = outgoing.get(edge.source) ?? []
		targets.push(edge.target)
		outgoing.set(edge.source, targets)
	})

	const visited = new Set<string>()
	const pending = [target]

	while (pending.length > 0) {
		const current = pending.pop()!
		if (current === source) return false
		if (visited.has(current)) continue
		visited.add(current)
		pending.push(...(outgoing.get(current) ?? []))
	}

	return true
}
