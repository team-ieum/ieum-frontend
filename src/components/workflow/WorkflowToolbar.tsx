import { ArrowLeft, Code2, HardDrive, History, Loader2, Rocket, Save, Share2 } from 'lucide-react'
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
	const suppressNextClick = useRef(false)

	const handlePointerDown = (e: React.PointerEvent) => {
		suppressNextClick.current = false
		// 보조 버튼은 click을 만들지 않으므로 드래그 전환과 click 억제 대상에서 제외한다.
		startX.current = e.button === 0 ? e.clientX : null
	}

	const handlePointerUp = (e: React.PointerEvent) => {
		if (startX.current === null) return
		const delta = e.clientX - startX.current
		startX.current = null

		// 8px 이상 드래그는 방향으로 결정하고, 이어서 발생하는 click이 다시 토글하지 않게 막는다.
		if (Math.abs(delta) >= 8) {
			suppressNextClick.current = true
			const shouldActivate = delta > 0
			if (shouldActivate !== active) onToggle()
		}
	}

	// pointer 클릭, keyboard Enter/Space, 보조기기 활성화가 모두 click으로 들어온다.
	// keyboard·보조기기 click은 detail이 0이므로 이전 드래그의 억제 상태와 관계없이 전환한다.
	const handleClick = (e: React.MouseEvent) => {
		const isDragClick = e.detail !== 0 && suppressNextClick.current
		suppressNextClick.current = false
		if (isDragClick) return
		onToggle()
	}

	return (
		<div className='flex items-center gap-2 shrink-0'>
			<button
				type='button'
				role='switch'
				aria-checked={active}
				aria-label='워크플로우 활성 상태'
				onPointerDown={handlePointerDown}
				onPointerUp={handlePointerUp}
				onClick={handleClick}
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
	title: string
	onTitleChange: (title: string) => void
	hasUnsavedChanges?: boolean
	isDraftPersisted?: boolean
	status?: WorkflowStatus
	active?: boolean
	onToggleActive?: () => void
	onSave?: () => void
	isSaving?: boolean
	canSave?: boolean
	onExecute?: () => void
	isExecuting?: boolean
	isRequesting?: boolean
	isWaitingApproval?: boolean
	canExecute?: boolean
	technicalMode?: boolean
	onToggleTechnicalMode?: () => void
	isRefreshing?: boolean
	isRefreshError?: boolean
	onRetryRefresh?: () => void
}

const WorkflowToolbar = ({
	title,
	onTitleChange,
	hasUnsavedChanges = false,
	isDraftPersisted = false,
	status = 'paused',
	active,
	onToggleActive,
	onSave,
	isSaving = false,
	canSave = false,
	onExecute,
	isExecuting = false,
	isRequesting = false,
	isWaitingApproval = false,
	canExecute = !isExecuting && !isWaitingApproval,
	technicalMode = false,
	onToggleTechnicalMode,
	isRefreshing = false,
	isRefreshError = false,
	onRetryRefresh,
}: WorkflowToolbarProps) => {
	const { handleBack } = useWorkflowToolbar()
	const statusMeta = WORKFLOW_STATUS_META[status]
	const isToggleable = status !== 'error' && active !== undefined && onToggleActive

	return (
		<div
			className='flex items-center gap-3.5 px-6 border-b border-neutral-200 shrink-0 overflow-x-auto'
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
				<div className='flex min-w-0 items-center gap-1.5'>
					<input
						value={title}
						onChange={e => onTitleChange(e.target.value)}
						aria-label='워크플로우 제목'
						className='min-w-0 rounded-md bg-transparent px-2 py-1 text-xl font-bold tracking-wide text-main-deep-blue outline-none transition-colors hover:bg-neutral-100 focus:bg-neutral-100'
						style={{ fontFamily: 'var(--font-sans)' }}
					/>
					{hasUnsavedChanges ? (
						<span
							role='status'
							title='저장되지 않은 변경사항'
							aria-label='저장되지 않은 변경사항'
							className='size-2 shrink-0 rounded-full bg-amber-500'
						/>
					) : null}
				</div>
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

			{hasUnsavedChanges && isDraftPersisted ? (
				<span className='inline-flex shrink-0 items-center gap-1 text-xs text-neutral-400'>
					<HardDrive size={14} className='text-node-green' />
					브라우저에 임시 보관됨
				</span>
			) : null}

			{isRefreshError ? (
				<div role='status' className='flex shrink-0 items-center gap-2 text-xs font-medium text-danger-700'>
					<span>업데이트하지 못했습니다.</span>
					{onRetryRefresh ? (
						<button type='button' onClick={onRetryRefresh} className='underline underline-offset-2'>
							다시 시도
						</button>
					) : null}
				</div>
			) : isRefreshing ? (
				<span role='status' className='shrink-0 text-xs font-medium text-neutral-500'>
					업데이트 중…
				</span>
			) : null}

			<div className='flex-1' />

			{onToggleTechnicalMode ? (
				<button
					type='button'
					role='switch'
					aria-checked={technicalMode}
					aria-label='기술 정보'
					onClick={onToggleTechnicalMode}
					className={`inline-flex items-center gap-2 h-9 px-3 rounded-[10px] border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
						technicalMode
							? 'border-node-purple bg-purple-50 text-node-purple'
							: 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50'
					}`}
				>
					<Code2 size={15} aria-hidden='true' />
					기술 정보
					<span
						aria-hidden='true'
						className={`relative h-4.5 w-8 rounded-full transition-colors ${technicalMode ? 'bg-node-purple' : 'bg-neutral-300'}`}
					>
						<span
							className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
								technicalMode ? 'translate-x-3.5' : 'translate-x-0'
							}`}
						/>
					</span>
				</button>
			) : null}

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
				onClick={onSave}
				disabled={!canSave}
				className='inline-flex shrink-0 items-center gap-2 h-9 px-4 rounded-[10px] border border-neutral-200 bg-white text-sm font-semibold whitespace-nowrap text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white'
			>
				{isSaving ? <Loader2 size={15} className='animate-spin' /> : <Save size={15} />}
				{isSaving ? '저장 중…' : '저장'}
			</button>
			<button
				type='button'
				onClick={onExecute}
				disabled={!canExecute}
				aria-label={isWaitingApproval ? '승인 대기 중에는 실행할 수 없습니다' : undefined}
				className='inline-flex shrink-0 items-center gap-2 h-9 px-4 rounded-[10px] bg-main-deep-blue text-white text-sm font-semibold whitespace-nowrap hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
			>
				{isExecuting ? <Loader2 size={15} className='animate-spin' /> : <Rocket size={15} />}
				{isWaitingApproval ? '승인 대기' : isRequesting ? '실행 요청 중…' : isExecuting ? '실행 중…' : 'Deploy'}
			</button>
		</div>
	)
}

export default WorkflowToolbar
