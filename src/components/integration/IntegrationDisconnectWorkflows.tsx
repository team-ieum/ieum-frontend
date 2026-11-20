import type { OAuthDisconnectImpact } from '@/types/oauthDisconnect'
import { cn } from '@/utils/cn'

type IntegrationDisconnectWorkflowsProps = {
	impact: OAuthDisconnectImpact
	showIndividualNotice: boolean
}

const IntegrationDisconnectWorkflows = ({ impact, showIndividualNotice }: IntegrationDisconnectWorkflowsProps) => {
	const { totalCount, workflows } = impact
	if (totalCount === 0) {
		return <p className='mt-2 break-keep typo-body2_regular text-neutral-600'>현재 이 연결을 쓰는 워크플로우는 없어요.</p>
	}

	const remainingCount = totalCount - workflows.length

	return (
		<>
			<p className='mt-2 break-keep typo-body2_regular text-neutral-600'>
				이 연결을 쓰는 워크플로우 {totalCount}개가 다음 실행부터 실패해요.
			</p>
			<ul
				role='list'
				aria-label='영향받는 워크플로우'
				className={cn(
					'list-none divide-y divide-neutral-200 p-0',
					showIndividualNotice ? 'mt-4.5' : 'mt-4.25 max-[600px]:mt-2.75'
				)}
			>
				{workflows.map(workflow => (
					<li key={workflow.id} className={cn('min-w-0 first:pt-0', showIndividualNotice ? 'py-3' : 'py-2.25')}>
						<span
							className={cn(
								'flex w-fit items-center gap-1.25 whitespace-nowrap typo-caption1_semibold before:size-1.5 before:shrink-0 before:rounded-full',
								workflow.automaticNotice
									? 'text-main-deep-blue before:bg-current'
									: 'text-neutral-600 before:bg-neutral-400'
							)}
						>
							{workflow.statusLabel}
						</span>
						<div className={cn('wrap-anywhere typo-body2_regular', showIndividualNotice ? 'mt-0.75' : 'mt-0.5')}>
							<span className='text-neutral-800'>{workflow.name}</span>{' '}
							<span className='typo-caption1_regular text-neutral-600'>· {workflow.triggerLabel}</span>
						</div>
						{showIndividualNotice && workflow.automaticNotice && (
							<p className='mt-1 break-keep typo-caption1_regular text-neutral-600'>{workflow.automaticNotice}</p>
						)}
					</li>
				))}
			</ul>
			{remainingCount > 0 && <p className='typo-body3_medium text-neutral-600'>외 {remainingCount}개</p>}
		</>
	)
}

export default IntegrationDisconnectWorkflows
