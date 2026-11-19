import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { oauthConnectionsResponse } from '@/mocks/fixtures/integrations'
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

const NOTION_CONNECTIONS_HANDLER = http.get('*/api/v1/oauth/connections', () =>
	HttpResponse.json({
		...oauthConnectionsResponse,
		data: [{ ...oauthConnectionsResponse.data[0], provider: 'NOTION', providerAccountId: 'test-notion-account', scopes: [] }],
	})
)

describe('OAuth 연동 해제 영향 다시 조회', () => {
	it('두 번째 페이지가 실패하면 부분 목록과 확인 버튼을 숨기고 첫 페이지부터 새로 조회한다', async () => {
		const user = userEvent.setup()
		const observePage = vi.fn()
		const deleteRequest = vi.fn()
		let firstPageRequests = 0
		server.use(
			NOTION_CONNECTIONS_HANDLER,
			http.get('*/api/v1/integrations/notion/workflows', ({ request }) => {
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
			http.delete('*/api/v1/oauth/connections/NOTION', () => {
				deleteRequest()
				return HttpResponse.json({ success: true, data: null, message: 'OK', code: 'OK' })
			})
		)
		renderAppRoute('/inter-setting')

		const notionHeading = await screen.findByRole('heading', { name: 'Notion' })
		const notionCard = notionHeading.closest('article')
		if (!notionCard) throw new Error('Notion 연결 카드를 찾지 못했습니다.')
		const opener = within(notionCard).getByRole('button', { name: '연동 해제' })
		await user.click(opener)
		const dialog = within(await screen.findByRole('alertdialog', { name: 'Notion 연동 해제' }))

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
		await waitFor(() => expect(screen.queryByRole('alertdialog', { name: 'Notion 연동 해제' })).not.toBeInTheDocument())
		await waitFor(() => expect(opener).toHaveFocus())
		expect(deleteRequest).not.toHaveBeenCalled()
	})

	it('완료한 영향 목록은 재조회 중이거나 실패해도 표시하고 새 목록을 확인한 뒤에만 해제를 허용한다', async () => {
		const user = userEvent.setup()
		const workflowPath = '*/api/v1/integrations/notion/workflows'
		server.use(
			NOTION_CONNECTIONS_HANDLER,
			http.get(workflowPath, () => createImpactPage('first', '기존 워크플로우', null))
		)
		const { queryClient } = renderAppRoute('/inter-setting')

		await user.click(await screen.findByRole('button', { name: '연동 해제' }))
		const dialog = within(await screen.findByRole('alertdialog', { name: 'Notion 연동 해제' }))
		expect(await dialog.findByText('기존 워크플로우')).toBeVisible()
		expect(dialog.getByRole('button', { name: '연동 해제' })).toBeEnabled()

		let releaseRefetch!: () => void
		const response = new Promise<void>(resolve => {
			releaseRefetch = resolve
		})
		server.use(
			http.get(workflowPath, async () => {
				await response
				return new HttpResponse(null, { status: 503 })
			})
		)
		try {
			act(() => {
				void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all() })
			})
			await dialog.findByRole('region', { name: '연동 해제 안내', busy: true })
			expect(dialog.getByText('기존 워크플로우')).toBeVisible()
			expect(dialog.queryByRole('button', { name: '연동 해제' })).not.toBeInTheDocument()
		} finally {
			releaseRefetch()
		}

		expect(await dialog.findByRole('alert')).toHaveTextContent('영향받는 워크플로우를 모두 확인하지 못했습니다.')
		expect(dialog.getByText('기존 워크플로우')).toBeVisible()
		expect(dialog.queryByRole('button', { name: '연동 해제' })).not.toBeInTheDocument()

		server.use(http.get(workflowPath, () => createImpactPage('second', '새 워크플로우', null)))
		await user.click(dialog.getByRole('button', { name: '다시 조회' }))
		expect(await dialog.findByText('새 워크플로우')).toBeVisible()
		expect(dialog.queryByText('기존 워크플로우')).not.toBeInTheDocument()
		expect(dialog.getByRole('button', { name: '연동 해제' })).toBeEnabled()
	})
})
