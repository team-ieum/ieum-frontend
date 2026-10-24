import { act, renderHook } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useResetPasswordMutation } from '@/hooks/auth/mutations/useResetPasswordMutation'
import { useAuthStore } from '@/stores/useAuthStore'
import { LOCAL_STORAGE_KEY } from '@/constants/key'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import type { AuthActionResponse, ResetPasswordRequest } from '@/types/auth'

const { resetPasswordMock } = vi.hoisted(() => ({
	resetPasswordMock: vi.fn<(body: ResetPasswordRequest) => Promise<AuthActionResponse>>(),
}))
vi.mock('@/api/auth', () => ({ resetPassword: resetPasswordMock }))
afterEach(() => {
	resetPasswordMock.mockReset()
	useAuthStore.getState().clearAuth()
})
const body = { email: 'user@example.com', newPassword: 'NewPassw0rd!' }
const success = { success: true, code: 'OK', message: 'ok' }
const renderMutation = () => {
	const client = createTestQueryClient()
	return renderHook(useResetPasswordMutation, {
		wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
	})
}
const deferResponse = () => {
	let finish!: (response: AuthActionResponse) => void
	resetPasswordMock.mockReturnValue(
		new Promise<AuthActionResponse>(resolve => {
			finish = resolve
		})
	)
	return () => finish(success)
}

describe('비밀번호 재설정 완료 시 로그인 정보 정리', () => {
	it('화면이 해제된 후에도 성공한 요청의 기존 로그인 정보를 지운다', async () => {
		const finish = deferResponse()
		useAuthStore.getState().setAuth('old-access', 'old-refresh')
		const hook = renderMutation()
		let pending!: Promise<AuthActionResponse>
		await act(async () => {
			pending = hook.result.current.mutateAsync(body)
		})
		expect(resetPasswordMock).toHaveBeenCalledWith(body)
		hook.unmount()
		await act(async () => {
			finish()
			await pending
		})
		expect(useAuthStore.getState().accessToken).toBeNull()
		expect(useAuthStore.getState().refreshToken).toBeNull()
		expect(localStorage.getItem(LOCAL_STORAGE_KEY.ACCESS_TOKEN)).toBeNull()
		expect(localStorage.getItem(LOCAL_STORAGE_KEY.REFRESH_TOKEN)).toBeNull()
	})
	it.each([
		['new-access', 'new-refresh'],
		['old-access', 'new-refresh'],
		['new-access', 'old-refresh'],
	])('응답 전에 변경된 로그인 정보 %s·%s는 보존한다', async (accessToken, refreshToken) => {
		const finish = deferResponse()
		useAuthStore.getState().setAuth('old-access', 'old-refresh')
		const hook = renderMutation()
		let pending!: Promise<AuthActionResponse>
		await act(async () => {
			pending = hook.result.current.mutateAsync(body)
		})
		useAuthStore.getState().setAuth(accessToken, refreshToken)
		await act(async () => {
			finish()
			await pending
		})
		expect(useAuthStore.getState().accessToken).toBe(accessToken)
		expect(useAuthStore.getState().refreshToken).toBe(refreshToken)
		expect(localStorage.getItem(LOCAL_STORAGE_KEY.ACCESS_TOKEN)).toBe(accessToken)
	})
	it('비로그인 상태에서 시작한 요청은 이후 생성된 로그인 정보를 지우지 않는다', async () => {
		const finish = deferResponse()
		useAuthStore.getState().clearAuth()
		const hook = renderMutation()
		let pending!: Promise<AuthActionResponse>
		await act(async () => {
			pending = hook.result.current.mutateAsync(body)
		})
		useAuthStore.getState().setAuth('new-access', 'new-refresh')
		await act(async () => {
			finish()
			await pending
		})
		expect(useAuthStore.getState().accessToken).toBe('new-access')
	})
	it('재설정이 실패하면 기존 로그인 정보를 유지한다', async () => {
		resetPasswordMock.mockRejectedValue(new Error('network failure'))
		useAuthStore.getState().setAuth('old-access', 'old-refresh')
		const hook = renderMutation()
		await act(async () => {
			await expect(hook.result.current.mutateAsync(body)).rejects.toThrow('network failure')
		})
		expect(useAuthStore.getState().accessToken).toBe('old-access')
		expect(useAuthStore.getState().refreshToken).toBe('old-refresh')
	})
})
