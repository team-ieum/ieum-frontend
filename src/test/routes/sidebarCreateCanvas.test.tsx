import type { ReactNode } from 'react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { emptyWorkflowDetailResponse, WORKFLOW_FIXTURE_ID } from '@/mocks/fixtures/workflows'
import { server } from '@/mocks/server'
import { setViewportWidth } from '@/test/domEnvironment'
import { renderAppRoute } from '@/test/renderAppRoute'

vi.mock('@/components/routing/RouteTransition', async () => {
	const { Outlet } = await import('react-router')
	return { RouteTransition: Outlet }
})
// 모달을 닫으면 exit 애니메이션을 기다리지 않고 바로 빼, 닫힌 뒤의 Escape가 사이드바에 닿는지 확인한다.
vi.mock('framer-motion', async () => {
	const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
	return {
		...actual,
		AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
	}
})
// 이 테스트는 생성 후 어느 편집 경로로 가는지만 보므로 캔버스 page는 가볍게 바꾼다.
vi.mock('@/pages/WorkFlowPage', () => ({ default: () => <h1>워크플로우 편집 page</h1> }))

const getSidebar = () => screen.getByRole('complementary', { name: '사이드바' })

const useCreateWorkflowHandler = (respond: () => Promise<Response> | Response) => {
	const requestBodies: unknown[] = []
	server.use(
		http.post('*/api/v1/workflows', async ({ request }) => {
			requestBodies.push(await request.json())
			return respond()
		})
	)
	return requestBodies
}

describe('사이드바 새 캔버스', () => {
	it('빈 워크플로우를 한 번 만들고 응답 id의 편집 화면으로 이동한다', async () => {
		const user = userEvent.setup()
		const requestBodies = useCreateWorkflowHandler(() =>
			HttpResponse.json(
				{ ...emptyWorkflowDetailResponse, data: { ...emptyWorkflowDetailResponse.data, id: WORKFLOW_FIXTURE_ID } },
				{ status: 201 }
			)
		)
		const { router } = renderAppRoute('/user')

		await user.click(within(getSidebar()).getByRole('button', { name: /^새 캔버스/ }))

		await waitFor(() => expect(router.state.location.pathname).toBe(`/workflow/${WORKFLOW_FIXTURE_ID}`))
		expect(requestBodies).toEqual([{ name: '새 워크플로우', nodes: [], edges: [] }])
		expect(await screen.findByRole('heading', { name: '워크플로우 편집 page' })).toBeInTheDocument()
	})

	it('만드는 동안 버튼을 비활성으로 알리되 포커스는 지키고, 다시 눌러도 요청을 한 번만 보낸다', async () => {
		const user = userEvent.setup()
		let release!: () => void
		const released = new Promise<void>(resolve => (release = resolve))
		const requestBodies = useCreateWorkflowHandler(async () => {
			await released
			return HttpResponse.json(emptyWorkflowDetailResponse, { status: 201 })
		})
		const { router } = renderAppRoute('/user')
		const button = within(getSidebar()).getByRole('button', { name: /^새 캔버스/ })

		button.focus()
		await user.keyboard('{Enter}')
		await waitFor(() => expect(button).toHaveAttribute('aria-disabled', 'true'))
		expect(button).toHaveAttribute('aria-busy', 'true')
		// disabled로 바꾸면 브라우저가 포커스를 풀어 실패 모달을 닫은 뒤 돌아올 곳을 잃는다.
		expect(button).toHaveFocus()
		await user.keyboard('{Enter}')
		await user.click(button)

		release()
		await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/workflow\/[^/]+$/))
		expect(requestBodies).toHaveLength(1)
	})

	it('만들지 못하면 오류 모달을 띄우고 지금 화면에 남는다', async () => {
		const user = userEvent.setup()
		useCreateWorkflowHandler(() =>
			HttpResponse.json(
				{ success: false, data: null, message: '워크플로우 구성을 확인해주세요.', code: 'INVALID_WORKFLOW' },
				{ status: 400 }
			)
		)
		const { router } = renderAppRoute('/user')

		await user.click(within(getSidebar()).getByRole('button', { name: /^새 캔버스/ }))

		expect(await screen.findByText('워크플로우 구성을 확인해주세요.')).toBeInTheDocument()
		expect(router.state.location.pathname).toBe('/user')
		expect(within(getSidebar()).getByRole('button', { name: /^새 캔버스/ })).not.toHaveAttribute('aria-disabled')
	})

	it('모바일 사이드바는 만든 뒤에만 닫히고, 실패하면 열어 둔다', async () => {
		setViewportWidth(390)
		const user = userEvent.setup()
		let shouldFail = true
		useCreateWorkflowHandler(() =>
			shouldFail ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(emptyWorkflowDetailResponse, { status: 201 })
		)
		const { router } = renderAppRoute('/user')
		await user.click(screen.getByRole('button', { name: '사이드바 열기' }))

		await user.click(within(getSidebar()).getByRole('button', { name: /^새 캔버스/ }))
		expect(await screen.findByText('워크플로우 생성에 실패했어요. 다시 시도해주세요.')).toBeInTheDocument()
		expect(getSidebar()).not.toHaveAttribute('inert')

		await user.click(screen.getByRole('button', { name: '확인' }))
		shouldFail = false
		await user.click(within(getSidebar()).getByRole('button', { name: /^새 캔버스/ }))

		await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/workflow\/[^/]+$/))
		await waitFor(() => expect(getSidebar()).toHaveAttribute('inert'))
	})

	it('모바일 사이드바에서 뜬 생성 실패 모달을 Escape로 닫으면 사이드바는 열어 둔다', async () => {
		setViewportWidth(390)
		const user = userEvent.setup()
		useCreateWorkflowHandler(() => new HttpResponse(null, { status: 500 }))
		renderAppRoute('/user')
		await user.click(screen.getByRole('button', { name: '사이드바 열기' }))

		await user.click(within(getSidebar()).getByRole('button', { name: /^새 캔버스/ }))
		expect(await screen.findByText('워크플로우 생성에 실패했어요. 다시 시도해주세요.')).toBeInTheDocument()
		await user.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(getSidebar()).not.toHaveAttribute('inert')

		// 모달이 없을 때의 Escape는 지금처럼 사이드바를 닫는다.
		await user.keyboard('{Escape}')
		await waitFor(() => expect(getSidebar()).toHaveAttribute('inert'))
	})
})
