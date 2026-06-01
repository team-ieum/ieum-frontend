import { useCallback, useState } from 'react'
import { isWebhookConnectServiceId, type WebhookConnectServiceId } from '@/constants/integration/webhookCredentialConnect'
import { fetchIntegrationOAuthAuthorizeUrl } from '@/api/integrationOAuth'
import { useModalStore } from '@/stores/useModalStore'
import { isApiError } from '@/utils/ApiError'
import { resolveOAuthRedirectUrl } from '@/utils/integration/resolveOAuthRedirectUrl'

export const useIntegrationConnect = () => {
	const [connectingId, setConnectingId] = useState<string | null>(null)
	const [webhookConnectServiceId, setWebhookConnectServiceId] = useState<WebhookConnectServiceId | null>(null)
	const openModal = useModalStore(state => state.open)

	const closeWebhookConnect = useCallback(() => {
		setWebhookConnectServiceId(null)
		setConnectingId(null)
	}, [])

	const connect = useCallback(
		async (serviceId: string) => {
			setConnectingId(serviceId)

			if (isWebhookConnectServiceId(serviceId)) {
				setWebhookConnectServiceId(serviceId)
				return
			}

			try {
				const url = await fetchIntegrationOAuthAuthorizeUrl(serviceId)
				if (!url) {
					setConnectingId(null)
					openModal('연결 준비 중', '이 서비스는 아직 연결할 수 없습니다.')
					return
				}
				window.location.assign(resolveOAuthRedirectUrl(url))
			} catch (error) {
				setConnectingId(null)
				if (isApiError(error)) {
					openModal('연결 실패', error.message)
					return
				}
				openModal('연결 실패', '서비스 연결을 시작할 수 없습니다.')
			}
		},
		[openModal]
	)

	return {
		connect,
		connectingId,
		isConnecting: connectingId !== null && webhookConnectServiceId === null,
		webhookConnectServiceId,
		closeWebhookConnect,
	}
}
