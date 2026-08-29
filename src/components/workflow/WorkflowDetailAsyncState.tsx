import type { ReactElement } from 'react'
import SkeletonPulse from '@/components/common/SkeletonPulse'

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

export const WorkflowDetailError = ({ isNotFound, onRetry, onBackToList }: WorkflowDetailErrorProps): ReactElement => (
	<div className={pageClass} style={pageStyle}>
		<div className='h-16 shrink-0 border-b border-neutral-200 bg-neutral-white' />
		<div className='flex flex-1 items-center justify-center bg-[#f7f6fc] px-6'>
			<div className='w-full max-w-md rounded-xl border border-neutral-200 bg-neutral-white px-8 py-10 text-center shadow-sm'>
				<h1 className='m-0 typo-title2_bold text-main-deep-blue'>
					{isNotFound ? '워크플로우를 찾을 수 없어요' : '워크플로우를 불러오지 못했어요'}
				</h1>
				<p className='mt-2 mb-0 typo-body3_regular text-neutral-500'>
					{isNotFound ? '삭제되었거나 접근할 수 없는 워크플로우입니다.' : '잠시 후 다시 시도해주세요.'}
				</p>
				<button
					type='button'
					onClick={isNotFound ? onBackToList : onRetry}
					className='mt-6 rounded-[10px] bg-main-deep-blue px-4 py-2.5 typo-body2_semibold text-neutral-white transition-opacity hover:opacity-90'
				>
					{isNotFound ? '워크플로우 목록으로' : '다시 시도'}
				</button>
			</div>
		</div>
	</div>
)
