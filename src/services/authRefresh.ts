import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'
import { ApiError } from '@/utils/ApiError'

type RefreshFlight = {
	epoch: number
	accessToken: string
	refreshToken: string
	controller: AbortController
	committing: { accessToken: string; refreshToken: string } | null
	promise: Promise<string>
}

const sessionChangeListeners = new Set<() => void>()

/** Shared refresh rotation keeps the session; logout and manual token replacement end it. */
export const subscribeAuthSessionChange = (listener: () => void): (() => void) => {
	sessionChangeListeners.add(listener)
	return () => sessionChangeListeners.delete(listener)
}

let authEpoch = 0
let flight: RefreshFlight | null = null
let lastRenewal: { previousAccessToken: string; accessToken: string; epoch: number } | null = null

const cancelled = () => new DOMException('인증 상태가 변경되어 토큰 갱신을 취소했어요.', 'AbortError')

useAuthStore.subscribe((state, previous) => {
	if (state.accessToken === previous.accessToken && state.refreshToken === previous.refreshToken) return
	authEpoch++
	const rotation = flight?.committing
	if (
		rotation &&
		previous.accessToken === flight?.accessToken &&
		previous.refreshToken === flight?.refreshToken &&
		state.accessToken === rotation.accessToken &&
		state.refreshToken === rotation.refreshToken
	)
		return
	lastRenewal = null
	const abandoned = flight
	flight = null
	abandoned?.controller.abort()
	for (const listener of sessionChangeListeners) listener()
})

const isCurrent = (request: RefreshFlight) => {
	const state = useAuthStore.getState()
	return (
		flight === request &&
		authEpoch === request.epoch &&
		!request.controller.signal.aborted &&
		state.accessToken === request.accessToken &&
		state.refreshToken === request.refreshToken
	)
}

/** Cancelling one SSE tracker must not cancel a refresh shared by unrelated API requests. */
const waitForRefresh = (promise: Promise<string>, signal?: AbortSignal): Promise<string> => {
	if (!signal) return promise
	return new Promise((resolve, reject) => {
		const abort = () => reject(cancelled())
		if (signal.aborted) {
			reject(cancelled())
			return
		}
		signal.addEventListener('abort', abort, { once: true })
		promise.then(
			token => {
				signal.removeEventListener('abort', abort)
				if (!signal.aborted) resolve(token)
			},
			error => {
				signal.removeEventListener('abort', abort)
				reject(error)
			}
		)
	})
}

/** One shared refresh contract for Axios requests and authenticated SSE GET reconnects. */
export const refreshAccessToken = (failedAccessToken: string, signal?: AbortSignal): Promise<string> => {
	if (signal?.aborted) return Promise.reject(cancelled())
	const state = useAuthStore.getState()
	if (!state.accessToken || !state.refreshToken) {
		return Promise.reject(new ApiError('TOKEN_EXPIRED', '다시 로그인해 주세요.'))
	}
	if (state.accessToken !== failedAccessToken) {
		// Reuse only a token produced by our refresh, never a subsequent login/account switch.
		if (
			lastRenewal?.previousAccessToken !== failedAccessToken ||
			lastRenewal.accessToken !== state.accessToken ||
			lastRenewal.epoch !== authEpoch
		)
			return Promise.reject(cancelled())
		return waitForRefresh(flight?.promise ?? Promise.resolve(state.accessToken), signal)
	}
	if (flight && isCurrent(flight)) return waitForRefresh(flight.promise, signal)

	const request: RefreshFlight = {
		epoch: authEpoch,
		accessToken: state.accessToken,
		refreshToken: state.refreshToken,
		controller: new AbortController(),
		committing: null,
		promise: Promise.resolve()
			.then(async () => {
				if (!isCurrent(request)) throw cancelled()
				try {
					// Plain Axios avoids the response interceptor recursively refreshing the refresh request.
					const response = await axios.post(
						`${import.meta.env.VITE_API_URL}/api/v1/auth/refresh`,
						{ refreshToken: request.refreshToken },
						{ timeout: 10000, signal: request.controller.signal }
					)
					if (!isCurrent(request)) throw cancelled()
					const tokens = response.data?.data
					if (
						response.data?.success === false ||
						typeof tokens?.accessToken !== 'string' ||
						!tokens.accessToken.trim() ||
						typeof tokens?.refreshToken !== 'string' ||
						!tokens.refreshToken.trim()
					) {
						throw new ApiError('TOKEN_EXPIRED', '토큰을 갱신하지 못했어요. 다시 로그인해 주세요.')
					}
					request.committing = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
					try {
						useAuthStore.getState().setAuth(tokens.accessToken, tokens.refreshToken)
					} finally {
						request.committing = null
					}
					const current = useAuthStore.getState()
					if (
						flight !== request ||
						request.controller.signal.aborted ||
						current.accessToken !== tokens.accessToken ||
						current.refreshToken !== tokens.refreshToken
					)
						throw cancelled()
					lastRenewal = { previousAccessToken: request.accessToken, accessToken: tokens.accessToken, epoch: authEpoch }
					return tokens.accessToken
				} catch (error) {
					if (!isCurrent(request)) throw cancelled()
					throw error
				}
			})
			.finally(() => {
				if (flight === request) flight = null
			}),
	}
	flight = request
	return waitForRefresh(request.promise, signal)
}
