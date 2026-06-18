import { ArrowLeft, CloudCheck, History, Loader2, Rocket, Save, Share2 } from 'lucide-react'
import { useRef } from 'react'
import { WORKFLOW_STATUS_META } from '@/constants/workflow/workflowList'
import { useWorkflowToolbar } from '@/hooks/workflow/useWorkflowToolbar'
import type { WorkflowStatus } from '@/types/workflowList'

type ActiveToggleProps = {
	active: boolean
	onToggle: () => void
}

const ActiveToggle = ({ active, onToggle }: ActiveToggleProps) => {
	const startX = useRef<number | null>(null)

	const handlePointerDown = (e: React.PointerEvent) => {
		startX.current = e.clientX
	}

	const handlePointerUp = (e: React.PointerEvent) => {
		if (startX.current === null) return
		const delta = e.clientX - startX.current
		startX.current = null

		// 드래그: 8px 이상 이동 시 방향으로 결정, 미만이면 클릭으로 처리
		if (Math.abs(delta) >= 8) {
			const shouldActivate = delta > 0
			if (shouldActivate !== active) onToggle()
		} else {
			onToggle()
		}
	}

	return (
		<div className='flex items-center gap-2 shrink-0'>
			<button
				type='button'
				role='switch'
				aria-checked={active}
				aria-label={active ? '워크플로우 비활성화' : '워크플로우 활성화'}
				onPointerDown={handlePointerDown}
				onPointerUp={handlePointerUp}
				className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer select-none touch-none ${
					active ? 'bg-node-green' : 'bg-neutral-300'
				}`}
			>
				<span
					className={`absolute left-0 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
						active ? 'translate-x-5' : 'translate-x-0.5'
					}`}
				/>
			</button>
			<span className={`text-xs font-semibold ${active ? 'text-node-green' : 'text-neutral-400'}`}>
				{active ? WORKFLOW_STATUS_META.active.label : WORKFLOW_STATUS_META.paused.label}
			</span>
		</div>
	)
}

type WorkflowToolbarProps = {
	defaultTitle?: string
	status?: WorkflowStatus
	active?: boolean
	onToggleActive?: () => void
	onExecute?: () => void
	isExecuting?: boolean
}

const WorkflowToolbar = ({
	defaultTitle = '워크플로우 제목',
	status = 'paused',
	active,
	onToggleActive,
	onExecute,
	isExecuting = false,
}: WorkflowToolbarProps) => {
	const { title, handleTitleChange, handleBack } = useWorkflowToolbar(defaultTitle)
	const statusMeta = WORKFLOW_STATUS_META[status]
	const isToggleable = status !== 'error' && active !== undefined && onToggleActive

	return (
		<div
			className='flex items-center gap-3.5 px-6 border-b border-neutral-200 shrink-0'
			style={{ height: 64, background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(8px)' }}
		>
			<button
				type='button'
				onClick={handleBack}
				aria-label='뒤로 가기'
				className='w-9 h-9 rounded-[10px] grid place-items-center bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0 cursor-pointer'
			>
				<ArrowLeft size={18} />
			</button>

			<div className='flex items-center gap-2.5'>
				<input
					value={title}
					onChange={e => handleTitleChange(e.target.value)}
					aria-label='워크플로우 제목'
					className='text-xl font-bold text-main-deep-blue tracking-wide outline-none bg-transparent rounded-md px-2 py-1 hover:bg-neutral-100 focus:bg-neutral-100 transition-colors min-w-0'
					style={{ fontFamily: 'var(--font-sans)' }}
				/>
				{isToggleable ? (
					<ActiveToggle active={active} onToggle={onToggleActive} />
				) : (
					<span
						className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 ${statusMeta.toneClass}`}
					>
						<span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotBgClass}`} />
						{statusMeta.label}
					</span>
				)}
			</div>

			<span className='inline-flex items-center gap-1 text-xs text-neutral-400 shrink-0'>
				<CloudCheck size={14} className='text-node-green' />
				방금 전 자동 저장됨
			</span>

			<div className='flex-1' />

			<button
				type='button'
				aria-label='실행 이력'
				className='w-9 h-9 rounded-[10px] grid place-items-center text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer'
			>
				<History size={18} />
			</button>
			<button
				type='button'
				aria-label='공유'
				className='w-9 h-9 rounded-[10px] grid place-items-center text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer'
			>
				<Share2 size={18} />
			</button>
			<button
				type='button'
				className='inline-flex items-center gap-2 h-9 px-4 rounded-[10px] border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer'
			>
				<Save size={15} />
				저장
			</button>
			<button
				type='button'
				onClick={onExecute}
				disabled={isExecuting}
				className='inline-flex items-center gap-2 h-9 px-4 rounded-[10px] bg-main-deep-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
			>
				{isExecuting ? <Loader2 size={15} className='animate-spin' /> : <Rocket size={15} />}
				{isExecuting ? '실행 중…' : 'Deploy'}
			</button>
		</div>
	)
}

export default WorkflowToolbar
