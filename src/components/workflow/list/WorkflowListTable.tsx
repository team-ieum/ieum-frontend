import { ChevronRight } from 'lucide-react'
import type { WorkflowListItem } from '@/types/workflowList'
import { CategoryPill, ServiceChain, StatusDot, TriggerPill } from './WorkflowListPrimitives'

type WorkflowListTableProps = {
	workflows: WorkflowListItem[]
	onOpen: (workflowId: string) => void
}

const WorkflowListTable = ({ workflows, onOpen }: WorkflowListTableProps) => (
	<div className='overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]'>
		<div className='overflow-x-auto'>
			<table className='w-full min-w-[760px] border-collapse'>
				<thead className='bg-neutral-100'>
					<tr className='text-left typo-caption1_semibold text-neutral-500'>
						<th className='w-8 px-4 py-3' />
						<th className='px-3 py-3'>이름</th>
						<th className='px-3 py-3'>사용 서비스</th>
						<th className='px-3 py-3'>카테고리</th>
						<th className='px-3 py-3'>트리거</th>
						<th className='px-3 py-3 text-right'>실행 수</th>
						<th className='w-10 px-4 py-3' />
					</tr>
				</thead>
				<tbody className='divide-y divide-neutral-200'>
					{workflows.map(workflow => (
						<tr
							key={workflow.id}
							role='button'
							tabIndex={0}
							onClick={() => onOpen(workflow.id)}
							onKeyDown={event => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault()
									onOpen(workflow.id)
								}
							}}
							className='cursor-pointer bg-white transition-colors hover:bg-main-light-blue/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-main-blue focus-visible:ring-inset'
						>
							<td className='px-4 py-3'>
								<StatusDot status={workflow.status} />
							</td>
							<td className='max-w-[240px] px-3 py-3'>
								<div className='truncate typo-body2_semibold text-neutral-800'>{workflow.name}</div>
							</td>
							<td className='px-3 py-3'>
								<ServiceChain services={workflow.services} size={24} max={5} showArrow={false} />
							</td>
							<td className='px-3 py-3'>
								<CategoryPill category={workflow.category} />
							</td>
							<td className='px-3 py-3'>
								<TriggerPill trigger={workflow.trigger} />
							</td>
							<td className='px-3 py-3 text-right typo-body3_semibold text-neutral-700'>
								{workflow.runs.toLocaleString('ko-KR')}
							</td>
							<td className='px-4 py-3 text-neutral-400'>
								<ChevronRight size={17} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	</div>
)

export default WorkflowListTable
