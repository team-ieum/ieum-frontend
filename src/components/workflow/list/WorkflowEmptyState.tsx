import { RotateCcw, SearchX, Sparkles } from 'lucide-react'
import type { ReactElement } from 'react'

type WorkflowEmptyStateProps = {
	onReset: () => void
	onCreate: () => void
}

const WorkflowEmptyState = ({ onReset, onCreate }: WorkflowEmptyStateProps): ReactElement => (
	<div className='flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center'>
		<div className='grid h-14 w-14 place-items-center rounded-2xl bg-main-light-blue text-main-deep-blue'>
			<SearchX size={28} />
		</div>
		<h2 className='mt-4 typo-title3_semibold text-neutral-800'>조건에 맞는 워크플로우가 없어요</h2>
		<p className='mt-2 max-w-[360px] typo-body3_regular text-neutral-500'>
			필터를 줄이거나 검색어를 바꿔보세요. 새 워크플로우로 바로 시작할 수도 있습니다.
		</p>
		<div className='mt-5 flex flex-wrap justify-center gap-2'>
			<button
				type='button'
				onClick={onReset}
				className='inline-flex h-10 items-center gap-2 rounded-[10px] border border-neutral-200 bg-white px-4 typo-body2_semibold text-neutral-700 transition-colors hover:bg-neutral-50'
			>
				<RotateCcw size={15} />
				<span>필터 초기화</span>
			</button>
			<button
				type='button'
				onClick={onCreate}
				className='inline-flex h-10 items-center gap-2 rounded-[10px] bg-main-deep-blue px-4 typo-body2_semibold text-white transition-opacity hover:opacity-90'
			>
				<Sparkles size={15} />
				<span>새 워크플로우</span>
			</button>
		</div>
	</div>
)

export default WorkflowEmptyState
