import WebhookCredentialConnectModal from '@/components/integration/WebhookCredentialConnectModal'
import { useWebhookCredentialConnect } from '@/hooks/integration/useWebhookCredentialConnect'
import type { WebhookConnectServiceId } from '@/constants/integration/webhookCredentialConnect'

type WebhookCredentialConnectModalContainerProps = {
	serviceId: WebhookConnectServiceId
	onClose: () => void
}

const WebhookCredentialConnectModalContainer = ({ serviceId, onClose }: WebhookCredentialConnectModalContainerProps) => {
	const { onSubmit, isPending } = useWebhookCredentialConnect(serviceId, onClose)

	return <WebhookCredentialConnectModal serviceId={serviceId} onClose={onClose} onSubmit={onSubmit} isPending={isPending} />
}

export default WebhookCredentialConnectModalContainer
