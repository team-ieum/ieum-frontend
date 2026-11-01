import type { ReactElement } from 'react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import { AVAILABLE_INTEGRATION_CATALOG } from '@/constants/integration/availableServicesCatalog'
import { INTEGRATION_CARD_GRID } from '@/constants/integration/layout'
import { cn } from '@/utils/cn'
import type { AsyncResourceState } from '@/types/asyncResource'

type IntegrationFailure = {
	label: string
	retry: AsyncResourceState['retry']
}

// 실제 카드 수를 알기 전이므로 grid 열 수만큼만 보여 어느 폭에서도 한 행 높이를 유지한다.
const CONNECTED_SKELETON_VISIBILITY = ['', 'hidden sm:flex', 'hidden lg:flex', 'hidden xl:flex'] as const

/** 높이는 `IntegrationConnectedCard`(workflowCount 행 없음)와 같아야 한다. */
export const IntegrationCardSkeletons = (): ReactElement => (
	<div role='status' aria-label='통합 서비스 불러오는 중' className={INTEGRATION_CARD_GRID}>
		{CONNECTED_SKELETON_VISIBILITY.map((visibility, index) => (
			<article
				key={index}
				aria-hidden='true'
				className={cn(
					'flex flex-col overflow-hidden rounded-brand-md border border-neutral-200 bg-neutral-white',
					visibility
				)}
			>
				<div className='flex items-start gap-3 p-4'>
					<SkeletonPulse className='size-10 shrink-0 rounded-xl bg-neutral-200' />
					<div className='flex min-w-0 flex-1 flex-col'>
						<div className='typo-body2_semibold flex h-lh items-center'>
							<SkeletonPulse className='h-4 w-24 rounded bg-neutral-200' />
						</div>
						<div className='typo-caption1_regular flex h-lh items-center'>
							<SkeletonPulse className='h-3 w-32 rounded bg-neutral-200' />
						</div>
					</div>
				</div>
				<div className='mt-auto px-4 pb-4 pt-1'>
					<SkeletonPulse className='h-9 rounded-brand-sm bg-neutral-200' />
				</div>
			</article>
		))}
	</div>
)

/**
 * 연결 여부를 모르는 동안 catalog 전체 개수만큼 보인다. 연결된 서비스가 있으면 데이터 도착 후 행이 줄 수 있다.
 * 높이는 설명이 한 줄인 `IntegrationAvailableTile`과 같아야 한다.
 */
export const IntegrationAvailableTileSkeletons = (): ReactElement => (
	<div role='status' aria-label='사용 가능한 서비스 불러오는 중' className={INTEGRATION_CARD_GRID}>
		{AVAILABLE_INTEGRATION_CATALOG.map(service => (
			<article
				key={service.id}
				aria-hidden='true'
				className='flex flex-col gap-3 rounded-brand-md border border-neutral-200 bg-neutral-white p-4'
			>
				<div className='flex items-start gap-3'>
					<SkeletonPulse className='size-9 shrink-0 rounded-lg bg-neutral-200' />
					<div className='flex min-w-0 flex-1 flex-col'>
						<div className='typo-body3_semibold flex h-lh items-center'>
							<SkeletonPulse className='h-3.5 w-20 rounded bg-neutral-200' />
						</div>
						<div className='typo-caption1_regular mt-0.5 flex h-lh items-center'>
							<SkeletonPulse className='h-3 w-full rounded bg-neutral-200' />
						</div>
					</div>
				</div>
				<SkeletonPulse className='mt-auto h-8 rounded-brand-sm bg-neutral-200' />
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
	].filter((failure): failure is IntegrationFailure => failure !== null)

	return (
		<div
			role='alert'
			className='col-span-full flex min-h-37 flex-col items-center justify-center rounded-brand-md border border-danger-200 bg-danger-50 px-6 text-center'
		>
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
	].filter((failure): failure is IntegrationFailure => failure !== null)

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
