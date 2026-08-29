import { describe, expect, it, vi } from 'vitest'
import { LOCAL_STORAGE_KEY } from '@/constants/key'
import { server } from '@/mocks/server'
import {
	createPaginationDemoWorkflowListHandler,
	isPaginationDemoApiRequest,
	onPaginationDemoUnhandledRequest,
	PAGINATION_DEMO_REQUEST_DELAY_MS,
	PAGINATION_DEMO_WORKFLOW_COUNT,
	paginationDemoWorkflows,
} from '@/mocks/paginationDemo'
import { seedPaginationDemoAuthState } from '@/mocks/paginationDemoBrowser'
import { useAuthStore } from '@/stores/useAuthStore'
import type { WorkflowListResponse } from '@/types/workflowList'

vi.mock('msw/browser', () => ({ setupWorker: () => ({ start: vi.fn() }) }))

const requestPage = async (query = ''): Promise<WorkflowListResponse> => {
	const response = await fetch(`https://api.test.invalid/api/v1/workflows${query}`)
	return response.json() as Promise<WorkflowListResponse>
}

describe('pagination demo workflow handler', () => {
	it('결정적인 60건 fixture와 700ms 지연 계약을 사용한다', () => {
		expect(PAGINATION_DEMO_REQUEST_DELAY_MS).toBe(700)
		expect(paginationDemoWorkflows).toHaveLength(PAGINATION_DEMO_WORKFLOW_COUNT)
		expect(new Set(paginationDemoWorkflows.map(workflow => workflow.id))).toHaveLength(PAGINATION_DEMO_WORKFLOW_COUNT)
		expect(paginationDemoWorkflows[0]?.name).toBe('페이지네이션 데모 01')
		expect(paginationDemoWorkflows.at(-1)?.name).toBe('페이지네이션 데모 60')
	})

	it('기본 20건씩 세 페이지를 반환하고 마지막 cursor를 종료한다', async () => {
		server.use(createPaginationDemoWorkflowListHandler(0))

		const firstPage = await requestPage()
		const secondPage = await requestPage(`?cursor=${firstPage.data.nextCursor}`)
		const lastPage = await requestPage(`?cursor=${secondPage.data.nextCursor}`)

		expect(firstPage.data).toMatchObject({ size: 20, hasNext: true, nextCursor: '20' })
		expect(firstPage.data.content.map(workflow => workflow.name)).toEqual(
			Array.from({ length: 20 }, (_, index) => `페이지네이션 데모 ${String(index + 1).padStart(2, '0')}`)
		)
		expect(secondPage.data).toMatchObject({ size: 20, hasNext: true, nextCursor: '40' })
		expect(secondPage.data.content[0]?.name).toBe('페이지네이션 데모 21')
		expect(lastPage.data).toMatchObject({ size: 20, hasNext: false, nextCursor: null })
		expect(lastPage.data.content).toHaveLength(20)
		expect(lastPage.data.content.at(-1)?.name).toBe('페이지네이션 데모 60')
	})

	it('요청한 cursor와 size로 페이지 범위를 계산한다', async () => {
		server.use(createPaginationDemoWorkflowListHandler(0))

		const page = await requestPage('?cursor=15&size=7')

		expect(page.data).toMatchObject({ size: 7, hasNext: true, nextCursor: '22' })
		expect(page.data.content.map(workflow => workflow.name)).toEqual([
			'페이지네이션 데모 16',
			'페이지네이션 데모 17',
			'페이지네이션 데모 18',
			'페이지네이션 데모 19',
			'페이지네이션 데모 20',
			'페이지네이션 데모 21',
			'페이지네이션 데모 22',
		])
	})

	it('유효하지 않거나 안전한 정수 범위를 벗어난 cursor와 size는 기본값으로 처리한다', async () => {
		server.use(createPaginationDemoWorkflowListHandler(0))

		const invalidPage = await requestPage('?cursor=-1&size=0')
		const unsafePage = await requestPage('?cursor=9007199254740992&size=999999999999999999999999999999999999')

		expect(invalidPage.data).toMatchObject({ size: 20, hasNext: true, nextCursor: '20' })
		expect(invalidPage.data.content[0]?.name).toBe('페이지네이션 데모 01')
		expect(unsafePage.data).toMatchObject({ size: 20, hasNext: true, nextCursor: '20' })
		expect(unsafePage.data.content[0]?.name).toBe('페이지네이션 데모 01')
	})

	it('설정하지 않은 API 요청은 차단하고 비 API 요청만 bypass한다', () => {
		const error = vi.fn()
		const warning = vi.fn()
		const print = { error, warning }
		const apiRequest = new Request('https://api.example.com/api/v1/workflows/dashboard/summary')
		const assetRequest = new Request('https://app.example.com/assets/index.js')

		expect(isPaginationDemoApiRequest(apiRequest)).toBe(true)
		expect(isPaginationDemoApiRequest(assetRequest)).toBe(false)
		onPaginationDemoUnhandledRequest(apiRequest, print)
		onPaginationDemoUnhandledRequest(assetRequest, print)

		expect(error).toHaveBeenCalledTimes(1)
		expect(warning).not.toHaveBeenCalled()
	})

	it('demo 인증은 전역 localStorage 값을 덮어쓰지 않는다', () => {
		localStorage.setItem(LOCAL_STORAGE_KEY.ACCESS_TOKEN, 'persisted-access-token')
		localStorage.setItem(LOCAL_STORAGE_KEY.REFRESH_TOKEN, 'persisted-refresh-token')

		seedPaginationDemoAuthState()

		expect(useAuthStore.getState()).toMatchObject({
			accessToken: 'pagination-demo-access-token',
			refreshToken: 'pagination-demo-refresh-token',
		})
		expect(localStorage.getItem(LOCAL_STORAGE_KEY.ACCESS_TOKEN)).toBe('persisted-access-token')
		expect(localStorage.getItem(LOCAL_STORAGE_KEY.REFRESH_TOKEN)).toBe('persisted-refresh-token')
	})
})
