import { describe, expect, it } from 'vitest'
import { addOptionListItem, readOptionListIds, removeOptionListItem } from '@/utils/workflow/nodeOptionList'

describe('readOptionListIds', () => {
	it.each([
		['배열', ['IMPORTANT', ' Label_1 ', '', 'IMPORTANT'], ['IMPORTANT', 'Label_1']],
		// 실행(agent)은 쉼표 구분 문자열도 라벨 목록으로 받는다.
		['쉼표 구분 문자열', 'INBOX, Label_1,', ['INBOX', 'Label_1']],
		['문자열이 아닌 원소', [12, 'Label_1'], ['12', 'Label_1']],
		['비운 값', undefined, []],
		['null', null, []],
	])('%s을 중복·빈 항목 없이 id 목록으로 읽는다', (_label, value, expected) => {
		expect(readOptionListIds(value)).toEqual(expected)
	})
})

describe('addOptionListItem', () => {
	it('고른 항목을 끝에 더하고 이름을 남긴다', () => {
		expect(addOptionListItem(['IMPORTANT'], { IMPORTANT: '중요' }, { id: 'Label_12', name: '고객' })).toEqual({
			value: ['IMPORTANT', 'Label_12'],
			names: { IMPORTANT: '중요', Label_12: '고객' },
		})
	})

	it('이미 고른 항목은 다시 더하지 않고, 목록에 없는 id의 이름은 버린다', () => {
		expect(
			addOptionListItem(['IMPORTANT'], { IMPORTANT: '중요', gone: '지운 라벨' }, { id: 'IMPORTANT', name: '중요' })
		).toEqual({ value: ['IMPORTANT'], names: { IMPORTANT: '중요' } })
	})

	it('이름이 빈 항목은 이름 없이 더한다', () => {
		expect(addOptionListItem([], undefined, { id: 'Label_3', name: '' })).toEqual({ value: ['Label_3'], names: undefined })
	})
})

describe('removeOptionListItem', () => {
	it('뺀 항목의 이름도 지운다', () => {
		expect(removeOptionListItem(['IMPORTANT', 'Label_12'], { IMPORTANT: '중요', Label_12: '고객' }, 'IMPORTANT')).toEqual({
			value: ['Label_12'],
			names: { Label_12: '고객' },
		})
	})

	it('마지막 항목을 빼면 값과 이름을 모두 지운다', () => {
		expect(removeOptionListItem(['IMPORTANT'], { IMPORTANT: '중요' }, 'IMPORTANT')).toEqual({
			value: undefined,
			names: undefined,
		})
	})
})
