import { describe, expect, it } from 'vitest'
import {
	collectNodeReferences,
	findReferenceQuery,
	formatNodeReference,
	insertTextAtSelection,
	isReferenceableNodeId,
	isReferenceablePathSegment,
	parseNodeReferences,
} from '@/utils/workflow/nodeReference'

describe('nodeReference', () => {
	it('노드 id와 경로로 참조식을 만든다', () => {
		expect(formatNodeReference('node-1', 'items.0.summary')).toBe('{{nodes.node-1.output.items.0.summary}}')
	})

	it('텍스트에 섞인 참조식을 위치와 함께 모두 찾고 중괄호 안 공백을 허용한다', () => {
		const text = '안녕 {{nodes.a.output.name}}님, {{ nodes.b-2.output.items.0.title }} 확인'

		expect(parseNodeReferences(text)).toEqual([
			{ nodeId: 'a', path: 'name', start: 3, end: 26 },
			{ nodeId: 'b-2', path: 'items.0.title', start: 29, end: 65 },
		])
	})

	it('nodes.로 시작하지 않는 템플릿과 output 경로가 없는 식은 참조식으로 보지 않는다', () => {
		expect(parseNodeReferences('{{trigger.body}} {{nodes.a}} {{nodes.a.input.x}}')).toEqual([])
	})

	it('명세의 NODE_ID·FIELD_PATH 문자 규칙을 확인한다', () => {
		expect(isReferenceableNodeId('3d9a7c1e-5b2f-4e8a')).toBe(true)
		expect(isReferenceableNodeId('node_1')).toBe(false)
		expect(isReferenceablePathSegment('due_date2')).toBe(true)
		expect(isReferenceablePathSegment('due-date')).toBe(false)
		expect(isReferenceablePathSegment('제목')).toBe(false)
	})

	it('config 안의 배열·객체 문자열에서 참조식을 모두 모은다', () => {
		const config = {
			text: '{{nodes.a.output.x}}',
			tools: [{ name: 'gmail', config: { to: '{{nodes.b.output.email}}' } }],
			mappings: { id: '{{nodes.c.output.id}}', fixed: 1 },
		}

		expect(collectNodeReferences(config).map(reference => `${reference.nodeId}.${reference.path}`)).toEqual([
			'a.x',
			'b.email',
			'c.id',
		])
	})

	it('선택 영역을 넣을 글자로 바꾸고 커서를 넣은 글자 뒤에 둔다', () => {
		expect(insertTextAtSelection('안녕하세요', { start: 2, end: 4 }, '{{x}}')).toEqual({ text: '안녕{{x}}요', caret: 7 })
		expect(insertTextAtSelection('abc', { start: 10, end: 12 }, 'd')).toEqual({ text: 'abcd', caret: 4 })
	})

	describe('findReferenceQuery', () => {
		it.each([
			['안녕 {{', 5, { start: 3, end: 5, query: '' }],
			['안녕 {{nodes.a', 12, { start: 3, end: 12, query: 'nodes.a' }],
			['{{a}} {{sum', 11, { start: 6, end: 11, query: 'sum' }],
		])('커서 앞이 {{로 시작하는 질의면 범위와 질의를 돌려준다: %s', (text, caret, expected) => {
			expect(findReferenceQuery(text, caret)).toEqual(expected)
		})

		it('커서 바로 뒤의 }}를 바꿀 범위에 넣는다', () => {
			expect(findReferenceQuery('{{st}} 끝', 4)).toEqual({ start: 0, end: 6, query: 'st' })
		})

		it('커서가 닫힌 참조식 안쪽이면 닫는 }}까지 바꿀 범위에 넣는다', () => {
			expect(findReferenceQuery('{{nodes.a.output.x}} 끝', 9)).toEqual({ start: 0, end: 20, query: 'nodes.a' })
		})

		it.each([
			['닫는 괄호가 없는 뒤 글자', '{{hello', 2, 2],
			['공백 뒤의 }}', '{{ab cd}}', 4, 4],
			['뒤에 이어지는 다음 참조식', '{{a{{b}}', 3, 3],
		])('%s는 바꿀 범위에 넣지 않는다', (_, text, caret, end) => {
			expect(findReferenceQuery(text, caret)?.end).toBe(end)
		})

		it('앞 참조식을 고칠 때 공백 뒤의 다음 참조식까지 범위를 넓히지 않는다', () => {
			expect(findReferenceQuery('{{a.b}} {{c}}', 3)?.end).toBe(7)
		})

		it.each([
			['공백으로 끝난 질의', '{{nodes a', 9],
			['닫힌 참조식 뒤', '{{nodes.a.output.x}}', 20],
			['중괄호가 하나뿐', '{a', 2],
		])('%s에서는 질의가 없다', (_, text, caret) => {
			expect(findReferenceQuery(text, caret)).toBeNull()
		})
	})
})
