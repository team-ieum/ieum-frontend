import type { ComponentProps } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import IntegrationDisconnectModal from '@/components/integration/IntegrationDisconnectModal'

type ModalProps = ComponentProps<typeof IntegrationDisconnectModal>

const renderModal = (props: Partial<ModalProps> = {}) =>
	render(
		<>
			<button type='button'>모달 밖 버튼</button>
			<IntegrationDisconnectModal
				provider='NOTION'
				serviceName='Notion'
				loadFailed={false}
				isSubmitting={false}
				onRetry={vi.fn()}
				onCancel={vi.fn()}
				onConfirm={vi.fn()}
				{...props}
			/>
		</>
	)

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
		expect(dialog.queryByRole('button', { name: '연동 해제' })).not.toBeInTheDocument()
		await waitFor(() => expect(dialog.getByRole('button', { name: '취소' })).toHaveFocus())
	})

	it('영향 조회가 실패하면 해제 확인 없이 다시 조회하거나 취소할 수 있다', async () => {
		const user = userEvent.setup()
		const onRetry = vi.fn()
		const onCancel = vi.fn()
		const onConfirm = vi.fn()
		renderModal({ loadFailed: true, onRetry, onCancel, onConfirm })

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
					{ id: 'schedule', name: '일정 기록', isActive: true, willFailAutomatically: true },
					{ id: 'manual', name: '주문 확인', isActive: true, willFailAutomatically: false },
					{ id: 'paused', name: '휴무 알림', isActive: false, willFailAutomatically: false },
				],
			},
		})

		const dialog = getDialog()
		const rows = dialog.getAllByRole('listitem')
		expect(rows).toHaveLength(3)
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

	it('해제를 제출하는 동안에는 확인을 다시 누를 수 없다', async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		renderModal({ impact: { workflows: [], automaticCount: 0 }, isSubmitting: true, onConfirm })

		const confirm = getDialog().getByRole('button', { name: /연동 해제|해제 중/ })
		expect(confirm).toBeDisabled()
		await user.click(confirm)

		expect(onConfirm).not.toHaveBeenCalled()
	})

	it('다른 확인창에서 시작한 해제가 진행 중이면 확인만 막고 취소는 허용한다', async () => {
		const user = userEvent.setup()
		const onCancel = vi.fn()
		const onConfirm = vi.fn()
		renderModal({ impact: { workflows: [], automaticCount: 0 }, confirmDisabled: true, onCancel, onConfirm })

		const dialog = getDialog()
		expect(dialog.getByRole('status')).toHaveTextContent('이 연결의 해제 요청이 진행 중입니다.')
		const confirm = dialog.getByRole('button', { name: '연동 해제' })
		expect(confirm).toBeDisabled()
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
		await user.keyboard('{Escape}')

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
