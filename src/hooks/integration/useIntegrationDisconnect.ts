import { useCallback } from 'react'
import { useDeleteWebhookCredentialMutation } from '@/hooks/webhookCredentials/mutations/useDeleteWebhookCredentialMutation'
import { useModalStore } from '@/stores/useModalStore'
import type { IntegrationService } from '@/types/integration'

type UseIntegrationDisconnectOptions = {
	service: IntegrationService | undefined
	onDisconnected: () => void
}

/**
 * 연결된 서비스 해제 command를 제공한다.
 * 위험 동작 확인 modal을 거쳐 webhook credential을 삭제하고, 성공하면 `onDisconnected`를 호출한다.
 * 삭제 요청이 진행 중이거나 service가 없으면 `disconnect`는 아무것도 하지 않는다.
 */
export const useIntegrationDisconnect = ({ service, onDisconnected }: UseIntegrationDisconnectOptions) => {
	const { mutate: deleteWebhookCredential, isPending: isDisconnecting } = useDeleteWebhookCredentialMutation()
	const openConfirm = useModalStore(state => state.openConfirm)

	const disconnect = useCallback(() => {
		if (!service || isDisconnecting) return
		const serviceId = service.id
		openConfirm({
			title: '연결 해제',
			message: `${service.name} 연결을 해제할까요? 이 서비스를 사용하는 워크플로우가 동작하지 않을 수 있습니다.`,
			confirmText: '연결 해제',
			variant: 'danger',
			onConfirm: () => deleteWebhookCredential(serviceId, { onSuccess: onDisconnected }),
		})
	}, [deleteWebhookCredential, isDisconnecting, onDisconnected, openConfirm, service])

	return { disconnect, isDisconnecting }
}
