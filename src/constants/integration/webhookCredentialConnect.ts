import type { WebhookCredentialProvider } from '@/types/webhookCredentials'
import type { IntegrationBrand } from '@/types/integration'

export type WebhookConnectServiceId = 'slack' | 'discord'

export const WEBHOOK_CONNECT_SERVICE_IDS: WebhookConnectServiceId[] = ['slack', 'discord']

export const isWebhookConnectServiceId = (serviceId: string): serviceId is WebhookConnectServiceId =>
	WEBHOOK_CONNECT_SERVICE_IDS.includes(serviceId as WebhookConnectServiceId)

export const webhookServiceIdToProvider = (serviceId: WebhookConnectServiceId): WebhookCredentialProvider =>
	serviceId === 'slack' ? 'SLACK' : 'DISCORD'

export const isValidWebhookUrl = (url: string, serviceId: WebhookConnectServiceId): boolean => {
	try {
		const parsed = new URL(url)
		if (parsed.protocol !== 'https:') return false
		if (serviceId === 'slack') return parsed.hostname === 'hooks.slack.com'
		return parsed.hostname === 'discord.com' || parsed.hostname === 'discordapp.com'
	} catch {
		return false
	}
}

type WebhookConnectFieldHelp = {
	displayName: { label: string; placeholder: string; hint: string }
	webhookUrl: { label: string; placeholder: string; hint: string }
	defaultChannel: { label: string; placeholder: string; hint: string }
}

export type WebhookConnectConfig = {
	serviceId: WebhookConnectServiceId
	brand: IntegrationBrand
	title: string
	fields: WebhookConnectFieldHelp
}

export const WEBHOOK_CONNECT_CONFIG: Record<WebhookConnectServiceId, WebhookConnectConfig> = {
	slack: {
		serviceId: 'slack',
		brand: 'slack',
		title: 'Slack 웹훅 연결',
		fields: {
			displayName: {
				label: '표시 이름',
				placeholder: '예: IEUM 알림',
				hint: '연결된 서비스 목록에 보이는 이름입니다.',
			},
			webhookUrl: {
				label: 'Webhook URL',
				placeholder: 'https://hooks.slack.com/services/...',
				hint: 'Slack 앱 → Incoming Webhooks에서 발급한 URL 전체를 붙여넣으세요.',
			},
			defaultChannel: {
				label: '기본 채널 (선택)',
				placeholder: '예: #general',
				hint: '메시지를 보낼 채널 이름. 비워두면 웹훅에 연결된 채널을 사용합니다.',
			},
		},
	},
	discord: {
		serviceId: 'discord',
		brand: 'discord',
		title: 'Discord 웹훅 연결',
		fields: {
			displayName: {
				label: '표시 이름',
				placeholder: '예: IEUM 봇',
				hint: '연결된 서비스 목록에 보이는 이름입니다.',
			},
			webhookUrl: {
				label: 'Webhook URL',
				placeholder: 'https://discord.com/api/webhooks/...',
				hint: 'Discord 채널 설정 → 연동 → 웹후크 → 새 웹후크 → URL 복사',
			},
			defaultChannel: {
				label: '기본 채널 (선택)',
				placeholder: '예: general',
				hint: '알림을 구분할 채널 이름(표시용). 비워도 연동은 가능합니다.',
			},
		},
	},
}
