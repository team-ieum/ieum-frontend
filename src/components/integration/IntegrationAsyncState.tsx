import type { ReactElement } from 'react'
import { INTEGRATION_CARD_GRID } from '@/constants/integration/layout'
import type { AsyncResourceState } from '@/types/asyncResource'

export const IntegrationCardSkeletons = ({ count = 4 }: { count?: number }): ReactElement => (
	<div role='status' aria-label='통합 서비스 불러오는 중' className={INTEGRATION_CARD_GRID}>
		{Array.from({ length: count }, (_, index) => (
			<article
				key={index}
				aria-hidden='true'
				className='flex min-h-[148px] flex-col gap-3 rounded-brand-md border border-neutral-200 bg-neutral-white p-4'
			>
				<div className='flex items-center gap-3'>
					<div className='size-10 animate-pulse rounded-xl bg-neutral-200 motion-reduce:animate-none' />
					<div className='flex flex-1 flex-col gap-2'>
						<div className='h-4 w-24 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none' />
						<div className='h-3 w-32 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none' />
					</div>
				</div>
				<div className='mt-auto h-9 animate-pulse rounded-brand-sm bg-neutral-200 motion-reduce:animate-none' />
			</article>
		))}
	</div>
)

type IntegrationSourceErrorProps = {
	webhookResource: AsyncResourceState
	oauthResource: AsyncResourceState
}

export const IntegrationSourceError = ({ webhookResource, oauthResource }: IntegrationSourceErrorProps): ReactElement => {
	const failures = [
		webhookResource.isLoadingError ? { label: '웹훅 연결', retry: webhookResource.retry } : null,
		oauthResource.isLoadingError ? { label: 'OAuth 연결', retry: oauthResource.retry } : null,
	].filter((failure): failure is { label: string; retry: () => void } => failure !== null)

	return (
		<div className='col-span-full flex min-h-[148px] flex-col items-center justify-center rounded-brand-md border border-danger-200 bg-danger-50 px-6 text-center'>
			<p className='m-0 typo-body2_semibold text-danger-700'>연결 상태를 확인하지 못했습니다.</p>
			<p className='mt-1 mb-0 typo-body3_regular text-neutral-500'>
				확인되지 않은 서비스는 사용 가능 목록에서 제외했습니다.
			</p>
			<div className='mt-4 flex flex-wrap justify-center gap-2'>
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

type IntegrationRefreshFeedbackProps = {
	webhookResource: AsyncResourceState
	oauthResource: AsyncResourceState
}

export const IntegrationRefreshFeedback = ({
	webhookResource,
	oauthResource,
}: IntegrationRefreshFeedbackProps): ReactElement | null => {
	const failures = [
		webhookResource.isRefetchError ? { label: '웹훅', retry: webhookResource.retry } : null,
		oauthResource.isRefetchError ? { label: 'OAuth', retry: oauthResource.retry } : null,
	].filter((failure): failure is { label: string; retry: () => void } => failure !== null)

	if (failures.length > 0) {
		return (
			<div role='status' className='flex flex-wrap items-center gap-2 typo-caption1_medium text-danger-700'>
				<span>일부 연결을 업데이트하지 못했습니다.</span>
				{failures.map(failure => (
					<button key={failure.label} type='button' onClick={failure.retry} className='underline underline-offset-2'>
						{failure.label} 다시 시도
					</button>
				))}
			</div>
		)
	}

	if (webhookResource.isRefetching || oauthResource.isRefetching) {
		return (
			<span role='status' className='typo-caption1_medium text-neutral-500'>
				업데이트 중…
			</span>
		)
	}

	return null
}
