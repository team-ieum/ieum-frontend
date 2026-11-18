import { AnimatePresence, motion } from 'framer-motion'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import OAuthDisconnectAction from '@/components/integration/OAuthDisconnectAction'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import type { IntegrationService } from '@/types/integration'

const google: IntegrationService = {
	id: 'oauth-google',
	name: 'Google',
	brand: 'google',
	origin: 'oauth',
	oauthProvider: 'GOOGLE',
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
						<motion.div key='list' exit={{ opacity: 0 }}>
							<OAuthDisconnectAction service={google} />
						</motion.div>
					)}
				</AnimatePresence>
			</QueryClientProvider>
		)
		const { rerender } = render(view(true))
		await user.click(screen.getByRole('button', { name: '연동 해제' }))
		const dialog = await screen.findByRole('alertdialog', { name: 'Google 연동 해제' })
		await within(dialog).findByRole('button', { name: '연동 해제' })

		rerender(view(false))

		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
	})
})
