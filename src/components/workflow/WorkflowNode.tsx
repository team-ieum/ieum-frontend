import { Handle, Position, type NodeProps } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Bot, Check, CircleAlert, CircleDashed, LoaderCircle, Play, Send } from 'lucide-react'
import { WORKFLOW_NODE_STATUS } from '@/constants/workflow/workflowNode'
import type { WorkflowNodeRole, WorkflowNodeStatus, WorkflowNodeType } from '@/types/workflow'
import { cn } from '@/utils/cn'

const ROLE_CLASS: Record<WorkflowNodeRole, string> = {
	trigger: '[--node-color:#2e8b68] [--node-tint:#dff2e9]',
	ai: '[--node-color:#6d5ce7] [--node-tint:#eeeafd]',
	action: '[--node-color:#e76f61] [--node-tint:#fbe5e1]',
}

const STATUS_CLASS: Record<WorkflowNodeStatus, string> = {
	idle: 'bg-[#eef1f3] text-[#5a6975]',
	running: 'bg-[#e1f3f7] text-[#087a95]',
	success: 'bg-[#e5f3ec] text-[#287357]',
	error: 'bg-[#fff0ec] text-[#a84c36]',
}

const HANDLE_CLASS = cn(
	'!z-[3] !size-4.5 !cursor-crosshair !border-[3px] !border-white',
	'!bg-(--node-color) !shadow-[0_0_0_2px_var(--node-color),0_3px_8px_rgba(28,54,65,0.2)]'
)

const RoleIcon = ({ role }: { role: WorkflowNodeRole }) => {
	if (role === 'trigger') return <Play size={20} aria-hidden='true' />
	if (role === 'ai') return <Bot size={20} aria-hidden='true' />
	return <Send size={20} aria-hidden='true' />
}

const StatusIcon = ({ status }: { status: WorkflowNodeStatus }) => {
	if (status === 'running')
		return <LoaderCircle className='animate-spin motion-reduce:animate-none' size={14} aria-hidden='true' />
	if (status === 'success') return <Check size={14} aria-hidden='true' />
	if (status === 'error') return <CircleAlert size={14} aria-hidden='true' />
	return <CircleDashed size={14} aria-hidden='true' />
}

const WorkflowNode = ({ data }: NodeProps<WorkflowNodeType>) => {
	const status = WORKFLOW_NODE_STATUS[data.status]

	return (
		<motion.article
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.25, delay: (data.step - 1) * 0.06, ease: 'easeOut' }}
			className={cn(
				'relative w-66 rounded-[1.2rem] border-2 border-(--node-color) bg-white',
				'shadow-[0.5rem_0.6rem_0_var(--node-tint),0_14px_30px_rgba(65,52,139,0.1)]',
				ROLE_CLASS[data.role]
			)}
		>
			{data.role === 'trigger' ? null : <Handle type='target' position={Position.Left} className={HANDLE_CLASS} />}
			<Handle type='source' position={Position.Right} className={HANDLE_CLASS} />

			<header
				className={cn(
					'flex min-h-[2.9rem] items-center gap-[0.45rem] rounded-t-[1rem] border-b px-[0.65rem] py-[0.45rem]',
					'bg-(--node-tint) text-[0.72rem] font-bold text-(--node-color)',
					'border-b-[color-mix(in_srgb,var(--node-color)_28%,white)]'
				)}
			>
				<span
					className={cn(
						'grid size-8 shrink-0 place-items-center rounded-[0.65rem] bg-(--node-color) text-white',
						'[box-shadow:0_4px_0_color-mix(in_srgb,var(--node-color)_78%,black)]'
					)}
				>
					<RoleIcon role={data.role} />
				</span>
				<span>{data.typeLabel}</span>
				<motion.span
					key={data.status}
					initial={{ scale: 0, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ type: 'spring', stiffness: 400, damping: 20 }}
					className={cn(
						'ml-auto inline-flex size-[1.55rem] items-center justify-center rounded-full',
						STATUS_CLASS[data.status]
					)}
					title={status.description}
					role='img'
					aria-label={status.label}
				>
					<StatusIcon status={data.status} />
				</motion.span>
			</header>

			<div className='flex flex-col gap-[0.55rem] p-[0.85rem]'>
				<div className='flex items-center gap-[0.55rem]'>
					<span className='grid size-6 shrink-0 place-items-center rounded-full bg-(--node-color) text-[0.7rem] font-bold text-white'>
						<span aria-hidden='true'>{data.step}</span>
						<span className='sr-only'>{data.step}단계</span>
					</span>
					<h3
						className='min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-[#27273b]'
						title={data.title}
					>
						{data.title}
					</h3>
				</div>

				{data.technicalMode ? (
					<dl
						className={cn(
							'm-0 grid gap-[0.35rem] rounded-[0.65rem] border p-[0.55rem_0.6rem] font-mono',
							'border-[color-mix(in_srgb,var(--node-color)_24%,white)]',
							'[background:color-mix(in_srgb,var(--node-tint)_55%,white)]'
						)}
					>
						<div className='grid grid-cols-[3.6rem_minmax(0,1fr)] items-center gap-[0.45rem]'>
							<dt className='text-[0.58rem] font-bold tracking-[0.03em] text-[color-mix(in_srgb,var(--node-color)_72%,#32313c)]'>
								Method
							</dt>
							<dd className='m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.62rem] font-semibold text-[#353442]'>
								{data.method ?? '정보 없음'}
							</dd>
						</div>
						<div className='grid grid-cols-[3.6rem_minmax(0,1fr)] items-center gap-[0.45rem]'>
							<dt className='text-[0.58rem] font-bold tracking-[0.03em] text-[color-mix(in_srgb,var(--node-color)_72%,#32313c)]'>
								URL
							</dt>
							<dd
								className='m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.62rem] font-semibold text-[#353442]'
								title={data.url}
							>
								{data.url ?? '정보 없음'}
							</dd>
						</div>
					</dl>
				) : (
					<p className='m-0 min-h-[1.95rem] text-[0.68rem] leading-[1.45] text-[#6d6b7c]'>{data.description}</p>
				)}

				{data.role === 'ai' ? (
					<span
						className={cn(
							'inline-flex min-h-8 w-full items-center rounded-[0.65rem] border px-[0.6rem] py-[0.28rem]',
							'bg-(--node-tint) text-[0.67rem] font-bold text-(--node-color)',
							'border-[color-mix(in_srgb,var(--node-color)_30%,white)]'
						)}
					>
						{data.modelName ?? '모델 정보 없음'}
					</span>
				) : null}
			</div>
		</motion.article>
	)
}

export default WorkflowNode
