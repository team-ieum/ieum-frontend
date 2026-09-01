import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { workflowFixture } from '@/mocks/fixtures/workflows'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { getIntersectionObserverRootMargins, intersectObservedElements } from '@/test/domEnvironment'
import { renderAppRoute } from '@/test/renderAppRoute'
import type { WorkflowDto, WorkflowListResponse } from '@/types/workflowList'

vi.mock('@/components/routing/RouteTransition', async () => {
	const { Outlet } = await import('react-router')
	return { RouteTransition: Outlet }
})

const createWorkflow = (id: string, name: string): WorkflowDto => ({
	...workflowFixture,
	id,
	name,
})

const createWorkflowListResponse = (
	content: WorkflowDto[],
	hasNext: boolean,
	nextCursor: string | null
): WorkflowListResponse => ({
	success: true,
	data: {
		content,
		size: 20,
		hasNext,
		nextCursor,
	},
	message: 'success',
	code: 'SUCCESS',
})

describe('워크플로우 목록 페이지네이션', () => {
	it('sentinel이 하단 320px 범위에 진입하면 다음 페이지를 누적하고 마지막 페이지에서 중단한다', async () => {
		const observeRequest = vi.fn()
		server.use(
			http.get('*/api/v1/workflows', ({ request }) => {
				const cursor = new URL(request.url).searchParams.get('cursor')
				observeRequest(cursor)
				return HttpResponse.json(
					cursor === 'next-page'
						? createWorkflowListResponse([createWorkflow('workflow-2', '두 번째 워크플로우')], false, null)
						: createWorkflowListResponse([createWorkflow('workflow-1', '첫 번째 워크플로우')], true, 'next-page')
				)
			})
		)

		renderAppRoute('/workflow')

		expect(await screen.findByRole('button', { name: '첫 번째 워크플로우 열기' })).toBeInTheDocument()
		expect(screen.getByText('불러온 1개')).toBeInTheDocument()
		expect(getIntersectionObserverRootMargins()).toContain('0px 0px 320px 0px')

		act(() => intersectObservedElements())

		expect(await screen.findByRole('button', { name: '두 번째 워크플로우 열기' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '첫 번째 워크플로우 열기' })).toBeInTheDocument()
		expect(screen.getByText('불러온 2개')).toBeInTheDocument()
		expect(observeRequest).toHaveBeenCalledTimes(2)

		act(() => intersectObservedElements())
		expect(observeRequest).toHaveBeenCalledTimes(2)
	})

	it('연속 intersection 중에는 다음 페이지를 한 번만 요청한다', async () => {
		const observeRequest = vi.fn()
		server.use(
			http.get('*/api/v1/workflows', async ({ request }) => {
				const cursor = new URL(request.url).searchParams.get('cursor')
				observeRequest(cursor)
				if (cursor) await delay(40)
				return HttpResponse.json(
					cursor
						? createWorkflowListResponse([createWorkflow('workflow-2', '두 번째 워크플로우')], false, null)
						: createWorkflowListResponse([createWorkflow('workflow-1', '첫 번째 워크플로우')], true, 'next-page')
				)
			})
		)

		renderAppRoute('/workflow')
		await screen.findByRole('button', { name: '첫 번째 워크플로우 열기' })

		act(() => {
			intersectObservedElements()
			intersectObservedElements()
			intersectObservedElements()
		})

		expect(await screen.findByRole('status', { name: '다음 워크플로우 불러오는 중' })).toBeInTheDocument()
		expect(screen.queryByText('다음 워크플로우 불러오는 중…')).not.toBeInTheDocument()
		expect(observeRequest).toHaveBeenCalledTimes(2)
		expect(await screen.findByRole('button', { name: '두 번째 워크플로우 열기' })).toBeInTheDocument()
	})

	it('다음 페이지 실패 시 기존 목록을 유지하고 인라인 재시도로 누적한다', async () => {
		let nextPageRequestCount = 0
		server.use(
			http.get('*/api/v1/workflows', ({ request }) => {
				const cursor = new URL(request.url).searchParams.get('cursor')
				if (!cursor) {
					return HttpResponse.json(
						createWorkflowListResponse([createWorkflow('workflow-1', '첫 번째 워크플로우')], true, 'next-page')
					)
				}

				nextPageRequestCount += 1
				return nextPageRequestCount === 1
					? new HttpResponse(null, { status: 500 })
					: HttpResponse.json(
							createWorkflowListResponse([createWorkflow('workflow-2', '두 번째 워크플로우')], false, null)
						)
			})
		)

		renderAppRoute('/workflow')
		await screen.findByRole('button', { name: '첫 번째 워크플로우 열기' })
		act(() => intersectObservedElements())

		const appendError = await screen.findByText('다음 워크플로우를 불러오지 못했습니다.')
		expect(screen.getByRole('button', { name: '첫 번째 워크플로우 열기' })).toBeInTheDocument()
		expect(screen.queryByText('워크플로우를 불러오지 못했습니다.')).not.toBeInTheDocument()
		expect(screen.queryByText('업데이트하지 못했습니다.')).not.toBeInTheDocument()

		fireEvent.click(within(appendError.parentElement!).getByRole('button', { name: '다시 시도' }))

		expect(await screen.findByRole('button', { name: '두 번째 워크플로우 열기' })).toBeInTheDocument()
		expect(nextPageRequestCount).toBe(2)
	})

	it('append 재시도를 빠르게 연속 활성화해도 요청을 한 번만 추가하고 로딩 상태를 표시한다', async () => {
		let nextPageRequestCount = 0
		server.use(
			http.get('*/api/v1/workflows', async ({ request }) => {
				const cursor = new URL(request.url).searchParams.get('cursor')
				if (!cursor) {
					return HttpResponse.json(
						createWorkflowListResponse([createWorkflow('workflow-1', '첫 번째 워크플로우')], true, 'next-page')
					)
				}

				nextPageRequestCount += 1
				if (nextPageRequestCount === 1) {
					return new HttpResponse(null, { status: 500 })
				}

				await delay(80)
				return HttpResponse.json(
					createWorkflowListResponse([createWorkflow('workflow-2', '두 번째 워크플로우')], false, null)
				)
			})
		)

		renderAppRoute('/workflow')
		await screen.findByRole('button', { name: '첫 번째 워크플로우 열기' })
		act(() => intersectObservedElements())

		const appendError = await screen.findByText('다음 워크플로우를 불러오지 못했습니다.')
		const retryButton = within(appendError.parentElement!).getByRole('button', { name: '다시 시도' })
		act(() => {
			fireEvent.click(retryButton)
			fireEvent.click(retryButton)
			fireEvent.click(retryButton)
		})

		expect(await screen.findByRole('status', { name: '다음 워크플로우 불러오는 중' })).toBeInTheDocument()
		expect(screen.queryByText('다음 워크플로우 불러오는 중…')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
		expect(nextPageRequestCount).toBe(2)
		expect(await screen.findByRole('button', { name: '두 번째 워크플로우 열기' })).toBeInTheDocument()
		expect(nextPageRequestCount).toBe(2)
	})

	it('background refetch 중 cursor 요청을 막고 완료 후 observer를 다시 연결한다', async () => {
		const requestedCursors: Array<string | null> = []
		server.use(
			http.get('*/api/v1/workflows', async ({ request }) => {
				const cursor = new URL(request.url).searchParams.get('cursor')
				requestedCursors.push(cursor)
				if (cursor === null && requestedCursors.filter(value => value === null).length > 1) {
					await delay(80)
				}
				return HttpResponse.json(
					cursor
						? createWorkflowListResponse([createWorkflow('workflow-2', '두 번째 워크플로우')], false, null)
						: createWorkflowListResponse([createWorkflow('workflow-1', '첫 번째 워크플로우')], true, 'next-page')
				)
			})
		)
		const queryClient = createTestQueryClient()
		const { router } = renderAppRoute('/workflow', { queryClient })
		await screen.findByRole('button', { name: '첫 번째 워크플로우 열기' })
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
		const queryKey = queryKeys.workflows.list({ size: 20 })
		const cachedData = queryClient.getQueryData(queryKey)
		expect(cachedData).toBeDefined()
		queryClient.setQueryData(queryKey, cachedData, { updatedAt: 1 })

		await act(async () => router.navigate('/user'))
		await act(async () => router.navigate('/workflow'))
		await waitFor(() => expect(queryClient.isFetching({ queryKey })).toBe(1))
		act(() => intersectObservedElements())

		expect(requestedCursors.filter(cursor => cursor !== null)).toHaveLength(0)
		await waitFor(() => expect(queryClient.isFetching({ queryKey })).toBe(0))
		await waitFor(() => expect(getIntersectionObserverRootMargins()).toContain('0px 0px 320px 0px'))
		act(() => intersectObservedElements())

		expect(await screen.findByRole('button', { name: '두 번째 워크플로우 열기' })).toBeInTheDocument()
		expect(requestedCursors.filter(cursor => cursor === 'next-page')).toHaveLength(1)
	})

	it('현재 페이지의 필터 결과가 없어도 다음 페이지를 탐색한 뒤 결과를 표시한다', async () => {
		server.use(
			http.get('*/api/v1/workflows', ({ request }) => {
				const cursor = new URL(request.url).searchParams.get('cursor')
				return HttpResponse.json(
					cursor
						? createWorkflowListResponse([createWorkflow('workflow-2', '찾는 워크플로우')], false, null)
						: createWorkflowListResponse([createWorkflow('workflow-1', '다른 워크플로우')], true, 'next-page')
				)
			})
		)

		renderAppRoute('/workflow')
		await screen.findByRole('button', { name: '다른 워크플로우 열기' })
		fireEvent.change(screen.getByPlaceholderText('이름, 서비스 검색'), { target: { value: '찾는' } })

		expect(screen.queryByRole('heading', { level: 2, name: '조건에 맞는 워크플로우가 없어요' })).not.toBeInTheDocument()
		act(() => intersectObservedElements())

		expect(await screen.findByRole('button', { name: '찾는 워크플로우 열기' })).toBeInTheDocument()
		expect(screen.getByText('1개 / 불러온 2개')).toBeInTheDocument()
	})

	it('마지막 페이지까지 필터 결과가 없으면 확정 empty를 표시한다', async () => {
		server.use(
			http.get('*/api/v1/workflows', ({ request }) => {
				const cursor = new URL(request.url).searchParams.get('cursor')
				return HttpResponse.json(
					cursor
						? createWorkflowListResponse([createWorkflow('workflow-2', '두 번째 다른 항목')], false, null)
						: createWorkflowListResponse([createWorkflow('workflow-1', '첫 번째 다른 항목')], true, 'next-page')
				)
			})
		)

		renderAppRoute('/workflow')
		await screen.findByRole('button', { name: '첫 번째 다른 항목 열기' })
		fireEvent.change(screen.getByPlaceholderText('이름, 서비스 검색'), { target: { value: '없는 이름' } })

		expect(screen.queryByRole('heading', { level: 2, name: '조건에 맞는 워크플로우가 없어요' })).not.toBeInTheDocument()
		act(() => intersectObservedElements())

		expect(await screen.findByRole('heading', { level: 2, name: '조건에 맞는 워크플로우가 없어요' })).toBeInTheDocument()
		expect(screen.getByText('0개 / 불러온 2개')).toBeInTheDocument()
	})
})
