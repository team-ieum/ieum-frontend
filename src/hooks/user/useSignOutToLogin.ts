import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useAuthMode } from '@/stores/useAuthMode'
import { useAuthStore } from '@/stores/useAuthStore'
import { useModalStore } from '@/stores/useModalStore'

/**
 * 서버가 세션을 끊은 뒤(비밀번호 변경·회원 탈퇴) 남은 토큰과 이전 계정의 cache를 지우고 로그인 화면으로 보낸 뒤 안내한다.
 * 보호 route가 토큰 삭제를 먼저 보지 않도록 로그인 화면으로 이동을 마친 뒤 토큰을 지운다.
 */
export const useSignOutToLogin = () => {
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	return async (notice: { title: string; message: string }) => {
		await navigate('/auth', { replace: true })
		useAuthStore.getState().clearAuth()
		useAuthMode.getState().toLogin()
		queryClient.clear()
		useModalStore.getState().open(notice.title, notice.message)
	}
}
