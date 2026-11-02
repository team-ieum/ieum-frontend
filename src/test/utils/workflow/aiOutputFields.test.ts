import { describe, expect, it } from 'vitest'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import {
	clearAiOutputFields,
	countDescriptionLength,
	findAiOutputFieldsField,
	getAiOutputFieldLabels,
	hasAiOutputFields,
	readAiOutputFieldRows,
	toAiOutputFieldsValue,
	validateAiOutputFields,
} from '@/utils/workflow/aiOutputFields'

const createAiNode = (config: Record<string, unknown>): WorkflowNodeDto => ({
	id: 'ai-1',
	type: 'AI',
	event: 'ai.reasoning',
	label: 'AI',
	config: { agentType: 'simple', prompt: '분류해줘', ...config },
})

const getKeyError = (key: unknown) => validateAiOutputFields([{ key, type: 'text' }]).rowErrors[0].key

describe('aiOutputFields', () => {
	describe('칸 찾기', () => {
		it('outputsFrom이 가리키는 object 목록 칸을 출력 칸으로 찾는다', () => {
			const reasoning = nodeCatalogEntriesFixture.find(entry => entry.id === 'ai.reasoning')!
			expect(findAiOutputFieldsField(reasoning)).toMatchObject({ key: 'outputFields', path: 'config.outputFields' })
		})

		it('outputsFrom이 없거나 object 목록이 아닌 칸을 가리키면 찾지 않는다', () => {
			const agent = nodeCatalogEntriesFixture.find(entry => entry.id === 'ai.agent')!
			expect(findAiOutputFieldsField(agent)).toBeUndefined()
			const dictEntry = {
				...agent,
				outputsFrom: 'config.mappings',
				inputFields: [{ key: 'mappings', title: '매핑', type: 'dict', path: 'config.mappings' }],
			} satisfies NodeCatalogEntry
			expect(findAiOutputFieldsField(dictEntry)).toBeUndefined()
		})

		it('children 제목·선택지를 쓰고 없으면 기본 문구를 쓴다', () => {
			const field: NodeCatalogInputField = {
				key: 'outputFields',
				title: '출력 칸',
				type: 'object',
				list: true,
				path: 'config.outputFields',
			}
			expect(getAiOutputFieldLabels(field)).toMatchObject({ key: '이름', type: '타입', description: '설명' })
			expect(getAiOutputFieldLabels(field).typeChoices.map(choice => choice.id)).toEqual(['text', 'number', 'boolean'])
			const withChildren = { ...field, children: [{ key: 'key', title: '칸 이름', type: 'string' as const }] }
			expect(getAiOutputFieldLabels(withChildren).key).toBe('칸 이름')
		})
	})

	describe('읽기·쓰기', () => {
		it('값이 없으면 빈 목록, 목록이 아니면 편집할 수 없는 값으로 읽는다', () => {
			expect(readAiOutputFieldRows(undefined)).toEqual([])
			expect(readAiOutputFieldRows('urgent')).toBeUndefined()
			expect(readAiOutputFieldRows([{ key: 'urgent', type: 'boolean' }, 'oops'])).toEqual([
				{ key: 'urgent', type: 'boolean', description: '' },
				{ key: '', type: '', description: '' },
			])
		})

		it('행이 없으면 undefined로 바꿔 칸 키를 지우게 한다', () => {
			expect(toAiOutputFieldsValue([])).toBeUndefined()
		})

		it('원소에는 key·type·description만 담고 비운 type·설명은 키를 뺀다', () => {
			expect(
				toAiOutputFieldsValue([
					{ key: 'summary', type: 'text', description: '' },
					{ key: 'score', type: '', description: '1~5점' },
				])
			).toEqual([
				{ key: 'summary', type: 'text' },
				{ key: 'score', description: '1~5점' },
			])
		})

		it('출력 칸 값이 남아 있는지 보고 지울 때 다른 config 키는 남긴다', () => {
			expect(hasAiOutputFields(createAiNode({}))).toBe(false)
			expect(hasAiOutputFields(createAiNode({ outputFields: [] }))).toBe(false)
			expect(hasAiOutputFields(createAiNode({ outputFields: 'urgent' }))).toBe(true)
			const node = createAiNode({ outputFields: [{ key: 'urgent', type: 'boolean' }] })
			expect(hasAiOutputFields(node)).toBe(true)
			expect(clearAiOutputFields(node).config).toEqual({ agentType: 'simple', prompt: '분류해줘' })
		})
	})

	describe('검사', () => {
		it('값이 없거나 빈 목록이면 오류가 없다', () => {
			expect(validateAiOutputFields(undefined)).toEqual({ rowErrors: [], issueCount: 0 })
			expect(validateAiOutputFields([])).toEqual({ listError: undefined, rowErrors: [], issueCount: 0 })
		})

		it('올바른 칸은 오류가 없다', () => {
			const result = validateAiOutputFields([
				{ key: 'urgent', type: 'boolean', description: '급한 문의인지' },
				{ key: '_score2', type: 'number' },
				{ key: 'summary', type: 'text', description: null },
			])
			expect(result.issueCount).toBe(0)
			expect(result.rowErrors).toEqual([{}, {}, {}])
		})

		it('이름은 영문이나 밑줄로 시작하는 64자 이하 영문·숫자·밑줄이어야 한다', () => {
			expect(getKeyError(`a${'b'.repeat(63)}`)).toBeUndefined()
			expect(getKeyError(`a${'b'.repeat(64)}`)).toMatch(/64자 이하/)
			for (const key of ['1st', 'user.name', '요약', 'has space', 'dash-key']) expect(getKeyError(key)).toMatch(/영문/)
			expect(getKeyError('')).toBe('이름을 입력하세요.')
			expect(getKeyError(undefined)).toBe('이름을 입력하세요.')
		})

		it('겹치는 이름은 두 번째 칸부터 오류다', () => {
			const { rowErrors, issueCount } = validateAiOutputFields([
				{ key: 'urgent', type: 'boolean' },
				{ key: 'urgent', type: 'text' },
			])
			expect(rowErrors[0].key).toBeUndefined()
			expect(rowErrors[1].key).toMatch(/이미 있어요/)
			expect(issueCount).toBe(1)
		})

		it('예약어와 민감정보 이름은 대소문자와 상관없이 쓸 수 없다', () => {
			expect(getKeyError('success')).toMatch(/예약된 이름/)
			expect(getKeyError('error')).toMatch(/예약된 이름/)
			for (const key of ['myApiKey', 'TOKEN_count', 'user_password', 'Authorization', 'client_secret', 'api_key2']) {
				expect(getKeyError(key)).toMatch(/민감정보/)
			}
		})

		it('type은 text·number·boolean 중 하나여야 한다', () => {
			const { rowErrors } = validateAiOutputFields([{ key: 'a', type: 'string' }, { key: 'b' }])
			expect(rowErrors.map(errors => errors.type)).toEqual(['타입을 고르세요.', '타입을 고르세요.'])
		})

		it('설명은 코드 포인트 기준 500자까지 쓸 수 있다', () => {
			const emoji = '😀'.repeat(500)
			expect(emoji.length).toBe(1000)
			expect(countDescriptionLength(emoji)).toBe(500)
			expect(validateAiOutputFields([{ key: 'a', type: 'text', description: emoji }]).rowErrors[0]).toEqual({})
			expect(
				validateAiOutputFields([{ key: 'a', type: 'text', description: `${emoji}!` }]).rowErrors[0].description
			).toMatch(/500자/)
		})

		it('문자열이 아닌 설명은 길이가 아니라 형식 오류로 알린다', () => {
			expect(validateAiOutputFields([{ key: 'a', type: 'text', description: 3 }]).rowErrors[0].description).toBe(
				'설명은 글자로만 쓸 수 있어요. 다시 입력해 주세요.'
			)
		})

		it('객체가 아닌 원소와 알 수 없는 속성을 실제로 저장될 모양과 함께 알린다', () => {
			const { rowErrors } = validateAiOutputFields(['urgent', { key: 'a', type: 'text', required: true }])
			expect(rowErrors[0].item).toMatch(/빈 칸으로 저장/)
			expect(rowErrors[1].item).toMatch(/required.*출력 칸을 하나라도 고치면 사라져요/)
		})

		it('20개를 넘거나 목록이 아니면 목록 오류다', () => {
			const fields = Array.from({ length: 21 }, (_, index) => ({ key: `field_${index}`, type: 'text' }))
			expect(validateAiOutputFields(fields.slice(0, 20)).listError).toBeUndefined()
			expect(validateAiOutputFields(fields)).toMatchObject({
				listError: expect.stringMatching(/1개를 지워/),
				issueCount: 1,
			})
			expect(validateAiOutputFields({ key: 'a' })).toMatchObject({ listError: expect.any(String), issueCount: 1 })
		})
	})
})
