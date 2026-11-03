import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useModalStore } from '@/stores/useModalStore'

const ProtectedRoute = () => {
	const accessToken = useAuthStore(state => state.accessToken)
	const openModal = useModalStore(state => state.open)
	const location = useLocation()
	const hasAlertedRef = useRef(false)
	// 로그인한 채 들어왔다가 토큰이 지워지면(비밀번호 변경 후 로그아웃 등) 지운 쪽이 직접 안내하므로 여기서는 알리지 않는다.
	const enteredWithTokenRef = useRef(Boolean(accessToken))

	useEffect(() => {
		if (accessToken || hasAlertedRef.current || enteredWithTokenRef.current) return

		hasAlertedRef.current = true
		openModal('로그인 필요', '로그인 이후에 이용할 수 있습니다.')
	}, [accessToken, openModal])

	if (!accessToken) {
		return <Navigate to='/auth' replace state={{ from: location.pathname }} />
	}

	return <Outlet />
}

export default ProtectedRoute
