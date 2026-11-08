import { CircleAlert, Clock, FileWarning, Link2Off, Unplug, type LucideIcon } from 'lucide-react'
import type { WorkflowValidationErrorCode, WorkflowValidationErrorDto } from '@/types/workflowValidation'
import { cn } from '@/utils/cn'

// code는 문구가 아니라 아이콘 구분에만 쓴다. 모르는 code는 기본 아이콘으로 그린다.
const CODE_ICON: Partial<Record<WorkflowValidationErrorCode, LucideIcon>> = {
	REF_NOT_ALLOWED: Link2Off,
	REF_FORMAT: Link2Off,
	REF_UNKNOWN_NODE: Link2Off,
	REF_SELF: Link2Off,
	REF_NOT_UPSTREAM: Link2Off,
	REF_UNKNOWN_FIELD: Link2Off,
	TRIGGER_COUNT: Unplug,
	EDGE_INVALID: Unplug,
	ORPHAN_NODE: Unplug,
	CRON: Clock,
	TOO_LARGE: FileWarning,
}

type WorkflowValidationIssueListProps = {
	errors: WorkflowValidationErrorDto[]
	/** 입력 칸의 `aria-describedby`로 연결할 때 쓴다. */
	id?: string
	className?: string
}

/**
 * 서버 정적 검사 오류 목록. 설정 칸 아래, 설정 패널 상단, 캔버스 배너가 함께 쓰는 렌더러다.
 * 문구는 서버 `message`를 그대로 보여 준다.
 */
const WorkflowValidationIssueList = ({ errors, id, className }: WorkflowValidationIssueListProps) => {
	if (errors.length === 0) return null
	return (
		<ul id={id} className={cn('m-0 flex list-none flex-col gap-1 p-0', className)}>
			{errors.map(error => {
				const Icon = CODE_ICON[error.code] ?? CircleAlert
				return (
					<li
						key={`${error.code}:${error.field ?? ''}:${error.message}`}
						className='flex items-start gap-1.5 typo-caption1_semibold text-danger-900'
					>
						<Icon size={13} aria-hidden='true' className='mt-0.5 shrink-0' />
						<span className='min-w-0 break-words'>{error.message}</span>
					</li>
				)
			})}
		</ul>
	)
}

export default WorkflowValidationIssueList
