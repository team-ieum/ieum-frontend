import type { ComponentProps } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import IntegrationDisconnectModal from '@/components/integration/IntegrationDisconnectModal'

type ModalProps = ComponentProps<typeof IntegrationDisconnectModal>

const modalView = (props: Partial<ModalProps>) => {
	const resource = {
		isLoading: !props.impact,
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
				canConfirm={!!props.impact}
				isSubmitting={false}
				onCancel={vi.fn()}
				onConfirm={vi.fn()}
				{...props}
			/>
		</>
	)
}

const renderModal = (props: Partial<ModalProps> = {}) => render(modalView(props))

const getDialog = (serviceName = 'Notion') => within(screen.getByRole('alertdialog', { name: `${serviceName} 연동 해제` }))

describe('IntegrationDisconnectModal', () => {
	it.each<[ModalProps['provider'], string, string]>([
		[
			'GITHUB',
			'GitHub',
			'GitHub App 설치는 별도로 남습니다. 설치까지 제거하려면 GitHub 설정 > Applications에서 직접 제거해 주세요.',
		],
		['NOTION', 'Notion', '이음에서 연결을 해제하고 Notion에도 권한 폐기를 요청합니다.'],
	])('%s 해제 전에 공급자별 안내를 표시한다', (provider, serviceName, notice) => {
		renderModal({ provider, serviceName, impact: { workflows: [], automaticCount: 0 } })

		expect(getDialog(serviceName).getByText(notice)).toBeInTheDocument()
	})

	it('영향 조회가 끝나기 전에는 해제를 확인할 수 없고 취소에 포커스한다', async () => {
		renderModal()

		const dialog = getDialog()
		expect(dialog.getByRole('region', { name: '연동 해제 안내', busy: true })).toBeVisible()
		expect(dialog.getByRole('status', { name: '영향받는 워크플로우 불러오는 중' })).toBeVisible()
		expect(dialog.queryByRole('button', { name: '연동 해제' })).not.toBeInTheDocument()
		await waitFor(() => expect(dialog.getByRole('button', { name: '취소' })).toHaveFocus())
	})

	it('영향 조회가 실패하면 해제 확인 없이 다시 조회하거나 취소할 수 있다', async () => {
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
		expect(dialog.queryByRole('button', { name: '연동 해제' })).not.toBeInTheDocument()
		await user.click(dialog.getByRole('button', { name: '다시 조회' }))
		await user.click(dialog.getByRole('button', { name: '취소' }))

		expect(onRetry).toHaveBeenCalledOnce()
		expect(onCancel).toHaveBeenCalledOnce()
		expect(onConfirm).not.toHaveBeenCalled()
	})

	it('영향을 받는 워크플로우별 활성 상태와 자동 실행 위험을 표시한다', () => {
		renderModal({
			impact: {
				automaticCount: 1,
				workflows: [
					{ id: 'schedule', name: '일정 기록', isActive: true, isAutomaticExecutionAtRisk: true },
					{ id: 'manual', name: '주문 확인', isActive: true, isAutomaticExecutionAtRisk: false },
					{ id: 'paused', name: '휴무 알림', isActive: false, isAutomaticExecutionAtRisk: false },
				],
			},
		})

		const dialog = getDialog()
		const rows = dialog.getAllByRole('listitem')
		expect(rows).toHaveLength(3)
		expect(dialog.queryByRole('button', { name: /외 \d+개/ })).not.toBeInTheDocument()
		expect(rows[0]).toHaveTextContent('일정 기록')
		expect(within(rows[0]).getByText('활성')).toBeInTheDocument()
		expect(within(rows[0]).getByText('자동 실행 실패')).toBeInTheDocument()
		expect(rows[1]).toHaveTextContent('주문 확인')
		expect(within(rows[1]).getByText('활성')).toBeInTheDocument()
		expect(within(rows[1]).queryByText('자동 실행 실패')).not.toBeInTheDocument()
		expect(rows[2]).toHaveTextContent('휴무 알림')
		expect(within(rows[2]).getByText('비활성')).toBeInTheDocument()
		expect(within(rows[2]).queryByText('자동 실행 실패')).not.toBeInTheDocument()
	})

	it('처음 세 개만 표시하고 나머지는 펼쳐 보며 숨겨진 자동 실행의 위험도 안내한다', async () => {
		const user = userEvent.setup()
		const workflows = ['주문 접수', '재고 확인', '송장 등록', '배송 조회', '반품 접수', '정산 알림'].map(name => ({
			id: name,
			name,
			isActive: true,
			isAutomaticExecutionAtRisk: name === '정산 알림',
		}))
		renderModal({ impact: { workflows, automaticCount: 1 } })

		const dialog = getDialog()
		const list = within(dialog.getByRole('list', { name: '영향받는 워크플로우' }))
		const rows = list.getAllByRole('listitem')
		expect(rows).toHaveLength(3)
		expect(rows[0]).toHaveTextContent('주문 접수')
		expect(rows[2]).toHaveTextContent('송장 등록')
		expect(dialog.getByText(/워크플로우 6개/)).toBeVisible()
		expect(dialog.getByText(/자동 실행 중인 1개/)).toBeVisible()
		await user.click(dialog.getByRole('button', { name: /외 3개/, expanded: false }))

		const expandedRows = list.getAllByRole('listitem')
		expect(expandedRows).toHaveLength(6)
		expect(expandedRows[5]).toHaveTextContent('정산 알림')
		expect(expandedRows[5]).toHaveTextContent('자동 실행 실패')
		await user.click(dialog.getByRole('button', { name: /접기/, expanded: true }))

		expect(list.getAllByRole('listitem')).toHaveLength(3)
		expect(dialog.getByRole('button', { name: /외 3개/, expanded: false })).toBeVisible()
	})

	it('연동을 쓰는 워크플로우가 없으면 간단한 확인 메시지를 표시하고 해제를 요청할 수 있다', async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		renderModal({ impact: { workflows: [], automaticCount: 0 }, onConfirm })

		const dialog = getDialog()
		expect(dialog.getByText(/연동을 해제하시겠습니까\?/)).toBeInTheDocument()
		expect(dialog.queryByRole('list')).not.toBeInTheDocument()
		expect(onConfirm).not.toHaveBeenCalled()
		await user.click(dialog.getByRole('button', { name: '연동 해제' }))

		expect(onConfirm).toHaveBeenCalledOnce()
	})

	it('키보드로 해제를 제출하면 확인 버튼에 포커스가 남고 응답을 기다리는 동안 재제출이나 취소를 막는다', async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		const onCancel = vi.fn()
		const props = { impact: { workflows: [], automaticCount: 0 }, onConfirm, onCancel }
		const { rerender } = renderModal(props)

		const dialog = getDialog()
		const cancel = dialog.getByRole('button', { name: '취소' })
		const confirm = dialog.getByRole('button', { name: '연동 해제' })
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
		await user.tab()
		expect(cancel).toHaveFocus()
		await user.keyboard('{Enter}')
		await user.tab({ shift: true })
		expect(confirm).toHaveFocus()
		await user.keyboard('{Escape}')

		expect(onConfirm).toHaveBeenCalledOnce()
		expect(onCancel).not.toHaveBeenCalled()
	})

	it('다른 확인창에서 시작한 해제가 진행 중이면 확인만 막고 취소는 허용한다', async () => {
		const user = userEvent.setup()
		const onCancel = vi.fn()
		const onConfirm = vi.fn()
		renderModal({ impact: { workflows: [], automaticCount: 0 }, isConfirmDisabled: true, onCancel, onConfirm })

		const dialog = getDialog()
		expect(dialog.getByRole('status')).toHaveTextContent('이 연결의 해제 요청이 진행 중입니다.')
		const confirm = dialog.getByRole('button', { name: '연동 해제' })
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
		renderModal({ impact: { workflows: [], automaticCount: 0 }, onCancel, onConfirm })

		const dialog = getDialog()
		const cancel = dialog.getByRole('button', { name: '취소' })
		const confirm = dialog.getByRole('button', { name: '연동 해제' })
		await waitFor(() => expect(cancel).toHaveFocus())
		await user.tab()
		expect(confirm).toHaveFocus()
		await user.tab()
		expect(cancel).toHaveFocus()
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

	it('해제가 실패하면 오류를 안내하고 다시 확인할 수 있다', async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		const deleteError = '연동을 해제하지 못했습니다. 다시 시도해주세요.'
		renderModal({ impact: { workflows: [], automaticCount: 0 }, deleteError, onConfirm })

		const dialog = getDialog()
		const error = dialog.getByRole('alert')
		expect(error).toHaveTextContent(deleteError)
		// 긴 서버 오류는 제한된 높이 안에서 키보드로 스크롤할 수 있다.
		expect(error).toHaveProperty('tabIndex', 0)
		expect(dialog.getByRole('region', { name: '연동 해제 안내' })).not.toContainElement(error)
		await user.click(dialog.getByRole('button', { name: '연동 해제' }))

		expect(onConfirm).toHaveBeenCalledOnce()
	})
})
