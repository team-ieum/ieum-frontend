import type { CredentialProvider } from '@/types/credential'
import type { IntegrationTabItem } from '@/types/aiCredentials'

type ProviderVisual = { brand: string; tint: string }

export const PROVIDER_VISUAL: Record<CredentialProvider, ProviderVisual> = {
	OPENAI: { brand: '#10A37F', tint: '#E6F4EE' },
	CLAUDE: { brand: '#D97757', tint: '#FAEEE6' },
	GEMINI: { brand: '#4285F4', tint: '#E8F0FE' },
}

export const INTEGRATION_TABS: IntegrationTabItem[] = [
	{ id: 'connected', label: '연결된 서비스', icon: 'cable' },
	{ id: 'ai-creds', label: 'AI 자격 증명', icon: 'vpn_key' },
	{ id: 'browser', label: '통합 모듈 브라우저', icon: 'travel_explore' },
]
