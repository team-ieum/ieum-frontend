import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { renderAppRoute } from '@/test/renderAppRoute'
import type { IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'

const createImpactPage = (id: string, name: string, nextCursor: string | null) =>
	HttpResponse.json<IntegrationServiceWorkflowsResponse>({
		success: true,
		data: {
			content: [{ id, name, description: '', active: true, triggerType: 'SCHEDULE', usedNodeCount: 1, updatedAt: '' }],
			size: 100,
			hasNext: nextCursor !== null,
			nextCursor,
		},
		message: 'OK',
		code: 'OK',
	})

describe('OAuth 연동 해제 영향 다시 조회', () => {
	it('두 번째 페이지가 실패하면 부분 목록과 확인 버튼을 숨기고 첫 페이지부터 새로 조회한다', async () => {
		const user = userEvent.setup()
		const observePage = vi.fn()
		const deleteRequest = vi.fn()
		let firstPageRequests = 0
		server.use(
			http.get('*/api/v1/integrations/google/workflows', ({ request }) => {
				const params = new URL(request.url).searchParams
				const cursor = params.get('cursor')
				observePage(cursor, params.get('size'))
				if (cursor === null) {
					firstPageRequests += 1
					return firstPageRequests === 1
						? createImpactPage('old', '이전 시도 워크플로우', 'old-next')
						: createImpactPage('new-first', '새 첫 페이지 워크플로우', 'new-next')
				}
				if (cursor === 'new-next') return createImpactPage('new-second', '새 두 번째 페이지 워크플로우', null)
				return new HttpResponse(null, { status: 503 })
			}),
			http.delete('*/api/v1/oauth/connections/GOOGLE', () => {
				deleteRequest()
				return HttpResponse.json({ success: true, data: null, message: 'OK', code: 'OK' })
			})
		)
		renderAppRoute('/inter-setting')

		const googleHeading = await screen.findByRole('heading', { name: 'Google' })
		const googleCard = googleHeading.closest('article')
		if (!googleCard) throw new Error('Google 연결 카드를 찾지 못했습니다.')
		await user.click(within(googleCard).getByRole('button', { name: '연동 해제' }))
		const dialog = within(await screen.findByRole('alertdialog', { name: 'Google 연동 해제' }))

		expect(await dialog.findByRole('alert')).toHaveTextContent('영향받는 워크플로우를 모두 확인하지 못했습니다.')
		expect(dialog.queryByRole('list', { name: '영향받는 워크플로우' })).not.toBeInTheDocument()
		expect(dialog.queryByText('이전 시도 워크플로우')).not.toBeInTheDocument()
		expect(dialog.queryByRole('button', { name: '연동 해제' })).not.toBeInTheDocument()
		expect(deleteRequest).not.toHaveBeenCalled()

		await user.click(dialog.getByRole('button', { name: '다시 조회' }))
		const workflows = within(await dialog.findByRole('list', { name: '영향받는 워크플로우' }))
		expect(workflows.getAllByRole('listitem')).toHaveLength(2)
		expect(workflows.getByText('새 첫 페이지 워크플로우')).toBeInTheDocument()
		expect(workflows.getByText('새 두 번째 페이지 워크플로우')).toBeInTheDocument()
		expect(dialog.queryByText('이전 시도 워크플로우')).not.toBeInTheDocument()
		expect(dialog.getByRole('button', { name: '연동 해제' })).toBeEnabled()
		expect(observePage.mock.calls).toEqual([
			[null, '100'],
			['old-next', '100'],
			[null, '100'],
			['new-next', '100'],
		])

		await user.click(dialog.getByRole('button', { name: '취소' }))
		await waitFor(() => expect(screen.queryByRole('alertdialog', { name: 'Google 연동 해제' })).not.toBeInTheDocument())
		expect(deleteRequest).not.toHaveBeenCalled()
	})
})
