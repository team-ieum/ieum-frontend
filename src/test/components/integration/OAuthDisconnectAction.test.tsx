import { AnimatePresence, motion } from 'framer-motion'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import OAuthDisconnectAction from '@/components/integration/OAuthDisconnectAction'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import type { IntegrationService } from '@/types/integration'

const NOTION_SERVICE: IntegrationService = {
	id: 'oauth-notion',
	name: 'Notion',
	brand: 'notion',
	origin: 'oauth',
	oauthProvider: 'NOTION',
	status: 'connected',
}

describe('OAuthDisconnectAction', () => {
	it('이전 화면의 퇴장 애니메이션 중에도 해제 확인창은 즉시 닫힌다', async () => {
		const user = userEvent.setup()
		const client = createTestQueryClient()
		const view = (show: boolean) => (
			<QueryClientProvider client={client}>
				<AnimatePresence>
					{show && (
						<motion.div key='detail' exit={{ opacity: 0 }}>
							<OAuthDisconnectAction service={NOTION_SERVICE} onDisconnected={vi.fn()} />
						</motion.div>
					)}
				</AnimatePresence>
			</QueryClientProvider>
		)
		const { rerender } = render(view(true))
		await user.click(screen.getByRole('button', { name: '연결 해제' }))
		const dialog = await screen.findByRole('alertdialog', { name: 'Notion 연결을 해제할까요?' })
		await within(dialog).findByRole('button', { name: '연결 해제' })

		rerender(view(false))

		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
	})
})
