import type { ReactElement } from 'react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import type { IntegrationDetailResolution } from '@/types/integration'
import type { AsyncResourceState } from '@/types/asyncResource'

type IntegrationDetailAsyncStateProps = {
	resolution: Exclude<IntegrationDetailResolution, 'list' | 'ready'>
	webhookResource: AsyncResourceState
	oauthResource: AsyncResourceState
}

type DetailFailure = {
	label: string
	retry: AsyncResourceState['retry']
}

const getDetailFailures = (webhookResource: AsyncResourceState, oauthResource: AsyncResourceState): DetailFailure[] =>
	[
		webhookResource.isLoadingError || webhookResource.isRefetchError
			? { label: '웹훅 연결', retry: webhookResource.retry }
			: null,
		oauthResource.isLoadingError || oauthResource.isRefetchError ? { label: 'OAuth 연결', retry: oauthResource.retry } : null,
	].filter((failure): failure is DetailFailure => failure !== null)

const IntegrationDetailAsyncState = ({
	resolution,
	webhookResource,
	oauthResource,
}: IntegrationDetailAsyncStateProps): ReactElement => {
	if (resolution === 'loading') {
		return (
			<div
				role='status'
				aria-label='서비스 상세 정보 불러오는 중'
				aria-busy='true'
				className='flex flex-col gap-4 rounded-brand-md border border-neutral-200 bg-neutral-white px-6 py-5'
			>
				<SkeletonPulse className='h-4 w-32 rounded bg-neutral-200' />
				<SkeletonPulse className='h-12 w-full rounded-brand-sm bg-neutral-200' />
				<SkeletonPulse className='h-24 w-full rounded-brand-sm bg-neutral-200' />
			</div>
		)
	}

	const failures = getDetailFailures(webhookResource, oauthResource)
	const isRetrying = webhookResource.isRefetching || oauthResource.isRefetching

	return (
		<div role='status' aria-busy={isRetrying} className='rounded-brand-md border border-danger-200 bg-danger-50 px-6 py-5'>
			<p className='m-0 typo-body2_semibold text-danger-700'>서비스 정보를 확인하지 못했습니다.</p>
			<p className='mt-1 mb-0 typo-body3_regular text-neutral-500'>연결 상태를 다시 확인해 주세요.</p>
			<div className='mt-4 flex flex-wrap gap-2'>
				{failures.map(failure => (
					<button
						key={failure.label}
						type='button'
						onClick={failure.retry}
						className='rounded-brand-sm border border-danger-300 bg-neutral-white px-3 py-1.5 typo-caption1_semibold text-danger-700'
					>
						{failure.label} 다시 시도
					</button>
				))}
			</div>
		</div>
	)
}

export default IntegrationDetailAsyncState
