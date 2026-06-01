import { useState } from 'react'
import { AI_PROVIDERS } from '@/constants/aiCredentials'
import type { AiProvider } from '@/types/aiCredentials'

const isProviderConnected = (p: AiProvider) => Object.values(p.state).some(s => s?.status === 'connected')

export function useAiCredentials() {
	const [providers, setProviders] = useState<AiProvider[]>(AI_PROVIDERS)

	const connectedCount = providers.filter(isProviderConnected).length

	const registerApiKey = (providerId: string, key: string) => {
		setProviders(prev =>
			prev.map(p => {
				if (p.id !== providerId || !p.state.apikey) return p
				const masked =
					key.length > 12
						? key.slice(0, 8) + '••••••••••••••••••••' + key.slice(-4)
						: key.slice(0, 4) + '••••' + key.slice(-4)
				return {
					...p,
					state: {
						...p.state,
						apikey: { status: 'connected', masked },
					},
				}
			})
		)
	}

	const deleteApiKey = (providerId: string) => {
		setProviders(prev =>
			prev.map(p => {
				if (p.id !== providerId || !p.state.apikey) return p
				return { ...p, state: { ...p.state, apikey: { status: 'empty' } } }
			})
		)
	}

	const connectOAuth = (providerId: string, account: string) => {
		setProviders(prev =>
			prev.map(p => {
				if (p.id !== providerId || !p.state.oauth) return p
				return {
					...p,
					state: {
						...p.state,
						oauth: { status: 'connected', account },
					},
				}
			})
		)
	}

	const disconnectOAuth = (providerId: string) => {
		setProviders(prev =>
			prev.map(p => {
				if (p.id !== providerId || !p.state.oauth) return p
				return { ...p, state: { ...p.state, oauth: { status: 'empty' } } }
			})
		)
	}

	return {
		providers,
		connectedCount,
		registerApiKey,
		deleteApiKey,
		connectOAuth,
		disconnectOAuth,
	}
}
