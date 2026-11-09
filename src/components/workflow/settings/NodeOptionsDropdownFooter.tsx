import { Link } from 'react-router'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import type { NodeOptionsComboboxState } from '@/hooks/workflow/useNodeOptionsCombobox'

type NodeOptionsDropdownFooterProps = {
	/** 불러오는 중 안내 이름(`{title} 목록 불러오는 중`)에 쓴다. */
	title: string
	combobox: NodeOptionsComboboxState
}

/** options 드롭다운 목록 아래의 불러오는 중·오류 안내·더 불러오기·빈 목록 안내. 부모 칸이 막혔으면 그리지 않는다. */
const NodeOptionsDropdownFooter = ({ title, combobox }: NodeOptionsDropdownFooterProps) => {
	// 부모 칸이 막혔으면 목록을 부르지 않는다. 비우기 행이 있는 칸은 그 행만 남고, 이유는 칸 아래 안내로 이미 알린다.
	if (combobox.isBlocked) return null

	if (combobox.isLoading) {
		return (
			<div role='status' aria-label={`${title} 목록 불러오는 중`} aria-busy='true' className='flex flex-col gap-1 pt-1'>
				{[0, 1, 2].map(index => (
					<SkeletonPulse key={index} className='h-8 rounded-lg bg-neutral-100' />
				))}
			</div>
		)
	}

	const notice = combobox.errorNotice
	if (notice) {
		return (
			<div
				role='alert'
				className='flex flex-col items-start gap-2 px-2.5 pt-2 pb-1 text-xs leading-relaxed text-neutral-600'
			>
				<p className='m-0'>{notice.message}</p>
				{notice.action === 'connect' ? (
					<Link to='/inter-setting' className='font-semibold text-main-deep-blue underline underline-offset-2'>
						통합 설정 열기
					</Link>
				) : (
					<button
						type='button'
						onClick={combobox.retry}
						disabled={combobox.isFetchingNextPage}
						className='rounded-md border border-neutral-200 px-2 py-1 font-semibold text-main-deep-blue hover:bg-neutral-50 disabled:opacity-60'
					>
						{combobox.isFetchingNextPage ? '불러오는 중…' : '다시 시도'}
					</button>
				)}
			</div>
		)
	}

	if (combobox.hasNextPage) {
		return (
			<button
				type='button'
				onClick={combobox.fetchNextPage}
				disabled={combobox.isFetchingNextPage}
				className='mt-0.5 w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-main-deep-blue hover:bg-neutral-50 disabled:opacity-60'
			>
				{combobox.isFetchingNextPage ? '불러오는 중…' : '더 불러오기'}
			</button>
		)
	}

	if (combobox.items.length === 0) {
		return <p className='m-0 px-2.5 pt-1.5 pb-1 text-xs text-neutral-500'>고를 수 있는 항목이 없어요.</p>
	}
	return null
}

export default NodeOptionsDropdownFooter
