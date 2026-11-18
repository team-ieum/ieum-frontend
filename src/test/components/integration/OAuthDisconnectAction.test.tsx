import { AnimatePresence, motion } from 'framer-motion'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import OAuthDisconnectAction from '@/components/integration/OAuthDisconnectAction'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import type { IntegrationService } from '@/types/integration'

const notion: IntegrationService = {
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
		server.use(
			http.get('*/api/v1/integrations/notion/workflows', () =>
				HttpResponse.json({
					success: true,
					data: { content: [], size: 100, hasNext: false, nextCursor: null },
					message: 'OK',
					code: 'OK',
				})
			)
		)
		const view = (show: boolean) => (
			<QueryClientProvider client={client}>
				<AnimatePresence>
					{show && (
						<motion.div key='list' exit={{ opacity: 0 }}>
							<OAuthDisconnectAction service={notion} />
						</motion.div>
					)}
				</AnimatePresence>
			</QueryClientProvider>
		)
		const { rerender } = render(view(true))
		await user.click(screen.getByRole('button', { name: '연동 해제' }))
		const dialog = await screen.findByRole('alertdialog', { name: 'Notion 연동 해제' })
		await within(dialog).findByRole('button', { name: '연동 해제' })

		rerender(view(false))

		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
	})
})
