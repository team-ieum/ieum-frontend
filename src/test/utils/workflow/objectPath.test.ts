import { describe, expect, it } from 'vitest'
import { deleteAtPath, getAtPath, setAtPath } from '@/utils/workflow/objectPath'

describe('objectPath', () => {
	it('숫자 세그먼트를 배열 인덱스로 읽고 중간 값이 없으면 undefined를 돌려준다', () => {
		const source = { config: { tools: [{ name: 'a', config: { id: 'x' } }] } }

		expect(getAtPath(source, 'config.tools.0.config.id')).toBe('x')
		expect(getAtPath(source, 'config.missing.key')).toBeUndefined()
		expect(getAtPath(source, 'config.tools.0.config.id.deeper')).toBeUndefined()
	})

	it('원본을 바꾸지 않고 path 위의 객체만 복사해 값을 쓴다', () => {
		const untouched = { keep: true }
		const source = { config: { brand: 'slack', other: untouched } }

		const next = setAtPath(source, 'config.channel', 'C1')

		expect(next).toEqual({ config: { brand: 'slack', other: { keep: true }, channel: 'C1' } })
		expect(source.config).toEqual({ brand: 'slack', other: { keep: true } })
		expect(next.config.other).toBe(untouched)
	})

	it('없는 중간 값은 다음 세그먼트가 숫자면 배열, 아니면 객체로 만든다', () => {
		expect(setAtPath({}, 'config.tools.0.config.id', 'x')).toEqual({ config: { tools: [{ config: { id: 'x' } }] } })
	})

	it('키를 지운 새 객체를 돌려주고 없는 path면 원본을 그대로 돌려준다', () => {
		const source = { config: { channel: 'C1', text: 'hi' } }

		expect(deleteAtPath(source, 'config.channel')).toEqual({ config: { text: 'hi' } })
		expect(source.config.channel).toBe('C1')
		expect(deleteAtPath(source, 'config.missing')).toBe(source)
		expect(deleteAtPath(source, 'nothing.here')).toBe(source)
	})

	it('배열 원소를 지우면 뒤 원소를 앞으로 당긴다', () => {
		expect(deleteAtPath({ list: ['a', 'b', 'c'] }, 'list.1')).toEqual({ list: ['a', 'c'] })
	})
})
