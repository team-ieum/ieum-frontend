import { INTEGRATION_PAGE_X } from '@/constants/integration/layout'
import { useAiCredentials } from '@/hooks/aiCredentials/useAiCredentials'
import IntegrationSectionHeading from '@/components/integration/IntegrationSectionHeading'
import { cn } from '@/utils/cn'
import { ProviderCard } from './ProviderCard'
import { AiCredentialsError, AiCredentialsRefreshFeedback, AiCredentialsSkeleton } from './AiCredentialsAsyncState'

export const AiCredentialsSection = () => {
	const { providers, registerApiKey, deleteApiKey, isPending, providersResource, credentialsResource } = useAiCredentials()
	const isBusy =
		providersResource.isLoading ||
		credentialsResource.isLoading ||
		providersResource.isRefetching ||
		credentialsResource.isRefetching

	return (
		<div className={cn('w-full border-t border-neutral-200 pt-6 pb-14', INTEGRATION_PAGE_X)} aria-busy={isBusy}>
			<IntegrationSectionHeading
				label='AI 자격 증명'
				count={providers.length}
				desc='각 프로바이더에 대해 API Key 또는 OAuth 중 한 가지 방식을 선택하세요.'
				isCountPending={providersResource.isLoading || providersResource.isLoadingError}
			/>
			<AiCredentialsRefreshFeedback providersResource={providersResource} credentialsResource={credentialsResource} />

			<div className='mt-3.5 flex flex-col gap-4'>
				{providersResource.isLoading ? (
					<AiCredentialsSkeleton />
				) : providersResource.isLoadingError ? (
					<AiCredentialsError message='AI 제공자 정보를 불러오지 못했습니다.' retry={providersResource.retry} />
				) : providers.length === 0 ? (
					<div className='flex min-h-[164px] items-center justify-center rounded-brand-md border border-neutral-200 bg-neutral-white px-6 text-center'>
						<p className='m-0 typo-body3_regular text-neutral-500'>등록 가능한 AI 제공자가 없습니다.</p>
					</div>
				) : credentialsResource.isLoading ? (
					<AiCredentialsSkeleton count={providers.length} />
				) : credentialsResource.isLoadingError ? (
					<AiCredentialsError message='AI 자격 증명을 불러오지 못했습니다.' retry={credentialsResource.retry} />
				) : (
					providers.map(provider => (
						<ProviderCard
							key={provider.id}
							provider={provider}
							onRegisterApiKey={key => registerApiKey(provider.id, key)}
							onDeleteApiKey={() => deleteApiKey(provider.id)}
							onConnectOAuth={() => {}}
							onDisconnectOAuth={() => {}}
							isPending={isPending}
						/>
					))
				)}
			</div>
		</div>
	)
}
