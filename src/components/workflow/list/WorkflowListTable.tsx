import type { ReactElement } from 'react'
import { WORKFLOW_SERVICE_META } from '@/constants/workflow/workflowList'
import type { WorkflowListItem } from '@/types/workflowList'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { ServiceChain, StatusDot, TriggerPill } from './WorkflowListPrimitives'
import { WorkflowMoreMenu } from './WorkflowMoreMenu'

type WorkflowListTableProps = {
	workflows: WorkflowListItem[]
	onOpen: (workflowId: string, workflowName: string) => void
	onDelete: (workflowId: string) => void
}

const formatServiceNames = (workflow: WorkflowListItem): string =>
	workflow.services.map(serviceId => WORKFLOW_SERVICE_META[serviceId].name).join(' · ')

const WorkflowListTable = ({ workflows, onOpen, onDelete }: WorkflowListTableProps): ReactElement => (
	<div className='overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]'>
		<div className='overflow-x-auto'>
			<table className='w-full min-w-[820px] border-collapse'>
				<thead className='bg-neutral-100'>
					<tr className='text-left typo-caption1_semibold text-neutral-500'>
						<th className='w-8 px-4 py-3' />
						<th className='px-3 py-3'>이름</th>
						<th className='px-3 py-3'>사용 서비스</th>
						<th className='px-3 py-3'>트리거</th>
						<th className='px-3 py-3'>노드</th>
						<th className='px-3 py-3'>수정</th>
						<th className='w-10 px-4 py-3' />
					</tr>
				</thead>
				<tbody className='divide-y divide-neutral-200'>
					{workflows.map(workflow => {
						const updatedAt = workflow.updatedAt ?? workflow.lastRun
						const nodeCount = workflow.nodeCount ?? 0
						const serviceNames = formatServiceNames(workflow)

						return (
							<tr key={workflow.id} className='bg-white transition-colors hover:bg-main-light-blue/35'>
								<td className='px-4 py-3'>
									<StatusDot status={workflow.status} />
								</td>
								<td className='max-w-[280px] px-3 py-3'>
									<button
										type='button'
										onClick={() => onOpen(workflow.id, workflow.name)}
										className='block w-full rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-main-blue focus-visible:ring-offset-2'
									>
										<span className='block truncate typo-body2_semibold text-neutral-800'>
											{workflow.name}
										</span>
										<span className='mt-0.5 block truncate typo-caption1_regular text-neutral-500'>
											{serviceNames || '연결된 서비스 없음'}
										</span>
									</button>
								</td>
								<td className='px-3 py-3'>
									{workflow.services.length > 0 ? (
										<ServiceChain services={workflow.services} size={24} max={5} showArrow={false} />
									) : (
										<span className='typo-caption1_regular text-neutral-400'>—</span>
									)}
								</td>
								<td className='px-3 py-3'>
									<div className='flex flex-col gap-0.5'>
										<TriggerPill trigger={workflow.trigger} />
										{workflow.trigger === 'schedule' && workflow.cronExpression ? (
											<span
												className='truncate typo-caption1_regular text-neutral-400'
												title={workflow.cronExpression}
											>
												{workflow.cronExpression}
											</span>
										) : null}
									</div>
								</td>
								<td className='px-3 py-3 typo-caption1_regular text-neutral-600'>{nodeCount}개</td>
								<td className='px-3 py-3 typo-caption1_regular text-neutral-500'>
									{formatRelativeTime(updatedAt)}
								</td>
								<td className='px-4 py-3'>
									<WorkflowMoreMenu onDelete={() => onDelete(workflow.id)} />
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	</div>
)

export default WorkflowListTable
