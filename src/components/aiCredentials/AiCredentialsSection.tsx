import { INTEGRATION_PAGE_X } from '@/constants/integration/layout'
import { useAiCredentials } from '@/hooks/aiCredentials/useAiCredentials'
import IntegrationSectionHeading from '@/components/integration/IntegrationSectionHeading'
import { cn } from '@/utils/cn'
import { ProviderCard } from './ProviderCard'

export const AiCredentialsSection = () => {
	const { providers, registerApiKey, deleteApiKey, isPending } = useAiCredentials()

	return (
		<div className={cn('w-full border-t border-neutral-200 pt-6 pb-14', INTEGRATION_PAGE_X)}>
			<IntegrationSectionHeading
				label='AI 자격 증명'
				count={providers.length}
				desc='각 프로바이더에 대해 API Key 또는 OAuth 중 한 가지 방식을 선택하세요.'
			/>

			<div className='mt-3.5 flex flex-col gap-4'>
				{providers.map(provider => (
					<ProviderCard
						key={provider.id}
						provider={provider}
						onRegisterApiKey={key => registerApiKey(provider.id, key)}
						onDeleteApiKey={() => deleteApiKey(provider.id)}
						onConnectOAuth={() => {}}
						onDisconnectOAuth={() => {}}
						isPending={isPending}
					/>
				))}
			</div>
		</div>
	)
}
