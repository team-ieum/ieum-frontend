import { useMutation } from '@tanstack/react-query'
import { resetPassword } from '@/api/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ResetPasswordRequest } from '@/types/auth'

export const useResetPasswordMutation = () =>
	useMutation({
		mutationFn: async (body: ResetPasswordRequest) => {
			const initiatingAuth = useAuthStore.getState()
			const response = await resetPassword(body)
			const currentAuth = useAuthStore.getState()
			// 화면이 사라져도 완료된 요청의 로그인 정보를 정리하되, 새 로그인은 보존한다.
			if (
				currentAuth.accessToken === initiatingAuth.accessToken &&
				currentAuth.refreshToken === initiatingAuth.refreshToken
			) {
				currentAuth.clearAuth()
			}
			return response
		},
		retry: false,
	})
