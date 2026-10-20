import axios, { AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshAccessToken, subscribeAuthSessionChange } from '@/services/authRefresh'
import { useAuthStore } from '@/stores/useAuthStore'

const deferred = <T>() => {
	let resolve!: (value: T) => void
	let reject!: (reason: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
const response = () => ({
	data: { success: true, data: { accessToken: 'renewed-access', refreshToken: 'renewed-refresh' } },
	status: 200,
	statusText: 'OK',
	headers: {},
	config: { headers: new AxiosHeaders() },
})

describe('shared auth refresh', () => {
	beforeEach(() => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		useAuthStore.getState().setAuth('expired-access', 'original-refresh')
	})
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllEnvs()
	})

	it('동시 요청은 제한 시간 있는 refresh 한 번을 공유하고 늦은 401도 같은 갱신 결과를 사용한다', async () => {
		const pending = deferred<ReturnType<typeof response>>()
		const post = vi.spyOn(axios, 'post').mockReturnValue(pending.promise)
		const first = refreshAccessToken('expired-access')
		const second = refreshAccessToken('expired-access')
		await Promise.resolve()
		expect(post).toHaveBeenCalledExactlyOnceWith(
			'https://api.example.com/api/v1/auth/refresh',
			{ refreshToken: 'original-refresh' },
			expect.objectContaining({ timeout: 10000, signal: expect.any(AbortSignal) })
		)
		pending.resolve(response())
		await expect(Promise.all([first, second])).resolves.toEqual(['renewed-access', 'renewed-access'])
		await expect(refreshAccessToken('expired-access')).resolves.toBe('renewed-access')
		expect(post).toHaveBeenCalledTimes(1)
		expect(useAuthStore.getState().refreshToken).toBe('renewed-refresh')
	})

	it('공유 갱신은 같은 세션으로 유지하고 직접 토큰 변경·로그아웃만 세션 경계를 알린다', async () => {
		const changed = vi.fn()
		const unsubscribe = subscribeAuthSessionChange(changed)
		try {
			vi.spyOn(axios, 'post').mockResolvedValueOnce(response())
			await refreshAccessToken('expired-access')
			expect(changed).not.toHaveBeenCalled()
			useAuthStore.getState().setAuth('account-b-access', 'account-b-refresh')
			expect(changed).toHaveBeenCalledTimes(1)
			useAuthStore.getState().clearAuth()
			expect(changed).toHaveBeenCalledTimes(2)
			unsubscribe()
			useAuthStore.getState().setAuth('account-c-access', 'account-c-refresh')
			expect(changed).toHaveBeenCalledTimes(2)
		} finally {
			unsubscribe()
		}
	})

	it('갱신 커밋 중 발생한 직접 계정 변경도 정상 토큰 회전으로 오인하지 않는다', async () => {
		vi.spyOn(axios, 'post').mockResolvedValueOnce(response())
		const changed = vi.fn()
		const stopBoundary = subscribeAuthSessionChange(changed)
		const stopStore = useAuthStore.subscribe(state => {
			if (state.accessToken === 'renewed-access') {
				state.setAuth('account-b-access', 'account-b-refresh')
			}
		})
		try {
			await expect(refreshAccessToken('expired-access')).rejects.toMatchObject({ name: 'AbortError' })
			expect(changed).toHaveBeenCalledTimes(1)
			expect(useAuthStore.getState().accessToken).toBe('account-b-access')
			await expect(refreshAccessToken('expired-access')).rejects.toMatchObject({ name: 'AbortError' })
			expect(axios.post).toHaveBeenCalledTimes(1)
		} finally {
			stopBoundary()
			stopStore()
		}
	})

	it('로그아웃 뒤 도착한 갱신 응답은 인증 상태를 되살리지 않는다', async () => {
		const pending = deferred<ReturnType<typeof response>>()
		const post = vi.spyOn(axios, 'post').mockReturnValue(pending.promise)
		const request = refreshAccessToken('expired-access')
		const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
		await Promise.resolve()
		useAuthStore.getState().clearAuth()
		expect(post.mock.calls[0][2]?.signal?.aborted).toBe(true)
		pending.resolve(response())
		await rejected
		expect(useAuthStore.getState()).toMatchObject({ accessToken: null, refreshToken: null })
	})

	it('갱신 중 새 계정으로 로그인하면 이전 응답이 새 계정을 덮어쓰지 않는다', async () => {
		const pending = deferred<ReturnType<typeof response>>()
		vi.spyOn(axios, 'post').mockReturnValue(pending.promise)
		const rejected = expect(refreshAccessToken('expired-access')).rejects.toMatchObject({ name: 'AbortError' })
		await Promise.resolve()
		useAuthStore.getState().setAuth('other-user-access', 'other-user-refresh')
		pending.resolve(response())
		await rejected
		expect(useAuthStore.getState().accessToken).toBe('other-user-access')
	})

	it('로그아웃 후 같은 문자열의 토큰으로 로그인해도 이전 세션 응답은 거부한다', async () => {
		const pending = deferred<ReturnType<typeof response>>()
		vi.spyOn(axios, 'post').mockReturnValue(pending.promise)
		const rejected = expect(refreshAccessToken('expired-access')).rejects.toMatchObject({ name: 'AbortError' })
		await Promise.resolve()
		useAuthStore.getState().clearAuth()
		useAuthStore.getState().setAuth('expired-access', 'original-refresh')
		pending.resolve(response())
		await rejected
		expect(useAuthStore.getState().accessToken).toBe('expired-access')
	})

	it('개별 SSE 취소는 함께 기다리는 API 갱신을 취소하지 않는다', async () => {
		const pending = deferred<ReturnType<typeof response>>()
		const post = vi.spyOn(axios, 'post').mockReturnValue(pending.promise)
		const controller = new AbortController()
		const cancelled = refreshAccessToken('expired-access', controller.signal)
		const continued = refreshAccessToken('expired-access')
		const rejected = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
		await Promise.resolve()
		controller.abort()
		await rejected
		expect(post.mock.calls[0][2]?.signal?.aborted).toBe(false)
		pending.resolve(response())
		await expect(continued).resolves.toBe('renewed-access')
		expect(post).toHaveBeenCalledTimes(1)
	})

	it('이미 취소된 추적 요청은 갱신하지 않는다', async () => {
		const post = vi.spyOn(axios, 'post')
		const controller = new AbortController()
		controller.abort()
		await expect(refreshAccessToken('expired-access', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
		expect(post).not.toHaveBeenCalled()
	})

	it('다른 로그인에서 온 새 토큰을 이전 요청에 재사용하지 않는다', async () => {
		const post = vi.spyOn(axios, 'post')
		useAuthStore.getState().setAuth('other-user-access', 'other-user-refresh')
		await expect(refreshAccessToken('expired-access')).rejects.toMatchObject({ name: 'AbortError' })
		expect(post).not.toHaveBeenCalled()
	})

	it('실패·잘못된 토큰 응답으로 기존 인증을 덮어쓰지 않는다', async () => {
		const post = vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('refresh failed'))
		await expect(refreshAccessToken('expired-access')).rejects.toThrow('refresh failed')
		post.mockResolvedValueOnce({ ...response(), data: { success: true, data: { accessToken: '', refreshToken: 'value' } } })
		await expect(refreshAccessToken('expired-access')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' })
		expect(useAuthStore.getState().accessToken).toBe('expired-access')
	})
})
