import { useReducedMotion } from 'framer-motion'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LOCAL_STORAGE_KEY } from '@/constants/key'
import { server } from '@/mocks/server'
import { setReducedMotion } from '@/test/domEnvironment'
import { renderAppRoute } from '@/test/renderAppRoute'

const emptyWorkflowListResponse = {
	success: true,
	data: {
		content: [],
		size: 20,
		hasNext: false,
		nextCursor: null,
	},
	message: 'success',
	code: 'SUCCESS',
}

const ReducedMotionProbe = () => <output>{String(useReducedMotion())}</output>

describe('renderAppRoute', () => {
	it('실제 보호 route를 독립 QueryClient와 인증 상태로 렌더링한다', async () => {
		server.use(http.get('*/api/v1/workflows', () => HttpResponse.json(emptyWorkflowListResponse)))

		const first = renderAppRoute('/user')
		first.queryClient.setQueryData(['harness-isolation'], { owner: 'first' })
		const second = renderAppRoute('/user')

		expect(first.queryClient).not.toBe(second.queryClient)
		expect(first.queryClient.getQueryData(['harness-isolation'])).toEqual({ owner: 'first' })
		expect(second.queryClient.getQueryData(['harness-isolation'])).toBeUndefined()
		expect(first.queryClient.getDefaultOptions().queries?.retry).toBe(false)
		expect(localStorage.getItem(LOCAL_STORAGE_KEY.ACCESS_TOKEN)).toBe('test-access-token')
		expect(within(first.container).getByRole('heading', { level: 2, name: '프로필 정보' })).toBeInTheDocument()
		expect(within(second.container).getByRole('heading', { level: 2, name: '프로필 정보' })).toBeInTheDocument()
		expect(await within(first.container).findByText('최근 워크플로우가 없습니다.')).toBeInTheDocument()
		expect(await within(second.container).findByText('최근 워크플로우가 없습니다.')).toBeInTheDocument()
		await waitFor(() => expect(first.router.state.location.pathname).toBe('/user'))
	})

	it('인증이 없으면 실제 보호 route에서 로그인 화면으로 이동한다', async () => {
		const { router } = renderAppRoute('/user', { auth: null })

		await waitFor(() => expect(router.state.location.pathname).toBe('/auth'))
		expect(screen.getByPlaceholderText('email@email.com')).toBeInTheDocument()
		expect(localStorage.getItem(LOCAL_STORAGE_KEY.ACCESS_TOKEN)).toBeNull()
	})

	it('reduced-motion 변경을 안정적인 MQL과 Framer Motion consumer에 전달한다', () => {
		const mediaQueryList = window.matchMedia('(prefers-reduced-motion)')
		const listener = vi.fn()
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		mediaQueryList.addEventListener('change', listener)

		setReducedMotion(true)
		const enabled = render(<ReducedMotionProbe />)

		expect(window.matchMedia('(prefers-reduced-motion)')).toBe(mediaQueryList)
		expect(mediaQueryList.matches).toBe(true)
		expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)
		expect(window.matchMedia('(prefers-reduced-motion: no-preference)').matches).toBe(false)
		expect(enabled.getByText('true')).toBeInTheDocument()
		expect(listener).toHaveBeenCalledTimes(1)

		enabled.unmount()
		setReducedMotion(false)
		const disabled = render(<ReducedMotionProbe />)

		expect(disabled.getByText('false')).toBeInTheDocument()
		expect(listener).toHaveBeenCalledTimes(2)
		mediaQueryList.removeEventListener('change', listener)
		warning.mockRestore()
	})
})
