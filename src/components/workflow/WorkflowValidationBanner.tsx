import { CircleAlert } from 'lucide-react'
import WorkflowValidationIssueList from '@/components/workflow/WorkflowValidationIssueList'
import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'

type WorkflowValidationBannerProps = {
	/** `nodeId`가 null인 워크플로우 전체 오류. 비어 있으면 배너를 그리지 않는다. */
	errors: WorkflowValidationErrorDto[]
}

/** 특정 노드에 속하지 않는 서버 검사 오류를 캔버스 상단에 보여 준다. */
const WorkflowValidationBanner = ({ errors }: WorkflowValidationBannerProps) => {
	if (errors.length === 0) return null
	return (
		<section
			aria-label='워크플로우 검사 오류'
			className='pointer-events-auto absolute top-3 left-1/2 z-10 flex max-h-40 w-[min(32rem,calc(100%-1.5rem))] -translate-x-1/2 flex-col gap-1.5 overflow-y-auto rounded-xl border border-danger-300 bg-danger-100 px-3.5 py-2.5 shadow-sm'
		>
			<p className='m-0 flex items-center gap-1.5 typo-caption1_bold text-danger-900'>
				<CircleAlert size={14} aria-hidden='true' />
				워크플로우 전체 문제 {errors.length}건
			</p>
			<WorkflowValidationIssueList errors={errors} />
		</section>
	)
}

export default WorkflowValidationBanner
