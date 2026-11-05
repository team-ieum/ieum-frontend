import { describe, expect, it } from 'vitest'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import { getAncestorNodeIds } from '@/utils/workflow/getAncestorNodeIds'

const nodes = ['a', 'b', 'c', 'd', 'e', 'lonely'].map(
	(id): WorkflowNodeDto => ({ id, type: 'ACTION', event: 'test', label: id, config: {} })
)
const edge = (source: string, target: string): WorkflowEdgeDto => ({ source, target })

describe('getAncestorNodeIds', () => {
	it('엣지를 거슬러 닿는 노드만 가까운 순서로 돌려준다', () => {
		const edges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'd'), edge('d', 'e')]

		expect(getAncestorNodeIds('d', nodes, edges)).toEqual(['c', 'b', 'a'])
		expect(getAncestorNodeIds('a', nodes, edges)).toEqual([])
	})

	it('갈래가 합쳐지면 거리가 같은 노드는 문서 순서로 두고 한 번만 넣는다', () => {
		const edges = [edge('c', 'e'), edge('b', 'e'), edge('a', 'b'), edge('a', 'c')]

		expect(getAncestorNodeIds('e', nodes, edges)).toEqual(['b', 'c', 'a'])
	})

	it('순환이 있어도 끝나고 자기 자신은 넣지 않는다', () => {
		const edges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')]

		expect(getAncestorNodeIds('b', nodes, edges)).toEqual(['a', 'c'])
	})

	it('문서에 없는 노드를 가리키는 엣지는 무시한다', () => {
		expect(getAncestorNodeIds('b', nodes, [edge('ghost', 'b'), edge('a', 'b')])).toEqual(['a'])
	})
})
