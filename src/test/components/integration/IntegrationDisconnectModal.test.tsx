import type { ComponentProps } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import IntegrationDisconnectModal from '@/components/integration/IntegrationDisconnectModal'

type ModalProps = ComponentProps<typeof IntegrationDisconnectModal>

const NOTION_SERVICE = { brand: 'notion', name: 'Notion', account: '이음 워크스페이스' } as const
const GITHUB_SERVICE = { brand: 'github', name: 'GitHub', account: 'ieum-demo' } as const
const EMPTY_IMPACT = { totalCount: 0, automaticCount: 0, workflows: [] }
const EMPTY_NOTICE = '현재 이 연결을 쓰는 워크플로우는 없어요.'
const WORKFLOWS: NonNullable<ModalProps['impact']>['workflows'] = [
	{
		id: 'schedule',
		name: '주간 회의록 정리',
		statusLabel: '자동 실행 중',
		triggerLabel: '스케줄',
		automaticNotice: '해제 후에도 예약된 시간마다 실행을 시도해요.',
	},
	{ id: 'manual', name: '팀 위키 업데이트', statusLabel: '일시정지', triggerLabel: '수동', automaticNotice: null },
	{
		id: 'webhook',
		name: '배포 알림',
		statusLabel: '자동 실행 중',
		triggerLabel: '웹훅',
		automaticNotice: '해제 후에도 웹훅을 받을 때마다 실행을 시도해요.',
	},
]

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
				service={NOTION_SERVICE}
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

const getDialog = () => within(screen.getByRole('alertdialog', { name: 'Notion 연결을 해제할까요?' }))

describe('IntegrationDisconnectModal', () => {
	it.each([
		{
			provider: 'GITHUB',
			service: GITHUB_SERVICE,
			notice: 'GitHub 앱은 설치된 상태로 남아요. GitHub 설정의 Applications에서 제거할 수 있어요.',
		},
		{ provider: 'NOTION', service: NOTION_SERVICE, notice: 'Notion에도 이음의 접근 권한을 취소해 달라고 요청해요.' },
	] as const)('$provider 해제 전에 연결된 계정과 공급자별 안내를 표시한다', ({ provider, service, notice }) => {
		renderModal({ provider, service, impact: EMPTY_IMPACT })

		const dialog = screen.getByRole('alertdialog', { name: `${service.name} 연결을 해제할까요?` })
		expect(within(dialog).getByRole('heading', { name: '연결을 해제할까요?' })).toBeVisible()
		expect(within(dialog).getByText(service.account)).toBeVisible()
		expect(dialog).toHaveAccessibleDescription(expect.stringContaining(`연결된 계정 ${service.account}`))
		expect(dialog).toHaveAccessibleDescription(expect.stringContaining(notice))
		expect(dialog).toHaveAccessibleDescription(expect.stringContaining(EMPTY_NOTICE))
	})

	it('계정 정보가 없으면 빈 계정 항목을 표시하거나 읽어주지 않는다', () => {
		renderModal({ service: { brand: 'notion', name: 'Notion' }, impact: EMPTY_IMPACT })

		const dialog = screen.getByRole('alertdialog', { name: 'Notion 연결을 해제할까요?' })
		expect(within(dialog).queryByText('연결된 계정')).not.toBeInTheDocument()
		expect(dialog).not.toHaveAccessibleDescription(expect.stringContaining('연결된 계정'))
		expect(dialog).toHaveAccessibleDescription(expect.stringContaining(EMPTY_NOTICE))
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
		renderModal({ impact: EMPTY_IMPACT, onConfirm })

		const dialog = getDialog()
		expect(dialog.getByText(EMPTY_NOTICE)).toBeVisible()
		expect(dialog.queryByRole('list')).not.toBeInTheDocument()
		expect(onConfirm).not.toHaveBeenCalled()
		await user.click(dialog.getByRole('button', { name: '연결 해제' }))

		expect(onConfirm).toHaveBeenCalledOnce()
	})

	it('일시정지된 수동 워크플로우 하나에는 이름과 상태만 표시한다', () => {
		renderModal({ impact: { totalCount: 1, automaticCount: 0, workflows: [WORKFLOWS[1]] } })

		const dialog = getDialog()
		const row = dialog.getByRole('listitem')
		expect(row).toHaveTextContent('팀 위키 업데이트')
		expect(row).toHaveTextContent('일시정지')
		expect(row).toHaveTextContent('수동')
		expect(dialog.queryByText(/실행을 시도해요/)).not.toBeInTheDocument()
		expect(dialog.queryByText(/^외 /)).not.toBeInTheDocument()
	})

	it('자동 실행 워크플로우가 두 개면 스케줄과 웹훅에 맞는 실행 안내를 각 항목에 표시한다', () => {
		renderModal({ impact: { totalCount: 2, automaticCount: 2, workflows: [WORKFLOWS[0], WORKFLOWS[2]] } })

		const dialog = getDialog()
		const rows = dialog.getAllByRole('listitem')
		expect(rows).toHaveLength(2)
		expect(rows[0]).toHaveTextContent('주간 회의록 정리')
		expect(rows[0]).toHaveTextContent('자동 실행 중')
		expect(rows[0]).toHaveTextContent('해제 후에도 예약된 시간마다 실행을 시도해요.')
		expect(rows[1]).toHaveTextContent('배포 알림')
		expect(rows[1]).toHaveTextContent('자동 실행 중')
		expect(rows[1]).toHaveTextContent('해제 후에도 웹훅을 받을 때마다 실행을 시도해요.')
		expect(rows[1]).not.toHaveTextContent('예약된 시간')
		expect(dialog.queryByText(/^전체 /)).not.toBeInTheDocument()
	})

	it.each([3, 4, 5])('워크플로우 %i개는 첫 세 이름과 전체 자동 실행 수를 요약한다', totalCount => {
		renderModal({ impact: { totalCount, automaticCount: 2, workflows: WORKFLOWS } })

		const dialog = getDialog()
		const rows = dialog.getAllByRole('listitem')
		expect(rows).toHaveLength(3)
		WORKFLOWS.forEach((workflow, index) => expect(rows[index]).toHaveTextContent(workflow.name))
		expect(dialog.getByText(/^전체 /)).toHaveTextContent(`전체 ${totalCount}개 중 2개는 해제 후에도 자동 실행을 시도해요.`)
		expect(dialog.queryByText(/예약된 시간/)).not.toBeInTheDocument()
		if (totalCount === 3) {
			expect(dialog.queryByText(/^외 /)).not.toBeInTheDocument()
		} else {
			expect(dialog.getByText(`외 ${totalCount - 3}개`)).toBeVisible()
		}
	})

	it('여러 워크플로우 중 자동 실행이 없으면 요약에는 남은 개수만 표시한다', () => {
		const workflows = ['회의 노트', '팀 위키', '프로젝트 문서'].map(name => ({ ...WORKFLOWS[1], id: name, name }))
		renderModal({ impact: { totalCount: 5, automaticCount: 0, workflows } })

		const dialog = getDialog()
		expect(dialog.getAllByRole('listitem')).toHaveLength(3)
		expect(dialog.getByText('외 2개')).toBeVisible()
		expect(dialog.queryByText(/^전체 /)).not.toBeInTheDocument()
	})

	it('키보드로 해제를 제출하면 확인 버튼에 포커스가 남고 응답을 기다리는 동안 재제출이나 취소를 막는다', async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		const onCancel = vi.fn()
		const props = { impact: EMPTY_IMPACT, onConfirm, onCancel }
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
		await user.click(dialog.getByText(EMPTY_NOTICE))
		expect(confirm).toHaveFocus()
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
		renderModal({ impact: EMPTY_IMPACT, isConfirmDisabled: true, onCancel, onConfirm })

		const dialog = getDialog()
		expect(dialog.getByRole('status')).toHaveTextContent('연결을 해제하고 있어요.')
		const confirm = dialog.getByRole('button', { name: '연결 해제' })
		expect(confirm).toHaveAttribute('aria-disabled', 'true')
		await user.click(confirm)
		await user.click(dialog.getByRole('button', { name: '취소' }))

		expect(onConfirm).not.toHaveBeenCalled()
		expect(onCancel).toHaveBeenCalledOnce()
	})

	it('워크플로우가 있으면 Tab과 Shift+Tab으로 영향 목록에 접근할 수 있다', async () => {
		const user = userEvent.setup()
		renderModal({ impact: { totalCount: 3, automaticCount: 2, workflows: WORKFLOWS } })

		const dialog = getDialog()
		const cancel = dialog.getByRole('button', { name: '취소' })
		const close = dialog.getByRole('button', { name: '닫기' })
		const region = dialog.getByRole('region', { name: '연동 해제 안내' })
		await waitFor(() => expect(cancel).toHaveFocus())
		await user.tab({ shift: true })
		expect(region).toHaveFocus()
		await user.tab({ shift: true })
		expect(close).toHaveFocus()
		await user.tab()
		expect(region).toHaveFocus()
	})

	it('빈 영향 목록은 Tab 순서에서 건너뛰고 모달 안에서 순환하며 Escape로 취소한다', async () => {
		const user = userEvent.setup()
		const onCancel = vi.fn()
		const onConfirm = vi.fn()
		renderModal({ impact: EMPTY_IMPACT, onCancel, onConfirm })

		const dialog = getDialog()
		const cancel = dialog.getByRole('button', { name: '취소' })
		const confirm = dialog.getByRole('button', { name: '연결 해제' })
		await waitFor(() => expect(cancel).toHaveFocus())
		await user.tab()
		expect(confirm).toHaveFocus()
		await user.tab()
		expect(dialog.getByRole('button', { name: '닫기' })).toHaveFocus()
		await user.tab()
		expect(cancel).toHaveFocus()
		await user.tab({ shift: true })
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
		const props = { impact: EMPTY_IMPACT, onCancel }
		const { rerender } = renderModal(props)
		const dialog = getDialog()
		await waitFor(() => expect(dialog.getByRole('button', { name: '취소' })).toHaveFocus())
		await user.click(dialog.getByText(EMPTY_NOTICE))
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
		renderModal({ impact: EMPTY_IMPACT, deleteError, onConfirm })

		const dialog = getDialog()
		const error = dialog.getByRole('alert')
		expect(error).toHaveTextContent(deleteError)
		expect(error).toHaveProperty('tabIndex', 0)
		await user.click(dialog.getByRole('button', { name: '연결 해제' }))

		expect(onConfirm).toHaveBeenCalledOnce()
	})
})
