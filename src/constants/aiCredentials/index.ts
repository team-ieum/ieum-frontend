import type { CredentialProvider } from '@/types/credential'

type ProviderVisual = { brand: string; tint: string }

export const PROVIDER_VISUAL: Record<CredentialProvider, ProviderVisual> = {
	OPENAI: { brand: '#10A37F', tint: '#E6F4EE' },
	CLAUDE: { brand: '#D97757', tint: '#FAEEE6' },
	GEMINI: { brand: '#4285F4', tint: '#E8F0FE' },
}

export const PROVIDER_DISPLAY_NAME: Record<CredentialProvider, string> = {
	OPENAI: 'OpenAI',
	CLAUDE: 'Claude',
	GEMINI: 'Gemini',
}
