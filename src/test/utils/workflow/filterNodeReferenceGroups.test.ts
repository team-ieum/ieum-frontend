import { describe, expect, it } from 'vitest'
import type { NodeReferenceGroup } from '@/types/nodeReference'
import { filterNodeReferenceGroups } from '@/utils/workflow/filterNodeReferenceGroups'

const groups: NodeReferenceGroup[] = [
	{
		nodeId: 'http',
		label: '상태 확인',
		status: 'ready',
		options: [
			{ path: 'status', title: '상태 코드', expression: '{{nodes.http.output.status}}' },
			{ path: 'body.name', title: '본문 › 이름', expression: '{{nodes.http.output.body.name}}' },
		],
	},
	{ nodeId: 'trigger', label: '수동 실행', status: 'needsSample', options: [] },
]

const optionPaths = (query: string) =>
	filterNodeReferenceGroups(groups, query).flatMap(group => group.options.map(option => `${group.nodeId}:${option.path}`))

describe('filterNodeReferenceGroups', () => {
	it('질의가 비면 상태 안내 그룹까지 그대로 둔다', () => {
		expect(filterNodeReferenceGroups(groups, '  ')).toBe(groups)
	})

	it.each([
		['참조식 일부', 'nodes.http.output.st', ['http:status']],
		['경로', 'NAME', ['http:body.name']],
		['출력 이름', '상태 코드', ['http:status']],
		['노드 라벨', '상태 확인', ['http:status', 'http:body.name']],
	])('%s로 대소문자 없이 거르고 맞는 후보가 없는 그룹은 뺀다', (_, query, expected) => {
		expect(optionPaths(query)).toEqual(expected)
	})

	it('맞는 후보가 없으면 빈 목록이다', () => {
		expect(filterNodeReferenceGroups(groups, 'zzz')).toEqual([])
	})
})
