import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { isWebhookConnectServiceId, type WebhookConnectServiceId } from '@/constants/integration/webhookCredentialConnect'
import { fetchIntegrationOAuthAuthorizeUrl } from '@/api/integrationOAuth'
import { useModalStore } from '@/stores/useModalStore'
import { isApiError } from '@/utils/ApiError'
import { resolveOAuthRedirectUrl } from '@/utils/integration/resolveOAuthRedirectUrl'

/** 현재 화면에서 마지막으로 선택한 연결 요청만 인가 화면이나 오류 안내를 열 수 있다. */
export const useIntegrationConnect = () => {
	const { key: locationKey } = useLocation()
	const activeLocationKey = useRef<string | null>(null)
	const connectRequestId = useRef(0)
	const [connectingId, setConnectingId] = useState<string | null>(null)
	const [webhookConnectServiceId, setWebhookConnectServiceId] = useState<WebhookConnectServiceId | null>(null)
	const openModal = useModalStore(state => state.open)

	useLayoutEffect(() => {
		activeLocationKey.current = locationKey
		// 인가 화면에서 뒤로 오면 브라우저가 이동 직전의 버튼 상태까지 복원한다.
		const handlePageShow = (event: PageTransitionEvent) => {
			if (!event.persisted) return
			connectRequestId.current += 1
			setConnectingId(id => (id !== null && isWebhookConnectServiceId(id) ? id : null))
		}
		window.addEventListener('pageshow', handlePageShow)
		return () => {
			window.removeEventListener('pageshow', handlePageShow)
			activeLocationKey.current = null
			connectRequestId.current += 1
			setConnectingId(null)
		}
	}, [locationKey])

	const closeWebhookConnect = useCallback(() => {
		setWebhookConnectServiceId(null)
		setConnectingId(null)
	}, [])

	const connect = useCallback(
		async (serviceId: string) => {
			// 퇴장 애니메이션 중인 이전 화면의 버튼으로 새 요청을 시작하지 않는다.
			if (activeLocationKey.current !== locationKey) return
			const requestId = ++connectRequestId.current
			setConnectingId(serviceId)

			if (isWebhookConnectServiceId(serviceId)) {
				setWebhookConnectServiceId(serviceId)
				return
			}

			try {
				const url = await fetchIntegrationOAuthAuthorizeUrl(serviceId)
				if (connectRequestId.current !== requestId) return
				if (!url) {
					setConnectingId(null)
					openModal('연결 준비 중', '이 서비스는 아직 연결할 수 없습니다.')
					return
				}
				window.location.assign(resolveOAuthRedirectUrl(url))
			} catch (error) {
				if (connectRequestId.current !== requestId) return
				setConnectingId(null)
				if (isApiError(error)) {
					openModal('연결 실패', error.message)
					return
				}
				openModal('연결 실패', '서비스 연결을 시작할 수 없습니다.')
			}
		},
		[locationKey, openModal]
	)

	return {
		connect,
		connectingId,
		isConnecting: connectingId !== null && webhookConnectServiceId === null,
		webhookConnectServiceId,
		closeWebhookConnect,
	}
}
