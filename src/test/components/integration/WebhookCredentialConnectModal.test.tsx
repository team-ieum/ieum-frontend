import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import WebhookCredentialConnectModal from '@/components/integration/WebhookCredentialConnectModal'

const ModalHarness = ({ onSubmit = vi.fn() }: { onSubmit?: () => void }) => {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<>
			<button type='button' onClick={() => setIsOpen(true)}>
				Slack 연결
			</button>
			{isOpen ? (
				<WebhookCredentialConnectModal
					serviceId='slack'
					onClose={() => setIsOpen(false)}
					onSubmit={onSubmit}
					isPending={false}
				/>
			) : null}
		</>
	)
}

describe('WebhookCredentialConnectModal 접근성', () => {
	it('제목과 설명이 연결된 modal dialog로 열고 첫 입력에 focus한다', async () => {
		const user = userEvent.setup()
		render(<ModalHarness />)

		await user.click(screen.getByRole('button', { name: 'Slack 연결' }))

		const dialog = screen.getByRole('dialog', { name: 'Slack 웹훅 연결' })
		expect(dialog).toHaveAttribute('aria-modal', 'true')
		expect(dialog).toHaveAccessibleDescription('Incoming Webhook URL로 메시지를 보냅니다. OAuth가 아닙니다.')
		await waitFor(() => expect(screen.getByRole('textbox', { name: '표시 이름' })).toHaveFocus())
	})

	it('각 입력을 label과 hint에 연결하고 필수 여부를 required로 전달한다', async () => {
		const user = userEvent.setup()
		render(<ModalHarness />)
		await user.click(screen.getByRole('button', { name: 'Slack 연결' }))

		const webhookUrl = screen.getByRole('textbox', { name: 'Webhook URL' })
		expect(webhookUrl).toBeRequired()
		expect(webhookUrl).toHaveAccessibleDescription('Slack 앱 → Incoming Webhooks에서 발급한 URL 전체를 붙여넣으세요.')
		expect(screen.getByRole('textbox', { name: '기본 채널 (선택)' })).not.toBeRequired()
	})

	// jsdom의 selector 엔진은 tabbable 후보를 문서 순서로 반환하지 않으므로 특정 순서 대신 focus가 dialog를 벗어나지 않는지 확인한다.
	it('Tab과 Shift+Tab을 반복해도 focus가 모달 밖으로 나가지 않는다', async () => {
		const user = userEvent.setup()
		render(<ModalHarness />)
		await user.click(screen.getByRole('button', { name: 'Slack 연결' }))
		const dialog = screen.getByRole('dialog', { name: 'Slack 웹훅 연결' })
		await waitFor(() => expect(screen.getByRole('textbox', { name: '표시 이름' })).toHaveFocus())

		for (let step = 0; step < 8; step += 1) {
			await user.tab()
			expect(dialog).toContainElement(document.activeElement as HTMLElement)
		}
		for (let step = 0; step < 8; step += 1) {
			await user.tab({ shift: true })
			expect(dialog).toContainElement(document.activeElement as HTMLElement)
		}
	})

	it('Escape로 닫고 연결 버튼으로 focus를 되돌린다', async () => {
		const user = userEvent.setup()
		render(<ModalHarness />)
		const opener = screen.getByRole('button', { name: 'Slack 연결' })
		await user.click(opener)
		await waitFor(() => expect(screen.getByRole('textbox', { name: '표시 이름' })).toHaveFocus())

		await user.keyboard('{Escape}')

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		await waitFor(() => expect(opener).toHaveFocus())
	})
})
