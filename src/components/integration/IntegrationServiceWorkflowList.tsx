import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import Spinner from '@/components/common/Spinner'
import { useIntegrationServiceWorkflowsQuery } from '@/hooks/integration/queries/useIntegrationServiceWorkflowsQuery'
import type { IntegrationService } from '@/types/integration'
import { getIntegrationServiceType } from '@/utils/integration/getIntegrationServiceType'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { cn } from '@/utils/cn'

const TRIGGER_LABELS: Record<string, string> = {
	MANUAL: '수동',
	SCHEDULE: '스케줄',
	WEBHOOK: '웹훅',
	EVENT: '이벤트',
}

const getTriggerLabel = (triggerType: string) => TRIGGER_LABELS[triggerType.toUpperCase()] ?? triggerType

type IntegrationServiceWorkflowListProps = {
	service: IntegrationService
}

const IntegrationServiceWorkflowList = ({ service }: IntegrationServiceWorkflowListProps) => {
	const navigate = useNavigate()
	const serviceType = getIntegrationServiceType(service.brand)
	const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useIntegrationServiceWorkflowsQuery(serviceType)

	const workflows = useMemo(() => data?.pages.flatMap(page => page.data.content) ?? [], [data])

	if (!serviceType) {
		return (
			<div className='rounded-brand-md border border-neutral-200 bg-neutral-white px-6 py-8 text-center shadow-sm'>
				<p className='m-0 typo-body3_regular text-neutral-500'>이 서비스의 워크플로우 목록을 조회할 수 없습니다.</p>
			</div>
		)
	}

	return (
		<div className='overflow-hidden rounded-brand-md border border-neutral-200 bg-neutral-white shadow-sm'>
			<div className='flex items-center justify-between border-b border-neutral-100 px-6 py-4'>
				<div>
					<h3 className='typo-body2_semibold m-0 text-neutral-900'>연동 워크플로우</h3>
					<p className='typo-caption1_regular m-0 mt-0.5 text-neutral-500'>
						이 서비스를 사용하는 워크플로우 목록입니다.
					</p>
				</div>
				{!isLoading && !isError && (
					<span className='inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-main-light-blue px-2 typo-caption1_semibold text-main-deep-blue'>
						{workflows.length}
					</span>
				)}
			</div>

			{isLoading ? (
				<div className='flex items-center justify-center py-14'>
					<Spinner size='md' />
				</div>
			) : isError ? (
				<p className='m-0 px-6 py-10 text-center typo-body3_regular text-danger-700'>
					워크플로우 목록을 불러오지 못했습니다.
				</p>
			) : workflows.length === 0 ? (
				<p className='m-0 px-6 py-10 text-center typo-body3_regular text-neutral-500'>
					이 서비스를 사용하는 워크플로우가 없습니다.
				</p>
			) : (
				<ul className='m-0 flex list-none flex-col p-0'>
					{workflows.map((workflow, index) => (
						<li key={workflow.id} className={cn(index > 0 && 'border-t border-neutral-100')}>
							<button
								type='button'
								onClick={() => navigate(`/workflow/${workflow.id}`, { state: { name: workflow.name } })}
								className='group flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-neutral-50'
							>
								<div className='min-w-0 flex-1'>
									<div className='flex flex-wrap items-center gap-2'>
										<p className='typo-body3_semibold m-0 truncate text-neutral-900'>{workflow.name}</p>
										<span
											className={cn(
												'inline-flex rounded-full px-2 py-0.5 typo-caption1_semibold',
												workflow.active
													? 'bg-main-light-blue text-main-deep-blue'
													: 'bg-neutral-100 text-neutral-500'
											)}
										>
											{workflow.active ? '활성' : '일시정지'}
										</span>
										<span className='inline-flex rounded-full bg-neutral-100 px-2 py-0.5 typo-caption1_medium text-neutral-600'>
											{getTriggerLabel(workflow.triggerType)}
										</span>
									</div>
									{workflow.description ? (
										<p className='typo-caption1_regular m-0 mt-1 line-clamp-1 text-neutral-500'>
											{workflow.description}
										</p>
									) : null}
									<div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 typo-caption1_regular text-neutral-400'>
										<span>노드 {workflow.usedNodeCount}개 사용</span>
										<span>{formatRelativeTime(workflow.updatedAt)} 수정</span>
									</div>
								</div>
								<ChevronRight
									size={16}
									className='shrink-0 text-neutral-300 transition-colors group-hover:text-main-blue'
								/>
							</button>
						</li>
					))}
				</ul>
			)}

			{hasNextPage ? (
				<div className='border-t border-neutral-100 px-6 py-4'>
					<button
						type='button'
						onClick={() => fetchNextPage()}
						disabled={isFetchingNextPage}
						className='inline-flex h-9 w-full items-center justify-center rounded-brand-sm border border-neutral-200 bg-neutral-white typo-body3_semibold text-neutral-700 transition-colors hover:border-main-blue hover:text-main-blue disabled:cursor-not-allowed disabled:opacity-60'
					>
						{isFetchingNextPage ? '불러오는 중…' : '더 보기'}
					</button>
				</div>
			) : null}
		</div>
	)
}

export default IntegrationServiceWorkflowList
