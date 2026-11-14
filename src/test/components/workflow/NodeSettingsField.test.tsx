import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NodeSettingsField from '@/components/workflow/settings/NodeSettingsField'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import type { NodeReferenceSource } from '@/types/nodeReference'

/**
 * 설정 칸의 `{{` 입력 자동완성을 칸 하나로 확인한다. 후보 계산과 버튼 피커는 `NodeReferencePicker.test.tsx`가 맡는다.
 * userEvent에서 `{`는 특수 키 표기라 글자 `{` 하나를 `{{`로 입력한다(`{{{{` = `{{`).
 */

const references: NodeReferenceSource = {
	groups: [
		{
			nodeId: 'http',
			label: '상태 확인',
			entryTitle: 'HTTP 요청 보내기',
			status: 'ready',
			options: [
				{ path: 'status', title: '상태 코드', expression: '{{nodes.http.output.status}}' },
				{ path: 'body.name', title: '본문 › 이름', expression: '{{nodes.http.output.body.name}}' },
			],
		},
	],
	context: {
		ancestorIds: new Set(['http']),
		targets: new Map([
			['http', { label: '상태 확인', event: 'http.request', paths: [{ path: 'status', title: '상태 코드' }] }],
		]),
	},
}

const textField: NodeCatalogInputField = { key: 'text', title: '메시지', type: 'text', path: 'config.text' }

const Harness = ({ field, initialValue }: { field: NodeCatalogInputField; initialValue?: unknown }) => {
	const [value, setValue] = useState(initialValue)
	return <NodeSettingsField field={field} value={value} references={references} onChange={setValue} />
}

const renderField = (field: NodeCatalogInputField = textField, initialValue?: unknown) => {
	render(<Harness field={field} initialValue={initialValue} />)
	return screen.getByLabelText(new RegExp(`^${field.title}`), { selector: 'input, textarea' }) as
		| HTMLInputElement
		| HTMLTextAreaElement
}

const queryList = () => screen.queryByRole('listbox', { name: '메시지 참조 후보' })

describe('NodeSettingsField 참조 자동완성', () => {
	it('{{를 입력하면 후보 목록을 열고 질의로 걸러 첫 후보를 강조한다', async () => {
		const user = userEvent.setup()
		const textarea = renderField()

		await user.type(textarea, '안녕 {{{{sta')

		const listbox = screen.getByRole('listbox', { name: '메시지 참조 후보' })
		const options = within(listbox).getAllByRole('option')
		expect(options.map(option => option.textContent)).toEqual(['상태 코드status'])
		expect(textarea).toHaveAttribute('aria-autocomplete', 'list')
		expect(textarea).toHaveAttribute('aria-activedescendant', options[0].id)
		expect(screen.getByText('출력 참조 후보 1개')).toBeInTheDocument()
	})

	it('Enter로 고르면 {{질의를 참조식으로 바꾸고 커서를 참조식 뒤에 둔다', async () => {
		const user = userEvent.setup()
		const textarea = renderField()

		await user.type(textarea, '안녕 {{{{sta{Enter}')

		const expected = '안녕 {{nodes.http.output.status}}'
		expect(textarea).toHaveValue(expected)
		await waitFor(() => expect(textarea.selectionStart).toBe(expected.length))
		expect(queryList()).not.toBeInTheDocument()
	})

	it('방향키로 강조를 옮기고 Tab으로도 고른다', async () => {
		const user = userEvent.setup()
		const textarea = renderField()

		await user.type(textarea, '{{{{')
		expect(within(queryList() as HTMLElement).getAllByRole('option')).toHaveLength(2)
		await user.keyboard('{ArrowDown}{Tab}')

		expect(textarea).toHaveValue('{{nodes.http.output.body.name}}')
		expect(textarea).toHaveFocus()
	})

	it('마우스로 후보를 눌러도 넣는다', async () => {
		const user = userEvent.setup()
		const textarea = renderField()

		await user.type(textarea, '{{{{')
		await user.click(screen.getByRole('option', { name: /본문 › 이름/ }))

		expect(textarea).toHaveValue('{{nodes.http.output.body.name}}')
	})

	it('커서 바로 뒤의 }}는 고른 참조식으로 함께 바꾼다', async () => {
		const user = userEvent.setup()
		const textarea = renderField(textField, '{{}} 끝')
		await user.click(textarea)
		textarea.setSelectionRange(2, 2)
		// React onSelect는 keyup 등에서 선택 변경을 감지하므로, 직접 옮긴 커서를 알리려고 keyup을 보낸다.
		fireEvent.keyUp(textarea, { key: 'ArrowLeft' })

		await user.keyboard('{Enter}')

		expect(textarea).toHaveValue('{{nodes.http.output.status}} 끝')
	})

	it('닫힌 참조식 안쪽에서 고르면 그 참조식 전체를 바꿔 뒤 경로가 남지 않는다', async () => {
		const user = userEvent.setup()
		const textarea = renderField(textField, '{{nodes.http.output.body}} 끝')
		await user.click(textarea)
		textarea.setSelectionRange('{{nodes.http'.length, '{{nodes.http'.length)
		fireEvent.keyUp(textarea, { key: 'ArrowLeft' })

		await user.keyboard('{Enter}')

		expect(textarea).toHaveValue('{{nodes.http.output.status}} 끝')
	})

	it('한글 조합 중 Enter는 후보를 고르지 않는다', async () => {
		const user = userEvent.setup()
		const textarea = renderField()
		await user.type(textarea, '{{{{')

		fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true })

		expect(textarea).toHaveValue('{{')
		expect(queryList()).toBeInTheDocument()
	})

	it('Escape는 목록만 닫아 바깥으로 전달하지 않고, 같은 {{에서는 다시 열지 않는다', async () => {
		const user = userEvent.setup()
		const onOuterKeyDown = vi.fn()
		render(
			<div onKeyDown={event => onOuterKeyDown(event.key)}>
				<Harness field={textField} />
			</div>
		)
		const textarea = screen.getByLabelText(/^메시지/, { selector: 'textarea' })

		await user.type(textarea, '{{{{s')
		await user.keyboard('{Escape}')
		expect(queryList()).not.toBeInTheDocument()
		expect(onOuterKeyDown).not.toHaveBeenCalledWith('Escape')

		await user.type(textarea, 't')
		expect(queryList()).not.toBeInTheDocument()

		await user.type(textarea, ' {{{{')
		expect(queryList()).toBeInTheDocument()
	})

	it('한글 조합 중 Escape도 목록만 닫고 바깥으로 전달하지 않는다', async () => {
		const user = userEvent.setup()
		const onOuterKeyDown = vi.fn()
		render(
			<div onKeyDown={event => onOuterKeyDown(event.key)}>
				<Harness field={textField} />
			</div>
		)
		const textarea = screen.getByLabelText(/^메시지/, { selector: 'textarea' })
		await user.type(textarea, '{{{{')

		fireEvent.keyDown(textarea, { key: 'Escape', isComposing: true })

		expect(queryList()).not.toBeInTheDocument()
		expect(onOuterKeyDown).not.toHaveBeenCalledWith('Escape')
	})

	it('다른 곳으로 포커스를 옮기면 목록을 닫는다', async () => {
		const user = userEvent.setup()
		render(
			<>
				<Harness field={textField} />
				<button type='button'>다른 버튼</button>
			</>
		)
		const textarea = screen.getByLabelText(/^메시지/, { selector: 'textarea' })
		await user.type(textarea, '{{{{')
		expect(queryList()).toBeInTheDocument()

		// Tab은 목록이 열려 있으면 후보를 고르는 키라, 다른 요소를 눌러 포커스를 옮긴다.
		await user.click(screen.getByRole('button', { name: '다른 버튼' }))

		expect(screen.getByRole('button', { name: '다른 버튼' })).toHaveFocus()
		expect(queryList()).not.toBeInTheDocument()
	})

	describe('강조 행 스크롤', () => {
		// jsdom에는 scrollIntoView가 없어 이 묶음에서만 만들어 두고 지운다.
		const scrollIntoView = vi.fn()
		afterEach(() => {
			scrollIntoView.mockReset()
			Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
		})

		it('방향키로 강조를 옮기면 강조 행을 보이게 스크롤한다', async () => {
			Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true })
			const user = userEvent.setup()
			const textarea = renderField()
			await user.type(textarea, '{{{{')

			await user.keyboard('{ArrowDown}')

			const secondOption = screen.getByRole('option', { name: /본문 › 이름/ })
			expect(textarea).toHaveAttribute('aria-activedescendant', secondOption.id)
			expect(scrollIntoView.mock.contexts.at(-1)).toBe(secondOption)
		})
	})

	it.each([
		[
			'참조식 방식 정수 칸',
			{ key: 'count', title: '메시지', type: 'integer', path: 'config.count' } as NodeCatalogInputField,
			'{{nodes.http.output.status}}',
		],
		[
			'json 칸',
			{ key: 'payload', title: '메시지', type: 'json', path: 'config.payload' } as NodeCatalogInputField,
			undefined,
		],
		[
			'문자열 목록 칸',
			{ key: 'tags', title: '메시지', type: 'string', list: true, path: 'config.tags' } as NodeCatalogInputField,
			undefined,
		],
	])('%s에서도 {{를 입력하면 자동완성을 연다', async (_, field, initialValue) => {
		const user = userEvent.setup()
		const input = renderField(field, initialValue)

		await user.type(input, ' {{{{')

		expect(queryList()).toBeInTheDocument()
		expect(input).toHaveAttribute('aria-autocomplete', 'list')
	})

	it('맞는 후보가 없으면 안내를 보여 준다', async () => {
		const user = userEvent.setup()
		const textarea = renderField()

		await user.type(textarea, '{{{{zzz')

		expect(screen.getByText(/입력한 내용과 맞는 출력이 없어요/)).toBeInTheDocument()
		expect(queryList()).not.toBeInTheDocument()
	})

	it.each([
		['참조식을 쓸 수 없는 칸', { ...textField, ref: false }],
		['값 방식 정수 칸', { key: 'count', title: '메시지', type: 'integer', path: 'config.count' } as NodeCatalogInputField],
	])('%s에서는 {{를 입력해도 자동완성을 열지 않는다', async (_, field) => {
		const user = userEvent.setup()
		const input = renderField(field)

		await user.type(input, '{{{{')

		expect(queryList()).not.toBeInTheDocument()
		expect(input).not.toHaveAttribute('aria-autocomplete')
	})
})
