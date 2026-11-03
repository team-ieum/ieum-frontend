import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { useValidatedLoginForm } from '@/hooks/auth/useValidatedLoginForm'
import { currentUserResponse } from '@/mocks/fixtures/user'
import { server } from '@/mocks/server'
import { useAuthStore } from '@/stores/useAuthStore'
import { createTestQueryClient } from '@/test/createTestQueryClient'

describe('useValidatedLoginForm', () => {
	it('로그인에 성공하면 이전 계정의 내 정보 cache를 지운다', async () => {
		server.use(
			http.post('*/api/v1/auth/login', () =>
				HttpResponse.json({
					success: true,
					data: { accessToken: 'b-access', refreshToken: 'b-refresh', expiresIn: 1800 },
					message: 'success',
					code: 'SUCCESS',
				})
			)
		)
		const queryClient = createTestQueryClient()
		// 계정 A로 /user를 조회해 둔 상태다.
		queryClient.setQueryData(queryKeys.users.me(), currentUserResponse)
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>{children}</MemoryRouter>
			</QueryClientProvider>
		)
		const { result } = renderHook(() => useValidatedLoginForm(), { wrapper })

		act(() => {
			result.current.handleChange('email', 'b@example.com')
			result.current.handleChange('password', 'Password1!')
		})
		await act(() => result.current.handleSubmit({ preventDefault: () => {} } as never))

		await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('b-access'))
		expect(queryClient.getQueryData(queryKeys.users.me())).toBeUndefined()
	})
})
