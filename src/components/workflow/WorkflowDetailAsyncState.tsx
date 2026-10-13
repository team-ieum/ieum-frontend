import type { ReactElement } from 'react'
import notFoundSymbol from '@/assets/404symbol.png'
import errorSymbol from '@/assets/errorsymbol.png'
import ErrorPageView from '@/components/common/ErrorPageView'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import { ERROR_PAGE_ACTION_LABEL, WORKFLOW_LOAD_ERROR_TEXT, WORKFLOW_NOT_FOUND_TEXT } from '@/constants/errorPage'

const pageClass = '-mt-6 -mx-6 -mb-6 lg:-ml-6 flex flex-col'
const pageStyle = { height: 'calc(100vh - var(--layout-header-height))' }

export const WorkflowDetailSkeleton = (): ReactElement => (
	<div className={pageClass} style={pageStyle} role='status' aria-label='워크플로우 상세 불러오는 중' aria-busy='true'>
		<div
			aria-hidden='true'
			className='flex h-16 shrink-0 items-center gap-3.5 border-b border-neutral-200 bg-neutral-white px-6'
		>
			<SkeletonPulse className='size-9 rounded-[10px] bg-neutral-200' />
			<SkeletonPulse className='h-7 w-56 rounded bg-neutral-200' />
			<SkeletonPulse className='ml-auto h-9 w-28 rounded-[10px] bg-neutral-200' />
		</div>
		<div aria-hidden='true' className='relative flex-1 bg-[#f7f6fc]'>
			<SkeletonPulse className='absolute inset-6 rounded-xl border border-neutral-200 bg-neutral-100' />
			<SkeletonPulse className='absolute right-6 bottom-6 h-14 w-14 rounded-full bg-neutral-300' />
		</div>
	</div>
)

type WorkflowDetailErrorProps = {
	isNotFound: boolean
	onRetry: () => void
	onBackToList: () => void
}

export const WorkflowDetailError = ({ isNotFound, onRetry, onBackToList }: WorkflowDetailErrorProps): ReactElement => {
	const backToList = { label: ERROR_PAGE_ACTION_LABEL.workflowList, onClick: onBackToList }

	return isNotFound ? (
		<ErrorPageView {...WORKFLOW_NOT_FOUND_TEXT} illustrationSrc={notFoundSymbol} primaryAction={backToList} />
	) : (
		<ErrorPageView
			{...WORKFLOW_LOAD_ERROR_TEXT}
			illustrationSrc={errorSymbol}
			primaryAction={{ label: ERROR_PAGE_ACTION_LABEL.retry, onClick: onRetry }}
			secondaryAction={backToList}
		/>
	)
}
