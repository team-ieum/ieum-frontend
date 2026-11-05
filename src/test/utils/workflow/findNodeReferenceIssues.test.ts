import { describe, expect, it } from 'vitest'
import type { NodeReferenceContext, NodeReferenceTarget } from '@/types/nodeReference'
import type { WorkflowNodeDto } from '@/types/workflowList'
import {
	findNodeReferenceIssues,
	findNodesReferencingMissingOutputs,
	getNodeReferenceIssueMessage,
} from '@/utils/workflow/findNodeReferenceIssues'
import { parseNodeReferences } from '@/utils/workflow/nodeReference'

const summaryTarget: NodeReferenceTarget = {
	label: '요약',
	paths: [
		{ path: 'summary', title: '요약' },
		{ path: 'items', title: '항목' },
		{ path: 'items.0.title', title: '항목 › 첫 항목 › 제목' },
		{ path: 'fields', title: '필드', isOpenEnded: true },
	],
}

const context: NodeReferenceContext = {
	ancestorIds: new Set(['ai', 'trigger']),
	targets: new Map<string, NodeReferenceTarget>([
		['ai', summaryTarget],
		['trigger', { label: '수동 실행', paths: null }],
		['after', { label: '뒤 노드', paths: [] }],
	]),
}

const issuesOf = (text: string) => findNodeReferenceIssues(parseNodeReferences(text), context)

describe('findNodeReferenceIssues', () => {
	it.each([
		'{{nodes.ai.output.summary}}',
		'{{nodes.ai.output.items.3.title}}',
		'{{nodes.ai.output.items}}',
		'{{nodes.ai.output.fields.anything.deep}}',
		'{{nodes.trigger.output.body.whatever}}',
	])('알려진 경로·다른 인덱스·dynamic 하위·동적 출력 노드 경로는 문제가 없다: %s', text => {
		expect(issuesOf(text)).toEqual([])
	})

	it('없는 노드, 앞에 연결되지 않은 노드, 없는 출력 경로를 구분한다', () => {
		expect(issuesOf('{{nodes.ghost.output.x}} {{nodes.after.output.x}} {{nodes.ai.output.title}}')).toEqual([
			{ kind: 'missingNode', nodeId: 'ghost', path: 'x' },
			{ kind: 'notAncestor', nodeId: 'after', path: 'x', nodeLabel: '뒤 노드' },
			{ kind: 'missingPath', nodeId: 'ai', path: 'title', nodeLabel: '요약' },
		])
	})

	it('문제마다 사용자에게 보여 줄 문구를 만든다', () => {
		expect(issuesOf('{{nodes.ghost.output.x}}').map(getNodeReferenceIssueMessage)).toEqual(['없는 노드(ghost)를 가리켜요.'])
		expect(issuesOf('{{nodes.ai.output.title}}').map(getNodeReferenceIssueMessage)).toEqual([
			"'요약' 노드에 없는 출력(title)을 가리켜요.",
		])
	})
})

describe('findNodesReferencingMissingOutputs', () => {
	const node = (id: string, config: Record<string, unknown>): WorkflowNodeDto => ({
		id,
		type: 'ACTION',
		event: 'test',
		label: `${id} 라벨`,
		config,
	})

	it('지금 노드 출력에 없는 경로를 참조하는 다른 노드만 돌려준다', () => {
		const nodes = [
			node('ai', {}),
			node('ok', { text: '{{nodes.ai.output.summary}}' }),
			node('broken', { tools: [{ config: { to: '{{nodes.ai.output.renamed}}' } }] }),
			node('other', { text: '{{nodes.x.output.renamed}}' }),
		]

		expect(findNodesReferencingMissingOutputs('ai', summaryTarget.paths, nodes).map(item => item.id)).toEqual(['broken'])
	})

	it('출력 경로를 알 수 없는 노드면 빈 목록이다', () => {
		expect(findNodesReferencingMissingOutputs('trigger', null, [node('a', { t: '{{nodes.trigger.output.z}}' })])).toEqual([])
	})
})
