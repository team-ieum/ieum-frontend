import { describe, expect, it } from 'vitest'
import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import {
	formatFieldDraft,
	getInitialFieldMode,
	getMissingRequiredFields,
	hasReferenceMode,
	isEmptyFieldValue,
	parseFieldInput,
} from '@/utils/workflow/nodeFieldValue'

const field = (overrides: Partial<NodeCatalogInputField>): NodeCatalogInputField => ({
	key: 'value',
	title: '값',
	type: 'string',
	path: 'config.value',
	...overrides,
})

describe('nodeFieldValue', () => {
	it('키 없음·null·공백 문자열·빈 배열·빈 객체만 비운 값으로 본다', () => {
		expect([undefined, null, '  ', [], {}].every(isEmptyFieldValue)).toBe(true)
		expect([0, false, 'a', ['a'], { a: 1 }].some(isEmptyFieldValue)).toBe(false)
	})

	it('문자열 칸은 같은 입력 칸에 참조식을 쓰고 그 밖의 칸만 입력 방식을 나눈다', () => {
		expect(hasReferenceMode(field({ type: 'string' }))).toBe(false)
		expect(hasReferenceMode(field({ type: 'text' }))).toBe(false)
		expect(hasReferenceMode(field({ type: 'integer' }))).toBe(true)
		expect(hasReferenceMode(field({ type: 'string', choices: [{ id: 'a', name: 'A' }] }))).toBe(true)
		expect(hasReferenceMode(field({ type: 'integer', ref: false }))).toBe(false)
		expect(hasReferenceMode(field({ type: 'object' }))).toBe(false)
	})

	it('값 전체가 참조식 하나일 때만 참조식 방식으로 연다', () => {
		expect(getInitialFieldMode(field({ type: 'integer' }), '{{nodes.a.output.count}}')).toBe('reference')
		expect(getInitialFieldMode(field({ type: 'integer' }), 3)).toBe('fixed')
		expect(getInitialFieldMode(field({ type: 'string' }), 'hi {{nodes.a.output.x}}')).toBe('fixed')
		expect(getInitialFieldMode(field({ type: 'json' }), '{"text":"{{nodes.a.output.x}}"}')).toBe('fixed')
		expect(getInitialFieldMode(field({ type: 'json' }), ' {{nodes.a.output.body}} ')).toBe('reference')
	})

	it('빈 입력은 키 삭제로, 문자열 칸은 앞뒤 공백을 그대로 저장한다', () => {
		expect(parseFieldInput(field({ type: 'string' }), '  ', 'fixed')).toEqual({ ok: true, value: undefined })
		expect(parseFieldInput(field({ type: 'text' }), ' 안녕 ', 'fixed')).toEqual({ ok: true, value: ' 안녕 ' })
		expect(parseFieldInput(field({ type: 'integer' }), '', 'fixed')).toEqual({ ok: true, value: undefined })
	})

	it('integer는 JSON 숫자로 저장하고 정수가 아니면 거절한다', () => {
		expect(parseFieldInput(field({ type: 'integer' }), ' 42 ', 'fixed')).toEqual({ ok: true, value: 42 })
		expect(parseFieldInput(field({ type: 'integer' }), '4.2', 'fixed')).toMatchObject({ ok: false })
		expect(parseFieldInput(field({ type: 'number' }), '4.2', 'fixed')).toEqual({ ok: true, value: 4.2 })
	})

	it('json은 파싱을 확인한 JSON 문자열로 저장한다', () => {
		expect(parseFieldInput(field({ type: 'json' }), '{"a":1}', 'fixed')).toEqual({ ok: true, value: '{"a":1}' })
		expect(parseFieldInput(field({ type: 'json' }), '{a:1}', 'fixed')).toMatchObject({ ok: false })
	})

	it('cron은 5칸만 받고 datetime-local 입력은 초를 붙여 저장한다', () => {
		expect(parseFieldInput(field({ type: 'cron' }), '0  9 * * 1-5', 'fixed')).toEqual({ ok: true, value: '0 9 * * 1-5' })
		expect(parseFieldInput(field({ type: 'cron' }), '0 9 * *', 'fixed')).toMatchObject({ ok: false })
		expect(parseFieldInput(field({ type: 'datetime' }), '2026-10-29T09:30', 'fixed')).toEqual({
			ok: true,
			value: '2026-10-29T09:30:00',
		})
		expect(parseFieldInput(field({ type: 'datetime' }), '2026-10-29T09:30:00+09:00', 'fixed')).toEqual({
			ok: true,
			value: '2026-10-29T09:30:00+09:00',
		})
		expect(parseFieldInput(field({ type: 'datetime' }), '내일', 'fixed')).toMatchObject({ ok: false })
	})

	it('목록 칸은 한 줄에 하나씩 받아 배열로 저장한다', () => {
		expect(parseFieldInput(field({ type: 'string', list: true }), 'a@x.com\n\n b@x.com ', 'fixed')).toEqual({
			ok: true,
			value: ['a@x.com', 'b@x.com'],
		})
		expect(parseFieldInput(field({ type: 'integer', list: true }), '1\n2', 'fixed')).toEqual({ ok: true, value: [1, 2] })
		expect(formatFieldDraft(['a', 'b'])).toBe('a\nb')
	})

	it('참조식 방식은 {{가 있는 문자열만 받는다', () => {
		const integerField = field({ type: 'integer' })
		expect(parseFieldInput(integerField, '{{nodes.a.output.count}}', 'reference')).toEqual({
			ok: true,
			value: '{{nodes.a.output.count}}',
		})
		expect(parseFieldInput(integerField, '3', 'reference')).toMatchObject({ ok: false })
	})

	it('참조식을 쓸 수 없는 칸은 {{ 입력 자체를 거부한다', () => {
		expect(parseFieldInput(field({ type: 'string', ref: false }), 'a {{', 'fixed')).toEqual({
			ok: false,
			error: '이 칸에는 참조식을 쓸 수 없어요.',
			rejected: true,
		})
	})

	it('기본값이 없는 필수 칸 중 비어 있는 칸만 고르고 object 칸은 제외한다', () => {
		const entry = {
			inputFields: [
				field({ key: 'a', path: 'config.a', required: true }),
				field({ key: 'b', path: 'config.b', required: true, default: 'x' }),
				field({ key: 'c', path: 'config.c', required: true }),
				field({ key: 'd', path: 'config.d' }),
				field({ key: 'tools', path: 'config.tools', type: 'object', list: true, required: true }),
			],
		} as NodeCatalogEntry
		const node = { id: 'n', type: 'ACTION', event: 'x', label: 'x', config: { c: 'filled', tools: [] } }

		expect(getMissingRequiredFields(entry, node).map(item => item.key)).toEqual(['a'])
	})
})
