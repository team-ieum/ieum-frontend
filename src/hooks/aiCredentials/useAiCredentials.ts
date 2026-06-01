import { useMemo } from 'react'
import { PROVIDER_VISUAL } from '@/constants/aiCredentials'
import { useCredentialsQuery } from '@/hooks/aiCredentials/queries/useCredentialsQuery'
import { useProvidersQuery } from '@/hooks/aiCredentials/queries/useProvidersQuery'
import { useRegisterCredentialMutation } from '@/hooks/aiCredentials/mutations/useRegisterCredentialMutation'
import { useDeleteCredentialMutation } from '@/hooks/aiCredentials/mutations/useDeleteCredentialMutation'
import { useModalStore } from '@/stores/useModalStore'
import { isApiError } from '@/utils/ApiError'
import type { CredentialProvider } from '@/types/credential'
import type { AiProvider, AuthMethod } from '@/types/aiCredentials'

const isProviderConnected = (p: AiProvider) => Object.values(p.state).some(s => s?.status === 'connected')

export function useAiCredentials() {
	const openModal = useModalStore(state => state.open)
	const { data: providersData } = useProvidersQuery()
	const { data: credentialsData } = useCredentialsQuery()
	const registerMutation = useRegisterCredentialMutation()
	const deleteMutation = useDeleteCredentialMutation()

	const providers = useMemo<AiProvider[]>(() => {
		const providerInfoList = providersData?.data.providers ?? []
		const credentials = credentialsData?.data ?? []
		return providerInfoList.map(info => {
			const visual = PROVIDER_VISUAL[info.provider] ?? { brand: '#888888', tint: '#eeeeee' }
			const methods = info.credentialTypes.map(t => (t === 'API_KEY' ? 'apikey' : 'oauth')) as AuthMethod[]
			const desc = info.models.map(m => m.displayName).join(' · ')
			const apiKeyItem = credentials.find(c => c.provider === info.provider && c.credentialType === 'API_KEY')
			const oauthItem = credentials.find(c => c.provider === info.provider && c.credentialType === 'OAUTH')
			return {
				id: info.provider,
				name: info.displayName,
				desc,
				methods,
				...visual,
				state: {
					...(methods.includes('apikey')
						? {
								apikey: apiKeyItem
									? { status: 'connected' as const, credentialId: apiKeyItem.id, keyHint: apiKeyItem.keyHint }
									: { status: 'empty' as const },
							}
						: {}),
					...(methods.includes('oauth')
						? {
								oauth: oauthItem
									? { status: 'connected' as const, account: oauthItem.displayName }
									: { status: 'empty' as const },
							}
						: {}),
				},
			}
		})
	}, [providersData, credentialsData])

	const connectedCount = providers.filter(isProviderConnected).length

	const registerApiKey = async (providerId: CredentialProvider, key: string) => {
		const provider = providers.find(p => p.id === providerId)
		if (!provider) return
		try {
			await registerMutation.mutateAsync({
				provider: providerId,
				credentialType: 'API_KEY',
				displayName: `${provider.name} API Key`,
				apiKey: key,
			})
		} catch (error) {
			if (isApiError(error)) {
				openModal('등록 오류', error.message)
			} else {
				openModal('등록 오류', 'API 키 등록에 실패했어요. 다시 시도해주세요.')
			}
		}
	}

	const deleteApiKey = async (providerId: string) => {
		const provider = providers.find(p => p.id === providerId)
		const credentialId = provider?.state.apikey?.credentialId
		if (!credentialId) return
		try {
			await deleteMutation.mutateAsync(credentialId)
		} catch (error) {
			if (isApiError(error)) {
				openModal('삭제 오류', error.message)
			} else {
				openModal('삭제 오류', 'API 키 삭제에 실패했어요. 다시 시도해주세요.')
			}
		}
	}

	return {
		providers,
		connectedCount,
		registerApiKey,
		deleteApiKey,
		isPending: registerMutation.isPending || deleteMutation.isPending,
	}
}
