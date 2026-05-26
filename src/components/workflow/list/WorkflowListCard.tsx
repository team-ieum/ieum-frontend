import { MoreHorizontal } from 'lucide-react'
import type { ReactElement } from 'react'
import type { WorkflowListItem } from '@/types/workflowList'
import { CategoryPill, ServiceChain, StatusBadge, TriggerPill } from './WorkflowListPrimitives'

type WorkflowListCardProps = {
	workflow: WorkflowListItem
	onOpen: (workflowId: string) => void
}

const WorkflowListCard = ({ workflow, onOpen }: WorkflowListCardProps): ReactElement => (
	<article
		role='button'
		tabIndex={0}
		onClick={() => onOpen(workflow.id)}
		onKeyDown={event => {
			if (event.currentTarget !== event.target) {
				return
			}

			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				onOpen(workflow.id)
			}
		}}
		className='group relative flex min-h-[148px] cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#cde9f4] hover:shadow-[0_16px_32px_-18px_rgba(41,83,124,.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-main-blue focus-visible:ring-offset-2'
	>
		<span
			className='absolute inset-y-0 left-0 w-1'
			style={{
				backgroundColor: workflow.status === 'error' ? '#EC2D30' : workflow.status === 'paused' ? '#959595' : '#006A4E',
			}}
		/>

		{/* 카드 헤더 */}
		<div className='flex items-start gap-3 pl-1'>
			<div className='min-w-0 flex-1'>
				<h3 className='truncate typo-body1_semibold text-neutral-800'>{workflow.name}</h3>
			</div>
			<button
				type='button'
				onClick={event => event.stopPropagation()}
				className='grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600'
				aria-label='워크플로우 메뉴'
				title='워크플로우 메뉴'
			>
				<MoreHorizontal size={17} />
			</button>
		</div>

		<ServiceChain services={workflow.services} showArrow={false} />

		<div className='mt-auto border-t border-neutral-200 pt-3'>
			<div className='flex flex-wrap items-center gap-2'>
				<CategoryPill category={workflow.category} />
				<TriggerPill trigger={workflow.trigger} />
				<span className='flex-1' />
				<StatusBadge status={workflow.status} />
			</div>
		</div>
	</article>
)

export default WorkflowListCard
