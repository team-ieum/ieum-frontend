import { useCallback } from 'react'
import { getBrandConfig } from '@/constants/integration/brandConfig'
import {
	isValidWebhookUrl,
	WEBHOOK_CONNECT_CONFIG,
	type WebhookConnectServiceId,
	webhookServiceIdToProvider,
} from '@/constants/integration/webhookCredentialConnect'
import { useCreateWebhookCredentialMutation } from '@/hooks/webhookCredentials/mutations/useCreateWebhookCredentialMutation'
import { useModalStore } from '@/stores/useModalStore'
import { isApiError } from '@/utils/ApiError'

export type WebhookCredentialFormValues = {
	displayName: string
	webhookUrl: string
	defaultChannel: string
}

export const useWebhookCredentialConnect = (serviceId: WebhookConnectServiceId, onClose: () => void) => {
	const brand = getBrandConfig(WEBHOOK_CONNECT_CONFIG[serviceId].brand)
	const openAlert = useModalStore(state => state.open)
	const { mutateAsync, isPending } = useCreateWebhookCredentialMutation()

	const onSubmit = useCallback(
		async (values: WebhookCredentialFormValues) => {
			const trimmedName = values.displayName.trim()
			const trimmedUrl = values.webhookUrl.trim()
			const trimmedChannel = values.defaultChannel.trim()

			if (!trimmedName) {
				openAlert('입력 확인', '표시 이름을 입력해 주세요.')
				return
			}

			if (!isValidWebhookUrl(trimmedUrl, serviceId)) {
				openAlert(
					'입력 확인',
					serviceId === 'slack'
						? 'Slack Webhook URL은 https://hooks.slack.com/services/... 형식이어야 합니다.'
						: 'Discord Webhook URL은 https://discord.com/api/webhooks/... 형식이어야 합니다.'
				)
				return
			}

			try {
				await mutateAsync({
					provider: webhookServiceIdToProvider(serviceId),
					displayName: trimmedName,
					webhookUrl: trimmedUrl,
					...(trimmedChannel ? { defaultChannel: trimmedChannel } : {}),
				})
				openAlert('연동 완료', `${brand.label} 웹훅이 연결되었습니다.`)
				onClose()
			} catch (error) {
				if (isApiError(error)) {
					openAlert('연동 실패', error.message)
					return
				}
				openAlert('연동 실패', '웹훅을 등록하지 못했습니다.')
			}
		},
		[brand.label, mutateAsync, onClose, openAlert, serviceId]
	)

	return { onSubmit, isPending }
}
