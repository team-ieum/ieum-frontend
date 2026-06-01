import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useModalStore } from '@/stores/useModalStore'

const ProtectedRoute = () => {
	const accessToken = useAuthStore(state => state.accessToken)
	const openModal = useModalStore(state => state.open)
	const location = useLocation()
	const hasAlertedRef = useRef(false)

	useEffect(() => {
		if (accessToken || hasAlertedRef.current) return

		hasAlertedRef.current = true
		openModal('로그인 필요', '로그인 이후에 이용할 수 있습니다.')
	}, [accessToken, openModal])

	if (!accessToken) {
		return <Navigate to='/auth' replace state={{ from: location.pathname }} />
	}

	return <Outlet />
}

export default ProtectedRoute
