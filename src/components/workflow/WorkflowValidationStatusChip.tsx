import { LoaderCircle, RotateCw } from 'lucide-react'
import type { WorkflowValidationStatusView, WorkflowValidationTone } from '@/types/workflowValidation'
import { cn } from '@/utils/cn'

const TONE_CLASS: Record<WorkflowValidationTone, string> = {
	neutral: 'border-neutral-200 bg-neutral-50 text-neutral-600',
	success: 'border-success-200 bg-success-100 text-node-green',
	danger: 'border-danger-300 bg-danger-100 text-danger-900',
	warning: 'border-warning-700/30 bg-warning-100 text-warning-700',
}

type WorkflowValidationStatusChipProps = {
	status: WorkflowValidationStatusView
	onRetry: () => void
}

/** 툴바에 서버 검사 상태(검사 중, 문제 N건, 검사 불가)와 '다시 검사'를 보여 준다. */
const WorkflowValidationStatusChip = ({ status, onRetry }: WorkflowValidationStatusChipProps) => (
	<div
		className={cn(
			'flex min-w-0 max-w-80 shrink items-center gap-1.5 rounded-full border px-2.5 py-1 typo-caption1_semibold',
			TONE_CLASS[status.tone]
		)}
	>
		{status.isChecking ? (
			<LoaderCircle size={12} aria-hidden='true' className='shrink-0 animate-spin motion-reduce:animate-none' />
		) : null}
		<span role='status' aria-live='polite' className='min-w-0 truncate' title={status.label}>
			<span className='sr-only'>서버 검사: </span>
			{status.label}
			{status.detail ? <span className='typo-caption1_regular'> · {status.detail}</span> : null}
		</span>
		{status.canRetry ? (
			<button
				type='button'
				onClick={onRetry}
				aria-label='다시 검사'
				title='다시 검사'
				className='grid size-5 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-neutral-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
			>
				<RotateCw size={12} aria-hidden='true' />
			</button>
		) : null}
	</div>
)

export default WorkflowValidationStatusChip
