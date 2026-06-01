import { Plus, Sparkles } from 'lucide-react'
import type { ReactElement } from 'react'
import WorkflowActiveFilters from '@/components/workflow/list/WorkflowActiveFilters'
import WorkflowEmptyState from '@/components/workflow/list/WorkflowEmptyState'
import WorkflowFilterSidebar from '@/components/workflow/list/WorkflowFilterSidebar'
import WorkflowListCard from '@/components/workflow/list/WorkflowListCard'
import WorkflowListTable from '@/components/workflow/list/WorkflowListTable'
import WorkflowListToolbar from '@/components/workflow/list/WorkflowListToolbar'
import { useWorkflowListViewModel } from '@/hooks/workflow/useWorkflowListViewModel'
import Spinner from '@/components/common/Spinner'

const WorkflowListPage = (): ReactElement => {
	const viewModel = useWorkflowListViewModel()

	return (
		<section className='flex flex-col gap-5'>
			{/* 페이지 헤더 */}
			<header className='flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,.04)] lg:flex-row lg:items-center lg:justify-between'>
				<div>
					<h1 className='typo-title2_bold text-main-deep-blue'>워크플로우</h1>
					<p className='mt-1 typo-body2_regular text-neutral-500'>
						연결된 서비스로 만든 자동화 흐름을 한 곳에서 관리합니다.
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<button
						type='button'
						disabled
						aria-disabled='true'
						className='inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-[10px] border border-[#cde9f4] bg-white px-4 typo-body2_semibold text-main-deep-blue/50 opacity-60'
					>
						<Sparkles size={15} />
						<span>템플릿</span>
					</button>
					<button
						type='button'
						onClick={viewModel.handleCreateWorkflow}
						className='inline-flex h-10 items-center gap-2 rounded-[10px] bg-main-deep-blue px-4 typo-body2_semibold text-white shadow-[0_8px_18px_-10px_rgba(41,83,124,.7)] transition-opacity hover:opacity-90'
					>
						<Plus size={16} />
						<span>새 워크플로우</span>
					</button>
				</div>
			</header>

			<div className='grid gap-5 lg:grid-cols-[256px_minmax(0,1fr)]'>
				<WorkflowFilterSidebar
					filters={viewModel.filters}
					serviceCounts={viewModel.serviceCounts}
					categoryCounts={viewModel.categoryCounts}
					statusCounts={viewModel.statusCounts}
					activeFilterCount={viewModel.activeFilterCount}
					onToggleService={viewModel.toggleService}
					onToggleCategory={viewModel.toggleCategory}
					onToggleStatus={viewModel.toggleStatus}
					onClearFilters={viewModel.clearFilters}
				/>

				<main className='min-w-0'>
					<WorkflowListToolbar
						search={viewModel.search}
						sort={viewModel.sort}
						view={viewModel.view}
						resultCount={viewModel.workflows.length}
						totalCount={viewModel.totalCount}
						onSearchChange={viewModel.onSearchChange}
						onSortChange={viewModel.onSortChange}
						onViewChange={viewModel.onViewChange}
					/>

					<div className='mt-3'>
						<WorkflowActiveFilters filters={viewModel.activeFilters} onRemove={viewModel.removeFilter} />
					</div>

					{/* 결과 영역 */}
					<div className='mt-4'>
						{viewModel.isLoading ? (
							<div className='flex items-center justify-center py-20'>
								<Spinner size='lg' />
							</div>
						) : viewModel.workflows.length === 0 ? (
							<WorkflowEmptyState onReset={viewModel.clearFilters} onCreate={viewModel.handleCreateWorkflow} />
						) : viewModel.view === 'card' ? (
							<div className='grid gap-3 md:grid-cols-2 2xl:grid-cols-3'>
								{viewModel.workflows.map(workflow => (
									<WorkflowListCard
										key={workflow.id}
										workflow={workflow}
										onOpen={viewModel.handleOpenWorkflow}
									/>
								))}
							</div>
						) : (
							<WorkflowListTable workflows={viewModel.workflows} onOpen={viewModel.handleOpenWorkflow} />
						)}
					</div>
				</main>
			</div>
		</section>
	)
}

export default WorkflowListPage
