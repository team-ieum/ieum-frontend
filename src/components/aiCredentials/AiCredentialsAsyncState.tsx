import type { ReactElement } from 'react'
import type { AsyncResourceState } from '@/types/asyncResource'

export const AiCredentialsSkeleton = ({ count = 1 }: { count?: number }): ReactElement => (
	<div role='status' aria-label='AI 자격 증명 불러오는 중' className='flex flex-col gap-4'>
		{Array.from({ length: Math.max(count, 1) }, (_, index) => (
			<article
				key={index}
				aria-hidden='true'
				className='flex min-h-[164px] flex-col gap-4 rounded-brand-md border border-neutral-200 bg-neutral-white p-5'
			>
				<div className='flex items-center gap-3'>
					<div className='size-11 animate-pulse rounded-xl bg-neutral-200 motion-reduce:animate-none' />
					<div className='flex flex-1 flex-col gap-2'>
						<div className='h-5 w-40 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none' />
						<div className='h-4 w-64 max-w-full animate-pulse rounded bg-neutral-200 motion-reduce:animate-none' />
					</div>
				</div>
				<div className='mt-auto h-12 animate-pulse rounded-brand-sm bg-neutral-200 motion-reduce:animate-none' />
			</article>
		))}
	</div>
)

export const AiCredentialsError = ({ message, retry }: Pick<AsyncResourceState, 'retry'> & { message: string }): ReactElement => (
	<div className='flex min-h-[164px] flex-col items-center justify-center rounded-brand-md border border-danger-200 bg-danger-50 px-6 text-center'>
		<p className='m-0 typo-body2_semibold text-danger-700'>{message}</p>
		<button
			type='button'
			onClick={retry}
			className='mt-4 rounded-brand-sm border border-danger-300 bg-neutral-white px-4 py-2 typo-body3_semibold text-danger-700'
		>
			다시 시도
		</button>
	</div>
)

type AiCredentialsRefreshFeedbackProps = {
	providersResource: AsyncResourceState
	credentialsResource: AsyncResourceState
}

export const AiCredentialsRefreshFeedback = ({
	providersResource,
	credentialsResource,
}: AiCredentialsRefreshFeedbackProps): ReactElement | null => {
	const failures = [
		providersResource.isRefetchError ? { label: '제공자', retry: providersResource.retry } : null,
		credentialsResource.isRefetchError ? { label: '자격 증명', retry: credentialsResource.retry } : null,
	].filter((failure): failure is { label: string; retry: () => void } => failure !== null)

	if (failures.length > 0) {
		return (
			<div role='status' className='mt-2 flex flex-wrap items-center gap-2 typo-caption1_medium text-danger-700'>
				<span>일부 정보를 업데이트하지 못했습니다.</span>
				{failures.map(failure => (
					<button key={failure.label} type='button' onClick={failure.retry} className='underline underline-offset-2'>
						{failure.label} 다시 시도
					</button>
				))}
			</div>
		)
	}

	if (providersResource.isRefetching || credentialsResource.isRefetching) {
		return (
			<span role='status' className='mt-2 inline-block typo-caption1_medium text-neutral-500'>
				업데이트 중…
			</span>
		)
	}

	return null
}
