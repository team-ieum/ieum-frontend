import { Check, ChevronDown, LayoutGrid, List, Search } from 'lucide-react'
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactElement } from 'react'
import { WORKFLOW_SORT_OPTIONS } from '@/constants/workflow/workflowList'
import type { WorkflowSortKey, WorkflowViewMode } from '@/types/workflowList'
import { cn } from '@/utils/cn'

type WorkflowListToolbarProps = {
	search: string
	sort: WorkflowSortKey
	view: WorkflowViewMode
	resultCount: number
	totalCount: number
	onSearchChange: (value: string) => void
	onSortChange: (value: WorkflowSortKey) => void
	onViewChange: (value: WorkflowViewMode) => void
}

const SORT_MENU_ID = 'workflow-sort-menu'

const WorkflowListToolbar = ({
	search,
	sort,
	view,
	resultCount,
	totalCount,
	onSearchChange,
	onSortChange,
	onViewChange,
}: WorkflowListToolbarProps): ReactElement => {
	const [isSortOpen, setIsSortOpen] = useState(false)
	const sortContainerRef = useRef<HTMLDivElement>(null)
	const currentSort = WORKFLOW_SORT_OPTIONS.find(option => option.id === sort) ?? WORKFLOW_SORT_OPTIONS[0]

	useEffect(() => {
		if (!isSortOpen) {
			return
		}

		const handleDocumentMouseDown = (event: MouseEvent): void => {
			if (!sortContainerRef.current?.contains(event.target as Node)) {
				setIsSortOpen(false)
			}
		}

		document.addEventListener('mousedown', handleDocumentMouseDown)

		return () => {
			document.removeEventListener('mousedown', handleDocumentMouseDown)
		}
	}, [isSortOpen])

	const handleSortKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		if (event.key === 'Escape') {
			setIsSortOpen(false)
		}
	}

	const handleSortBlur = (event: FocusEvent<HTMLDivElement>): void => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			setIsSortOpen(false)
		}
	}

	return (
		<div className='flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,.04)] xl:flex-row xl:items-center'>
			<label className='relative min-w-0 flex-1'>
				<Search size={17} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400' />
				<input
					value={search}
					onChange={event => onSearchChange(event.target.value)}
					placeholder='이름, 서비스 검색'
					className='h-10 w-full rounded-[10px] border border-neutral-200 bg-neutral-50 pl-9 pr-3 typo-body2_regular text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-main-blue focus:bg-white'
				/>
			</label>

			<span className='typo-caption1_regular text-neutral-500'>
				{resultCount === totalCount ? `총 ${totalCount}개` : `${resultCount}개 / 총 ${totalCount}개`}
			</span>

			<div className='flex flex-wrap items-center gap-2 xl:ml-auto'>
				<div ref={sortContainerRef} className='relative' onKeyDown={handleSortKeyDown} onBlur={handleSortBlur}>
					<button
						type='button'
						onClick={() => setIsSortOpen(prev => !prev)}
						aria-haspopup='menu'
						aria-expanded={isSortOpen}
						aria-controls={SORT_MENU_ID}
						className='inline-flex h-10 items-center gap-2 rounded-[10px] border border-neutral-200 bg-white px-3 typo-body2_medium text-neutral-700 transition-colors hover:bg-neutral-50'
					>
						{currentSort.label}
						<ChevronDown size={16} className='text-neutral-400' />
					</button>

					{isSortOpen && (
						<div
							id={SORT_MENU_ID}
							role='menu'
							tabIndex={-1}
							className='absolute right-0 top-[calc(100%+6px)] z-20 w-40 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_16px_32px_-12px_rgba(16,24,40,.22)]'
							onMouseLeave={() => setIsSortOpen(false)}
						>
							{WORKFLOW_SORT_OPTIONS.map(option => (
								<button
									key={option.id}
									type='button'
									role='menuitemradio'
									aria-checked={option.id === sort}
									onClick={() => {
										onSortChange(option.id)
										setIsSortOpen(false)
									}}
									className={cn(
										'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left typo-body2_regular transition-colors',
										option.id === sort
											? 'bg-main-light-blue text-main-deep-blue'
											: 'text-neutral-700 hover:bg-neutral-50'
									)}
								>
									{option.id === sort ? <Check size={15} /> : <span className='h-[15px] w-[15px]' />}
									{option.label}
								</button>
							))}
						</div>
					)}
				</div>

				<div className='inline-flex rounded-[10px] border border-neutral-200 bg-neutral-100 p-1' aria-label='보기 방식'>
					<button
						type='button'
						onClick={() => onViewChange('card')}
						aria-pressed={view === 'card'}
						title='카드 보기'
						aria-label='카드 보기'
						className={cn(
							'grid h-8 w-8 place-items-center rounded-lg transition-colors',
							view === 'card'
								? 'bg-white text-main-deep-blue shadow-[0_1px_2px_rgba(16,24,40,.08)]'
								: 'text-neutral-400 hover:text-neutral-600'
						)}
					>
						<LayoutGrid size={17} />
					</button>
					<button
						type='button'
						onClick={() => onViewChange('row')}
						aria-pressed={view === 'row'}
						title='행 보기'
						aria-label='행 보기'
						className={cn(
							'grid h-8 w-8 place-items-center rounded-lg transition-colors',
							view === 'row'
								? 'bg-white text-main-deep-blue shadow-[0_1px_2px_rgba(16,24,40,.08)]'
								: 'text-neutral-400 hover:text-neutral-600'
						)}
					>
						<List size={17} />
					</button>
				</div>
			</div>
		</div>
	)
}

export default WorkflowListToolbar
