import type { ComponentProps } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import IntegrationDisconnectModal from '@/components/integration/IntegrationDisconnectModal'

type ModalProps = ComponentProps<typeof IntegrationDisconnectModal>

const EMPTY_NOTICE = '이 연결을 쓰는 워크플로우는 없어요.'

const modalView = (props: Partial<ModalProps>) => {
	const resource = {
		isLoading: !props.affectedNotice,
		isRefetching: false,
		isLoadingError: false,
		isRefetchError: false,
		retry: vi.fn(),
	}
	return (
		<>
			<button type='button'>모달 밖 버튼</button>
			<IntegrationDisconnectModal
				provider='NOTION'
				serviceName='Notion'
				resource={resource}
				canConfirm={!!props.affectedNotice}
				isSubmitting={false}
				onCancel={vi.fn()}
				onConfirm={vi.fn()}
				{...props}
			/>
		</>
	)
}

const renderModal = (props: Partial<ModalProps> = {}) => render(modalView(props))

const getDialog = () => within(screen.getByRole('alertdialog', { name: '연결 해제' }))

describe('IntegrationDisconnectModal', () => {
	it.each<[ModalProps['provider'], string, string]>([
		[
			'GITHUB',
			'GitHub',
			'연결을 해제해도 GitHub 앱은 설치된 채로 남아요. GitHub 설정 > Applications에서 따로 삭제할 수 있어요.',
		],
		['NOTION', 'Notion', 'Notion에도 이음의 접근 권한을 취소해 달라고 요청해요.'],
	])('%s 해제 전에 공급자별 안내를 표시한다', (provider, serviceName, notice) => {
		renderModal({ provider, serviceName, affectedNotice: EMPTY_NOTICE })

		const dialog = screen.getByRole('alertdialog', { name: '연결 해제' })
		expect(dialog).toHaveAccessibleDescription(expect.stringContaining(`${serviceName} 연결을 해제할까요?`))
		expect(dialog).toHaveAccessibleDescription(expect.stringContaining(notice))
	})

	it('영향 조회가 끝나기 전에는 해제를 확인할 수 없고 취소에 포커스한다', async () => {
		renderModal()

		const dialog = getDialog()
		expect(dialog.getByRole('region', { name: '연동 해제 안내', busy: true })).toBeVisible()
		expect(dialog.getByRole('status', { name: '영향받는 워크플로우 불러오는 중' })).toBeVisible()
		expect(dialog.queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()
		await waitFor(() => expect(dialog.getByRole('button', { name: '취소' })).toHaveFocus())
	})

	it.each(['취소', '닫기'])('영향 조회가 실패하면 다시 조회하거나 %s 버튼으로 확인창을 닫을 수 있다', async closeLabel => {
		const user = userEvent.setup()
		const onRetry = vi.fn()
		const onCancel = vi.fn()
		const onConfirm = vi.fn()
		renderModal({
			resource: { isLoading: false, isRefetching: false, isLoadingError: true, isRefetchError: false, retry: onRetry },
			onCancel,
			onConfirm,
		})

		const dialog = getDialog()
		expect(dialog.getByRole('alert')).toBeInTheDocument()
		expect(dialog.queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()
		await user.click(dialog.getByRole('button', { name: '다시 조회' }))
		await user.click(dialog.getByRole('button', { name: closeLabel }))

		expect(onRetry).toHaveBeenCalledOnce()
		expect(onCancel).toHaveBeenCalledOnce()
		expect(onConfirm).not.toHaveBeenCalled()
	})

	it('연동을 쓰는 워크플로우가 없으면 간단한 확인 메시지를 표시하고 해제를 요청할 수 있다', async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		renderModal({ affectedNotice: EMPTY_NOTICE, onConfirm })

		const dialog = getDialog()
		expect(dialog.getByText(EMPTY_NOTICE, { exact: false })).toBeVisible()
		expect(dialog.queryByRole('list')).not.toBeInTheDocument()
		expect(onConfirm).not.toHaveBeenCalled()
		await user.click(dialog.getByRole('button', { name: '연결 해제' }))

		expect(onConfirm).toHaveBeenCalledOnce()
	})

	it('키보드로 해제를 제출하면 확인 버튼에 포커스가 남고 응답을 기다리는 동안 재제출이나 취소를 막는다', async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		const onCancel = vi.fn()
		const props = { affectedNotice: EMPTY_NOTICE, onConfirm, onCancel }
		const { rerender } = renderModal(props)

		const dialog = getDialog()
		const cancel = dialog.getByRole('button', { name: '취소' })
		const confirm = dialog.getByRole('button', { name: '연결 해제' })
		await waitFor(() => expect(cancel).toHaveFocus())
		await user.tab()
		expect(confirm).toHaveFocus()
		await user.keyboard('{Enter}')
		expect(onConfirm).toHaveBeenCalledOnce()

		rerender(modalView({ ...props, isSubmitting: true }))
		expect(dialog.getByRole('button', { name: '해제 중…', busy: true })).toHaveFocus()
		expect(confirm).toHaveAttribute('aria-disabled', 'true')
		// 제출 뒤 영향 목록을 다시 조회하면 최신 목록 검증이 끝날 때까지 canConfirm이 false가 된다.
		rerender(modalView({ ...props, isSubmitting: true, canConfirm: false }))
		expect(confirm).toHaveFocus()
		await user.keyboard('{Enter}[Space]')
		await user.click(confirm)
		await user.tab({ shift: true })
		expect(cancel).toHaveFocus()
		await user.keyboard('{Enter}')
		await user.click(dialog.getByRole('button', { name: '닫기' }))
		await user.keyboard('{Escape}')

		expect(onConfirm).toHaveBeenCalledOnce()
		expect(onCancel).not.toHaveBeenCalled()
	})

	it('다른 확인창에서 시작한 해제가 진행 중이면 확인만 막고 취소는 허용한다', async () => {
		const user = userEvent.setup()
		const onCancel = vi.fn()
		const onConfirm = vi.fn()
		renderModal({ affectedNotice: EMPTY_NOTICE, isConfirmDisabled: true, onCancel, onConfirm })

		const dialog = getDialog()
		expect(dialog.getByRole('status')).toHaveTextContent('연결을 해제하고 있어요.')
		const confirm = dialog.getByRole('button', { name: '연결 해제' })
		expect(confirm).toHaveAttribute('aria-disabled', 'true')
		await user.click(confirm)
		await user.click(dialog.getByRole('button', { name: '취소' }))

		expect(onConfirm).not.toHaveBeenCalled()
		expect(onCancel).toHaveBeenCalledOnce()
	})

	it('Tab과 Shift+Tab 포커스를 모달 안에서 순환시키고 Escape로 취소한다', async () => {
		const user = userEvent.setup()
		const onCancel = vi.fn()
		const onConfirm = vi.fn()
		renderModal({ affectedNotice: EMPTY_NOTICE, onCancel, onConfirm })

		const dialog = getDialog()
		const cancel = dialog.getByRole('button', { name: '취소' })
		const confirm = dialog.getByRole('button', { name: '연결 해제' })
		await waitFor(() => expect(cancel).toHaveFocus())
		await user.tab()
		expect(confirm).toHaveFocus()
		await user.tab()
		expect(dialog.getByRole('button', { name: '닫기' })).toHaveFocus()
		await user.tab({ shift: true })
		expect(confirm).toHaveFocus()
		const onOutsideKeyDown = vi.fn()
		document.addEventListener('keydown', onOutsideKeyDown)
		try {
			await user.keyboard('{Escape}')
			expect(onOutsideKeyDown).not.toHaveBeenCalled()
		} finally {
			document.removeEventListener('keydown', onOutsideKeyDown)
		}
		expect(onCancel).toHaveBeenCalledOnce()
		expect(onConfirm).not.toHaveBeenCalled()
	})

	it('안내 문구를 클릭한 뒤에도 Escape로 취소할 수 있고 해제 요청 중에는 취소를 막는다', async () => {
		const user = userEvent.setup()
		const onCancel = vi.fn()
		const props = { affectedNotice: EMPTY_NOTICE, onCancel }
		const { rerender } = renderModal(props)
		const dialog = getDialog()
		await waitFor(() => expect(dialog.getByRole('button', { name: '취소' })).toHaveFocus())
		await user.click(dialog.getByText(EMPTY_NOTICE, { exact: false }))
		expect(document.body).toHaveFocus()
		await user.keyboard('{Escape}')
		expect(onCancel).toHaveBeenCalledOnce()

		rerender(modalView({ ...props, isSubmitting: true }))
		await user.keyboard('{Escape}')
		expect(onCancel).toHaveBeenCalledOnce()

		rerender(modalView(props))
		await user.keyboard('{Escape}')
		expect(onCancel).toHaveBeenCalledTimes(2)
	})

	it('해제가 실패하면 오류를 안내하고 다시 확인할 수 있다', async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		const deleteError = '연동을 해제하지 못했습니다. 다시 시도해주세요.'
		renderModal({ affectedNotice: EMPTY_NOTICE, deleteError, onConfirm })

		const dialog = getDialog()
		const error = dialog.getByRole('alert')
		expect(error).toHaveTextContent(deleteError)
		expect(error).toHaveProperty('tabIndex', 0)
		await user.click(dialog.getByRole('button', { name: '연결 해제' }))

		expect(onConfirm).toHaveBeenCalledOnce()
	})
})
