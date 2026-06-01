import { useAiCredentials } from '@/hooks/aiCredentials/useAiCredentials'
import { ProviderCard } from './ProviderCard'

export const AiCredentialsSection = () => {
	const { providers, registerApiKey, deleteApiKey, connectOAuth, disconnectOAuth, isPending } = useAiCredentials()

	return (
		<div className='mx-auto max-w-[1100px] px-8 pb-14 pt-7'>
			{/* Section header */}
			<div className='mb-3.5 flex items-baseline justify-between'>
				<div className='flex items-baseline gap-2.5'>
					<h2 className='typo-title2_bold text-neutral-900'>AI 자격 증명</h2>
					<span className='typo-body3_regular text-neutral-500'>
						각 프로바이더에 대해 API Key 또는 OAuth 중 한 가지 방식을 선택하세요.
					</span>
				</div>
			</div>

			{/* Provider cards */}
			<div className='flex flex-col gap-4'>
				{providers.map(provider => (
					<ProviderCard
						key={provider.id}
						provider={provider}
						onRegisterApiKey={key => registerApiKey(provider.id, key)}
						onDeleteApiKey={() => deleteApiKey(provider.id)}
						onConnectOAuth={() => connectOAuth(provider.id, 'user@company.com')}
						onDisconnectOAuth={() => disconnectOAuth(provider.id)}
						isPending={isPending}
					/>
				))}
			</div>
		</div>
	)
}
