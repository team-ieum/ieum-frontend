import { useCallback, useEffect, useRef } from 'react'
import { OAUTH_DISCONNECT_BY_PROVIDER } from '@/constants/integration/integrationProviders'
import { useDeleteOAuthConnectionMutation } from '@/hooks/oauthConnections/mutations/useDeleteOAuthConnectionMutation'
import { useDeleteWebhookCredentialMutation } from '@/hooks/webhookCredentials/mutations/useDeleteWebhookCredentialMutation'
import { useModalStore } from '@/stores/useModalStore'
import type { IntegrationService } from '@/types/integration'
import { isApiError } from '@/utils/ApiError'
import { canDisconnectIntegrationService } from '@/utils/integration/canDisconnectIntegrationService'

type UseIntegrationDisconnectOptions = {
	service: IntegrationService | undefined
	onDisconnected: () => void
}

const buildDisconnectMessage = (service: IntegrationService): string => {
	const base = `${service.name} 연결을 해제할까요? 이 서비스를 사용하는 워크플로우가 동작하지 않을 수 있습니다.`
	const notice = service.oauthProvider ? OAUTH_DISCONNECT_BY_PROVIDER[service.oauthProvider]?.notice : undefined
	return notice ? `${base} ${notice}` : base
}

/**
 * 연결된 서비스 해제 command를 제공한다.
 * 위험 동작 확인 modal을 거쳐 웹훅 자격증명을 삭제하거나 OAuth 연결을 해제하고, 성공하면 `onDisconnected`를 호출한다.
 * 해제할 수 없는 서비스(`canDisconnect`가 false)이거나 요청이 진행 중이면 `disconnect`는 아무것도 하지 않는다.
 * 응답 전에 화면을 떠나거나 다른 서비스 상세로 바꾸면 늦은 응답으로 목록 이동이나 오류 modal을 실행하지 않는다.
 */
export const useIntegrationDisconnect = ({ service, onDisconnected }: UseIntegrationDisconnectOptions) => {
	const { mutateAsync: deleteWebhookCredential, isPending: isDeletingWebhook } = useDeleteWebhookCredentialMutation()
	const { mutateAsync: deleteOAuthConnection, isPending: isDeletingOAuth } = useDeleteOAuthConnectionMutation()
	const openConfirm = useModalStore(state => state.openConfirm)
	const openModal = useModalStore(state => state.open)
	const isDisconnecting = isDeletingWebhook || isDeletingOAuth
	const canDisconnect = service !== undefined && canDisconnectIntegrationService(service)
	const serviceId = service?.id
	// 응답이 왔을 때 요청한 서비스를 아직 보고 있는지 판정한다. 화면을 떠나면 undefined가 된다.
	// 다른 서비스 상세나 다른 화면에서 onDisconnected(목록 이동)·오류 modal이 실행되지 않게 막는다.
	const currentServiceIdRef = useRef<string | undefined>(undefined)

	useEffect(() => {
		currentServiceIdRef.current = serviceId
		return () => {
			currentServiceIdRef.current = undefined
		}
	}, [serviceId])

	const disconnect = useCallback(() => {
		if (!service || !canDisconnect || isDisconnecting) return
		const { id, origin, oauthProvider } = service

		const runDisconnect = async () => {
			try {
				if (origin === 'oauth' && oauthProvider) await deleteOAuthConnection(oauthProvider)
				else await deleteWebhookCredential(id)
				if (currentServiceIdRef.current === id) onDisconnected()
			} catch (error) {
				if (currentServiceIdRef.current !== id) return
				openModal('연결 해제 실패', isApiError(error) ? error.message : '연결을 해제하지 못했습니다. 다시 시도해주세요.')
			}
		}

		openConfirm({
			title: '연결 해제',
			message: buildDisconnectMessage(service),
			confirmText: '연결 해제',
			variant: 'danger',
			onConfirm: () => void runDisconnect(),
		})
	}, [
		canDisconnect,
		deleteOAuthConnection,
		deleteWebhookCredential,
		isDisconnecting,
		onDisconnected,
		openConfirm,
		openModal,
		service,
	])

	return { disconnect, isDisconnecting, canDisconnect }
}
