import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { DisconnectImpact } from '@/types/oauthDisconnect'
import { cn } from '@/utils/cn'

const WORKFLOW_PREVIEW_LIMIT = 3

type IntegrationDisconnectImpactListProps = {
	impact: DisconnectImpact
}

const IntegrationDisconnectImpactList = ({ impact }: IntegrationDisconnectImpactListProps) => {
	const listId = useId()
	const [isExpanded, setIsExpanded] = useState(false)
	const { workflows, automaticCount } = impact
	const visibleWorkflows = isExpanded ? workflows : workflows.slice(0, WORKFLOW_PREVIEW_LIMIT)
	const remainingCount = workflows.length - WORKFLOW_PREVIEW_LIMIT

	if (!workflows.length) return <p>연동을 해제하시겠습니까?</p>

	return (
		<>
			<p>아래 워크플로우 {workflows.length}개는 연동을 해제하면 정상적으로 동작하지 않습니다.</p>
			{automaticCount > 0 && (
				<p className='typo-body3_semibold text-danger-800'>
					자동 실행 중인 {automaticCount}개는 해제 후에도 활성 상태로 남아 실행할 때마다 실패합니다.
				</p>
			)}
			<ul
				id={listId}
				aria-label='영향받는 워크플로우'
				className='list-none divide-y divide-neutral-100 rounded-brand-md border border-neutral-200 p-0'
			>
				{visibleWorkflows.map(workflow => (
					<li key={workflow.id} className='flex items-center justify-between gap-3 px-3 py-2'>
						<span
							className={cn(
								'min-w-0 [overflow-wrap:anywhere]',
								workflow.isActive ? 'typo-body3_semibold' : 'typo-body3_regular'
							)}
						>
							{workflow.name}
						</span>
						<span
							className={cn(
								'shrink-0 typo-caption1_medium',
								workflow.isAutomaticExecutionAtRisk && 'text-danger-800'
							)}
						>
							<span>{workflow.isActive ? '활성' : '비활성'}</span>
							{workflow.isAutomaticExecutionAtRisk && <strong className='ml-2'>자동 실행 실패</strong>}
						</span>
					</li>
				))}
			</ul>
			{remainingCount > 0 && (
				<button
					type='button'
					aria-expanded={isExpanded}
					aria-controls={listId}
					onClick={() => setIsExpanded(expanded => !expanded)}
					className='inline-flex min-h-11 items-center gap-1 rounded-brand-sm px-2 typo-body3_semibold text-main-deep-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
				>
					{isExpanded ? '접기' : `외 ${remainingCount}개`}
					<ChevronDown size={16} aria-hidden='true' className={cn(isExpanded && 'rotate-180')} />
				</button>
			)}
		</>
	)
}

export default IntegrationDisconnectImpactList
