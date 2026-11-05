import { describe, expect, it } from 'vitest'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { getNodeOutputPaths, hasKnownOutputPaths } from '@/utils/workflow/getNodeOutputPaths'

const entry = (overrides: Partial<NodeCatalogEntry>): NodeCatalogEntry => ({
	id: 'test.entry',
	kind: 'action',
	provider: 'ieum',
	app: 'test',
	appTitle: '테스트',
	nodeType: 'ACTION',
	title: '테스트 작업',
	fixed: { type: 'ACTION', event: 'test.entry', config: {} },
	inputFields: [],
	outputFields: [],
	...overrides,
})

const node = (config: Record<string, unknown> = {}): WorkflowNodeDto => ({
	id: 'node-1',
	type: 'ACTION',
	event: 'test.entry',
	label: '노드',
	config,
})

const pathsOf = (...args: Parameters<typeof getNodeOutputPaths>) => getNodeOutputPaths(...args).map(item => item.path)

describe('getNodeOutputPaths', () => {
	it('스칼라는 key, object는 children 경로, 목록은 key와 첫 항목 경로를 만든다', () => {
		const target = entry({
			outputFields: [
				{ key: 'status', title: '상태', type: 'integer' },
				{
					key: 'user',
					title: '사용자',
					type: 'object',
					children: [
						{ key: 'name', title: '이름', type: 'string' },
						{
							key: 'address',
							title: '주소',
							type: 'object',
							children: [{ key: 'city', title: '도시', type: 'string' }],
						},
					],
				},
				{
					key: 'items',
					title: '항목',
					type: 'object',
					list: true,
					children: [{ key: 'summary', title: '요약', type: 'text' }],
				},
				{ key: 'tags', title: '태그', type: 'string', list: true },
			],
		})

		expect(getNodeOutputPaths({ node: node(), entry: target })).toEqual([
			{ path: 'status', title: '상태' },
			{ path: 'user.name', title: '사용자 › 이름' },
			{ path: 'user.address.city', title: '사용자 › 주소 › 도시' },
			{ path: 'items', title: '항목' },
			{ path: 'items.0.summary', title: '항목 › 첫 항목 › 요약' },
			{ path: 'tags', title: '태그' },
			{ path: 'tags.0', title: '태그 › 첫 항목' },
		])
	})

	it('dynamic 칸은 key까지만 만들고 아래 경로를 열어 둔다', () => {
		const target = entry({ outputFields: [{ key: 'fields', title: '필드', type: 'object', dynamic: true }] })

		expect(getNodeOutputPaths({ node: node(), entry: target })).toEqual([
			{ path: 'fields', title: '필드', isOpenEnded: true },
		])
	})

	it('참조식 규칙에 어긋난 key는 뺀다', () => {
		const target = entry({
			outputFields: [
				{ key: 'due-date', title: '마감', type: 'string' },
				{ key: 'ok', title: 'OK', type: 'boolean' },
			],
		})

		expect(pathsOf({ node: node(), entry: target })).toEqual(['ok'])
	})

	describe('outputsFrom', () => {
		const reasoning = entry({
			outputsFrom: 'config.outputFields',
			outputFields: [{ key: 'output', title: '결과', type: 'text' }],
		})

		it('config.outputFields에 선언한 칸이 있으면 정적 출력 대신 그 칸만 중복 없이 쓴다', () => {
			const declared = node({
				outputFields: [{ key: 'summary', type: 'text' }, { key: 'score' }, { key: '' }, { key: 'summary' }],
			})

			expect(pathsOf({ node: declared, entry: reasoning })).toEqual(['summary', 'score'])
		})

		it('config.outputFields가 없거나 비면 정적 출력(output)을 쓴다', () => {
			expect(pathsOf({ node: node(), entry: reasoning })).toEqual(['output'])
			expect(pathsOf({ node: node({ outputFields: [] }), entry: reasoning })).toEqual(['output'])
		})

		it('config.mappings는 키가 출력 칸이고 비면 정적 출력을 쓴다', () => {
			const map = entry({ outputsFrom: 'config.mappings', outputFields: [] })

			expect(pathsOf({ node: node({ mappings: { id: '{{nodes.a.output.id}}', title: 'x' } }), entry: map })).toEqual([
				'id',
				'title',
			])
			expect(pathsOf({ node: node({ mappings: {} }), entry: map })).toEqual([])
		})

		it('모르는 outputsFrom 값은 정적 출력을 쓴다', () => {
			const unknown = entry({ outputsFrom: 'config.other', outputFields: [{ key: 'id', title: 'ID', type: 'string' }] })

			expect(pathsOf({ node: node({ other: { a: 1 } }), entry: unknown })).toEqual(['id'])
		})
	})

	describe('동적 출력 노드', () => {
		const manual = entry({ id: 'manual.run', outputDynamic: true })

		it('테스트 샘플 출력을 같은 규칙으로 펼친다', () => {
			const sampleOutput = {
				body: { name: '홍길동', tags: ['a'] },
				items: [{ title: '첫째' }],
				'bad-key': 1,
				count: 2,
			}

			expect(pathsOf({ node: node(), entry: manual, sampleOutput })).toEqual([
				'body.name',
				'body.tags',
				'body.tags.0',
				'items',
				'items.0.title',
				'count',
			])
		})

		it('샘플이 없으면 경로가 없고 출력 경로를 미리 알 수 없는 노드로 본다', () => {
			expect(pathsOf({ node: node(), entry: manual })).toEqual([])
			expect(hasKnownOutputPaths(manual)).toBe(false)
			expect(hasKnownOutputPaths(undefined)).toBe(false)
			expect(hasKnownOutputPaths(entry({}))).toBe(true)
		})

		it('깊은 샘플은 정해진 깊이에서 멈춘다', () => {
			const sampleOutput = { a: { b: { c: { d: { e: 1 } } } } }

			expect(pathsOf({ node: node(), entry: manual, sampleOutput })).toEqual(['a.b.c.d'])
		})
	})

	it('카탈로그 밖 노드는 경로가 없다', () => {
		expect(getNodeOutputPaths({ node: node() })).toEqual([])
	})
})
