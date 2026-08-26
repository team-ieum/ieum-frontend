import type { ReactElement } from 'react'
import { Boxes } from 'lucide-react'
import { WORKFLOW_SERVICE_META, WORKFLOW_STATUS_META } from '@/constants/workflow/workflowList'
import type { WorkflowListItem } from '@/types/workflowList'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { cn } from '@/utils/cn'
import { StatusBadge, TriggerPill } from './WorkflowListPrimitives'
import { WorkflowMoreMenu } from './WorkflowMoreMenu'

type WorkflowListCardProps = {
	workflow: WorkflowListItem
	onOpen: (workflowId: string, workflowName: string) => void
	onDelete: (workflowId: string) => void
}

const formatServiceNames = (workflow: WorkflowListItem): string =>
	workflow.services.map(serviceId => WORKFLOW_SERVICE_META[serviceId].name).join(' · ')

const WorkflowListCard = ({ workflow, onOpen, onDelete }: WorkflowListCardProps): ReactElement => {
	const updatedAt = workflow.updatedAt ?? workflow.lastRun
	const nodeCount = workflow.nodeCount ?? 0
	const hasServices = workflow.services.length > 0
	const serviceNames = formatServiceNames(workflow)

	return (
		<article className='group relative flex min-h-[148px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#cde9f4] hover:shadow-[0_16px_32px_-18px_rgba(41,83,124,.35)]'>
			<button
				type='button'
				onClick={() => onOpen(workflow.id, workflow.name)}
				className='absolute inset-0 z-10 cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-main-blue focus-visible:ring-offset-2'
			>
				<span className='sr-only'>{workflow.name} 열기</span>
			</button>
			<span className={cn('absolute inset-y-0 left-0 w-1', WORKFLOW_STATUS_META[workflow.status].barClass)} />

			<div className='pointer-events-none relative z-20 flex flex-1 flex-col gap-3'>
				<div className='flex items-start gap-3 pl-1'>
					<div className='min-w-0 flex-1'>
						<h3 className='truncate typo-body1_semibold text-neutral-800'>{workflow.name}</h3>
					</div>
					<WorkflowMoreMenu className='pointer-events-auto relative z-30' onDelete={() => onDelete(workflow.id)} />
				</div>

				<div className='mt-auto flex flex-col gap-3'>
					<div className='flex items-center gap-2 pl-1'>
						<p className='min-w-0 flex-1 truncate typo-caption1_regular text-neutral-500'>
							{hasServices ? serviceNames : '연결된 서비스 없음'}
						</p>
						<span className='inline-flex shrink-0 items-center gap-1.5 typo-caption1_regular text-neutral-400'>
							<Boxes size={14} />
							노드 {nodeCount}개
						</span>
						<div className='flex shrink-0 items-center gap-1.5'>
							<TriggerPill trigger={workflow.trigger} />
							{workflow.trigger === 'schedule' && workflow.cronExpression ? (
								<span
									className='max-w-24 truncate typo-caption1_regular text-neutral-400'
									title={workflow.cronExpression}
								>
									{workflow.cronExpression}
								</span>
							) : null}
						</div>
					</div>

					<div className='flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3'>
						<span className='typo-caption1_regular text-neutral-400'>{formatRelativeTime(updatedAt)} 수정</span>
						<span className='flex-1' />
						<StatusBadge status={workflow.status} />
					</div>
				</div>
			</div>
		</article>
	)
}

export default WorkflowListCard
