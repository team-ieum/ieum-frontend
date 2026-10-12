import type { ReactNode } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Modal from '@/components/common/Modal'
import { useModalStore } from '@/stores/useModalStore'

// jsdom에서는 exit 애니메이션이 끝나지 않아 언마운트 시점의 focus 복원을 확인할 수 없다.
vi.mock('framer-motion', async () => {
	const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
	return {
		...actual,
		AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
	}
})

const renderWithOpener = (open: () => void) => {
	render(
		<>
			<button type='button' onClick={open}>
				모달 열기
			</button>
			<Modal />
		</>
	)
	return screen.getByRole('button', { name: '모달 열기' })
}

const openAlert = () => useModalStore.getState().open('저장 실패', '네트워크 상태를 확인해 주세요.')

describe('전역 Modal 접근성', () => {
	it('알림 모달을 제목과 설명이 연결된 modal dialog로 제공하고 확인 버튼에 focus한다', async () => {
		const user = userEvent.setup()
		await user.click(renderWithOpener(openAlert))

		const dialog = screen.getByRole('dialog', { name: '저장 실패' })
		expect(dialog).toHaveAttribute('aria-modal', 'true')
		expect(dialog).toHaveAccessibleDescription('네트워크 상태를 확인해 주세요.')
		await waitFor(() => expect(screen.getByRole('button', { name: '확인' })).toHaveFocus())
	})

	it('확인형 모달은 alertdialog이며 danger 변형은 취소 버튼에서 focus를 시작한다', async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		await user.click(
			renderWithOpener(() =>
				useModalStore.getState().openConfirm({
					title: '연결 해제',
					message: '연결을 해제할까요?',
					confirmText: '해제',
					variant: 'danger',
					onConfirm,
				})
			)
		)

		expect(screen.getByRole('alertdialog', { name: '연결 해제' })).toHaveAccessibleDescription('연결을 해제할까요?')
		await waitFor(() => expect(screen.getByRole('button', { name: '취소' })).toHaveFocus())

		await user.keyboard('{Enter}')

		expect(onConfirm).not.toHaveBeenCalled()
		expect(useModalStore.getState().isOpen).toBe(false)
	})

	it('Tab 이동을 모달 안에서 순환시킨다', async () => {
		const user = userEvent.setup()
		await user.click(renderWithOpener(openAlert))
		const confirmButton = screen.getByRole('button', { name: '확인' })
		await waitFor(() => expect(confirmButton).toHaveFocus())

		await user.tab()
		expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus()

		await user.tab()
		expect(confirmButton).toHaveFocus()

		await user.tab({ shift: true })
		expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus()
	})

	it('Escape로 닫고 모달을 연 요소로 focus를 되돌린다', async () => {
		const user = userEvent.setup()
		const opener = renderWithOpener(openAlert)
		await user.click(opener)
		await waitFor(() => expect(screen.getByRole('button', { name: '확인' })).toHaveFocus())

		await user.keyboard('{Escape}')

		expect(useModalStore.getState().isOpen).toBe(false)
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(opener).toHaveFocus()
	})

	it('제목이 없는 알림은 기본 접근 이름을 사용한다', async () => {
		render(<Modal />)

		act(() => useModalStore.getState().open('', '처리되었습니다.'))

		expect(screen.getByRole('dialog', { name: '알림' })).toHaveAccessibleDescription('처리되었습니다.')
	})
})
