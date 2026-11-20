import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { oauthConnectionsResponse } from '@/mocks/fixtures/integrations'
import { server } from '@/mocks/server'
import { renderAppRoute } from '@/test/renderAppRoute'
import type { IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'

const createImpactPage = (nextCursor: string | null, ...names: string[]) =>
	HttpResponse.json<IntegrationServiceWorkflowsResponse>({
		success: true,
		data: {
			content: names.map(name => ({
				id: name,
				name,
				description: '',
				active: true,
				triggerType: 'SCHEDULE',
				usedNodeCount: 1,
				updatedAt: '',
			})),
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

const NOTION_DETAIL_PATH = `/inter-setting?serviceId=oauth-${oauthConnectionsResponse.data[0].id}`

// 상세 목록(size=20)은 기본 MSW 응답을 쓰고 확인창의 전체 영향 조회(size=100)만 바꾼다.
const mockNotionImpact = (respond: (params: URLSearchParams) => Response | Promise<Response>) =>
	http.get('*/api/v1/integrations/notion/workflows', ({ request }) => {
		const params = new URL(request.url).searchParams
		if (params.get('size') === '100') return respond(params)
	})

const holdResponse = () => {
	let release!: () => void
	const promise = new Promise<void>(resolve => {
		release = resolve
	})
	return { promise, release }
}

describe('OAuth 연동 해제 영향 다시 조회', () => {
	it('두 번째 페이지가 실패하면 부분 결과와 확인 버튼을 숨기고 첫 페이지부터 새로 조회한다', async () => {
		const user = userEvent.setup()
		const observePage = vi.fn()
		const deleteRequest = vi.fn()
		let firstPageRequests = 0
		server.use(
			NOTION_CONNECTIONS_HANDLER,
			mockNotionImpact(params => {
				const cursor = params.get('cursor')
				observePage(cursor, params.get('size'))
				if (cursor === null) {
					firstPageRequests += 1
					return firstPageRequests === 1
						? createImpactPage('old-next', '이전 시도 워크플로우')
						: createImpactPage('new-next', '일정 알림', '주간 회의 정리')
				}
				if (cursor === 'new-next') return createImpactPage(null, '휴가 등록', '일정 정리', '작업 요약', '마감 알림')
				return new HttpResponse(null, { status: 503 })
			}),
			http.delete('*/api/v1/oauth/connections/NOTION', () => {
				deleteRequest()
				return HttpResponse.json({ success: true, data: null, message: 'OK', code: 'OK' })
			})
		)
		const { router } = renderAppRoute('/inter-setting')
		const notionHeading = await screen.findByRole('heading', { name: 'Notion', level: 3 })
		const notionCard = notionHeading.closest('article')
		if (!notionCard) throw new Error('Notion 연결 카드를 찾지 못했습니다.')
		expect(screen.queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()
		await user.click(within(notionCard).getByRole('button', { name: '관리' }))
		const opener = await screen.findByRole('button', { name: '연결 해제' })
		await user.click(opener)
		const dialog = within(await screen.findByRole('alertdialog', { name: 'Notion 연결을 해제할까요?' }))

		expect(await dialog.findByRole('alert')).toHaveTextContent('이 연결을 쓰는 워크플로우를 확인하지 못했어요.')
		expect(dialog.queryByText(/이전 시도 워크플로우/)).not.toBeInTheDocument()
		expect(dialog.queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()
		expect(deleteRequest).not.toHaveBeenCalled()

		await user.click(dialog.getByRole('button', { name: '다시 조회' }))
		expect(await dialog.findByText('이 연결을 쓰는 워크플로우 6개가 다음 실행부터 실패해요.')).toBeVisible()
		const rows = dialog.getAllByRole('listitem')
		expect(rows).toHaveLength(3)
		expect(rows[0]).toHaveTextContent('일정 알림')
		expect(rows[1]).toHaveTextContent('주간 회의 정리')
		expect(rows[2]).toHaveTextContent('휴가 등록')
		expect(dialog.getByText('외 3개')).toBeVisible()
		expect(dialog.getByText(/^전체 /)).toHaveTextContent('전체 6개 중 6개는 해제 후에도 자동 실행을 시도해요.')
		expect(dialog.queryByText(/마감 알림/)).not.toBeInTheDocument()
		expect(dialog.queryByRole('button', { name: /외 3개/ })).not.toBeInTheDocument()
		expect(dialog.queryByText(/이전 시도 워크플로우/)).not.toBeInTheDocument()
		expect(dialog.getByRole('button', { name: '연결 해제' })).not.toHaveAttribute('aria-disabled', 'true')
		expect(observePage.mock.calls).toEqual([
			[null, '100'],
			['old-next', '100'],
			[null, '100'],
			['new-next', '100'],
		])

		await user.click(dialog.getByRole('button', { name: '취소' }))
		await waitFor(() =>
			expect(screen.queryByRole('alertdialog', { name: 'Notion 연결을 해제할까요?' })).not.toBeInTheDocument()
		)
		await waitFor(() => expect(opener).toHaveFocus())
		expect(router.state.location.pathname + router.state.location.search).toBe(NOTION_DETAIL_PATH)
		expect(deleteRequest).not.toHaveBeenCalled()
	})

	it('완료한 영향 목록은 재조회 중이거나 실패해도 표시하고 새 목록을 확인한 뒤에만 해제를 허용한다', async () => {
		const user = userEvent.setup()
		server.use(
			NOTION_CONNECTIONS_HANDLER,
			mockNotionImpact(() => createImpactPage(null, '기존 워크플로우'))
		)
		const { queryClient } = renderAppRoute(NOTION_DETAIL_PATH)

		await user.click(await screen.findByRole('button', { name: '연결 해제' }))
		const dialog = within(await screen.findByRole('alertdialog', { name: 'Notion 연결을 해제할까요?' }))
		expect(await dialog.findByText(/기존 워크플로우/)).toBeVisible()
		expect(dialog.getByRole('button', { name: '연결 해제' })).not.toHaveAttribute('aria-disabled', 'true')

		const refetch = holdResponse()
		server.use(
			mockNotionImpact(async () => {
				await refetch.promise
				return new HttpResponse(null, { status: 503 })
			})
		)
		try {
			act(() => {
				void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all() })
			})
			await dialog.findByRole('region', { name: '연동 해제 안내', busy: true })
			expect(dialog.getByText(/기존 워크플로우/)).toBeVisible()
			expect(dialog.queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()
		} finally {
			refetch.release()
		}

		expect(await dialog.findByRole('alert')).toHaveTextContent('이 연결을 쓰는 워크플로우를 확인하지 못했어요.')
		expect(dialog.getByText(/기존 워크플로우/)).toBeVisible()
		expect(dialog.queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()

		server.use(mockNotionImpact(() => createImpactPage(null, '새 워크플로우')))
		await user.click(dialog.getByRole('button', { name: '다시 조회' }))
		expect(await dialog.findByText(/새 워크플로우/)).toBeVisible()
		expect(dialog.queryByText(/기존 워크플로우/)).not.toBeInTheDocument()
		expect(dialog.getByRole('button', { name: '연결 해제' })).not.toHaveAttribute('aria-disabled', 'true')
	})

	it('영향 목록 재조회 중 해제가 실패하면 확인 버튼에 포커스를 유지하고 조회 후 키보드로 다시 해제한다', async () => {
		const user = userEvent.setup()
		const refetch = holdResponse()
		const firstDelete = holdResponse()
		const deleteRequest = vi.fn()
		server.use(
			NOTION_CONNECTIONS_HANDLER,
			mockNotionImpact(() => createImpactPage(null, '기존 워크플로우')),
			http.delete('*/api/v1/oauth/connections/NOTION', async () => {
				deleteRequest()
				if (deleteRequest.mock.calls.length === 1) {
					await firstDelete.promise
					return HttpResponse.json(
						{ success: false, data: null, message: '연동 해제 실패', code: 'ERROR' },
						{ status: 503 }
					)
				}
				return HttpResponse.json({ success: true, data: null, message: 'OK', code: 'OK' })
			})
		)
		const { queryClient } = renderAppRoute(NOTION_DETAIL_PATH)
		await user.click(await screen.findByRole('button', { name: '연결 해제' }))
		const dialog = within(await screen.findByRole('alertdialog', { name: 'Notion 연결을 해제할까요?' }))
		const confirm = await dialog.findByRole('button', { name: '연결 해제' })
		server.use(
			mockNotionImpact(async () => {
				await refetch.promise
				return createImpactPage(null, '새 워크플로우')
			})
		)

		try {
			await user.click(confirm)
			await waitFor(() => expect(deleteRequest).toHaveBeenCalledOnce())
			act(() => {
				void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all() })
			})
			await dialog.findByRole('region', { name: '연동 해제 안내', busy: true })
			firstDelete.release()
			expect(await dialog.findByRole('alert')).toHaveTextContent('연동 해제 실패')
			expect(confirm).toHaveFocus()
			expect(confirm).toHaveAttribute('aria-disabled', 'true')
			await user.tab({ shift: true })
			expect(dialog.getByRole('button', { name: '취소' })).toHaveFocus()
			await user.tab()
			expect(confirm).toHaveFocus()
			await user.keyboard('{Enter}[Space]')
			expect(deleteRequest).toHaveBeenCalledOnce()
		} finally {
			firstDelete.release()
			refetch.release()
		}

		expect(await dialog.findByText(/새 워크플로우/)).toBeVisible()
		expect(confirm).toHaveFocus()
		await user.keyboard('{Enter}')
		await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
		expect(deleteRequest).toHaveBeenCalledTimes(2)
	})
})
