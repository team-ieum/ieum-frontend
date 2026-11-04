import { ChevronRight } from 'lucide-react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import { useIntegrationServiceWorkflowListViewModel } from '@/hooks/integration/useIntegrationServiceWorkflowListViewModel'
import type { IntegrationService } from '@/types/integration'
import { cn } from '@/utils/cn'

// 실제 행 수를 알 수 없어, 목록이 짧은 서비스에서도 데이터 전환 때 높이 변화가 크지 않도록 2행으로 고정한다.
const SKELETON_ROW_COUNT = 2

/**
 * 행 높이는 설명이 없는 실제 워크플로우 행과 같아야 한다.
 * 첫 페이지 오류 영역의 `min-h-39.25`는 이 skeleton 전체 높이(157px)에 맞춘 값이므로 함께 바꾼다.
 */
const IntegrationServiceWorkflowListSkeleton = () => (
	<div role='status' aria-label='연동 워크플로우 불러오는 중' aria-busy='true'>
		{Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
			<div
				key={index}
				aria-hidden='true'
				className={cn('flex items-center gap-4 px-6 py-4', index > 0 && 'border-t border-neutral-100')}
			>
				<div className='min-w-0 flex-1'>
					<div className='flex items-center gap-2'>
						<SkeletonPulse className='h-4 w-40 rounded bg-neutral-200' />
						<SkeletonPulse className='h-5.5 w-10 rounded-full bg-neutral-200' />
						<SkeletonPulse className='h-5.5 w-14 rounded-full bg-neutral-200' />
					</div>
					<div className='mt-1.5 flex h-lh items-center typo-caption1_regular'>
						<SkeletonPulse className='h-3 w-36 rounded bg-neutral-200' />
					</div>
				</div>
			</div>
		))}
	</div>
)

type IntegrationServiceWorkflowListProps = {
	service: IntegrationService
}

const IntegrationServiceWorkflowList = ({ service }: IntegrationServiceWorkflowListProps) => {
	const viewModel = useIntegrationServiceWorkflowListViewModel(service.brand)

	if (!viewModel.isSupportedService) {
		return (
			<div className='rounded-brand-md border border-neutral-200 bg-neutral-white px-6 py-8 text-center shadow-sm'>
				<p className='m-0 typo-body3_regular text-neutral-500'>이 서비스의 워크플로우 목록을 조회할 수 없습니다.</p>
			</div>
		)
	}

	return (
		<div
			aria-busy={viewModel.resource.isLoading}
			className='overflow-hidden rounded-brand-md border border-neutral-200 bg-neutral-white shadow-sm'
		>
			<div className='flex items-center justify-between border-b border-neutral-100 px-6 py-4'>
				<div>
					<h3 className='typo-body2_semibold m-0 text-neutral-900'>연동 워크플로우</h3>
					<p className='typo-caption1_regular m-0 mt-0.5 text-neutral-500'>
						이 서비스를 사용하는 워크플로우 목록입니다.
					</p>
				</div>
				<div className='flex items-center gap-2'>
					{/* 갱신 실패 중의 재시도 상태는 아래 배너가 안내한다. */}
					{viewModel.resource.isRefetching && !viewModel.resource.isRefetchError ? (
						<span role='status' className='typo-caption1_medium text-neutral-500'>
							업데이트 중…
						</span>
					) : null}
					{!viewModel.resource.isLoading && !viewModel.resource.isLoadingError && (
						<span className='inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-main-light-blue px-2 typo-caption1_semibold text-main-deep-blue'>
							{viewModel.workflows.length}
						</span>
					)}
				</div>
			</div>

			{viewModel.resource.isRefetchError ? (
				<div
					role='status'
					className='flex items-center gap-2 border-b border-neutral-100 bg-danger-100 px-6 py-2 typo-caption1_medium text-danger-700'
				>
					<span>
						{viewModel.resource.isRefetching ? '최신 목록을 다시 불러오는 중…' : '최신 목록을 불러오지 못했습니다.'}
					</span>
					{/* 재시도 중에도 버튼에 focus를 남기려고 disabled 대신 aria-disabled를 쓴다. 클릭은 resource.retry가 무시한다. */}
					<button
						type='button'
						onClick={viewModel.resource.retry}
						aria-disabled={viewModel.resource.isRefetching || undefined}
						className='underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue aria-disabled:cursor-wait aria-disabled:opacity-60'
					>
						다시 시도
					</button>
				</div>
			) : null}

			{viewModel.resource.isLoading ? (
				<IntegrationServiceWorkflowListSkeleton />
			) : viewModel.resource.isLoadingError ? (
				<div role='alert' className='flex min-h-39.25 flex-col items-center justify-center gap-3 px-6 py-10 text-center'>
					<p className='m-0 typo-body3_regular text-danger-700'>워크플로우 목록을 불러오지 못했습니다.</p>
					<button
						type='button'
						onClick={viewModel.resource.retry}
						className='rounded-brand-sm border border-danger-300 bg-neutral-white px-3 py-1.5 typo-caption1_semibold text-danger-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
					>
						다시 시도
					</button>
				</div>
			) : viewModel.workflows.length === 0 ? (
				<p className='m-0 px-6 py-10 text-center typo-body3_regular text-neutral-500'>
					이 서비스를 사용하는 워크플로우가 없습니다.
				</p>
			) : (
				<ul className='m-0 flex list-none flex-col p-0'>
					{viewModel.workflows.map((workflow, index) => (
						<li key={workflow.id} className={cn(index > 0 && 'border-t border-neutral-100')}>
							<button
								type='button'
								onClick={() => viewModel.handleOpenWorkflow(workflow)}
								className='group flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-neutral-50'
							>
								<div className='min-w-0 flex-1'>
									<div className='flex flex-wrap items-center gap-2'>
										<p className='typo-body3_semibold m-0 truncate text-neutral-900'>{workflow.name}</p>
										<span
											className={cn(
												'inline-flex rounded-full px-2 py-0.5 typo-caption1_semibold',
												workflow.isActive
													? 'bg-main-light-blue text-main-deep-blue'
													: 'bg-neutral-100 text-neutral-500'
											)}
										>
											{workflow.isActive ? '활성' : '일시정지'}
										</span>
										<span className='inline-flex rounded-full bg-neutral-100 px-2 py-0.5 typo-caption1_medium text-neutral-600'>
											{workflow.triggerLabel}
										</span>
									</div>
									{workflow.description ? (
										<p className='typo-caption1_regular m-0 mt-1 line-clamp-1 text-neutral-500'>
											{workflow.description}
										</p>
									) : null}
									<div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 typo-caption1_regular text-neutral-400'>
										<span>노드 {workflow.usedNodeCount}개 사용</span>
										<span>{workflow.updatedAtLabel} 수정</span>
									</div>
								</div>
								<ChevronRight
									size={16}
									className='shrink-0 text-neutral-300 transition-colors group-hover:text-main-blue'
								/>
							</button>
						</li>
					))}
				</ul>
			)}

			{viewModel.hasNextPage ? (
				<div className='border-t border-neutral-100 px-6 py-4'>
					{viewModel.isFetchNextPageError && !viewModel.isFetchingNextPage ? (
						<p role='alert' className='m-0 mb-2 text-center typo-caption1_medium text-danger-700'>
							다음 워크플로우를 불러오지 못했습니다.
						</p>
					) : null}
					<button
						type='button'
						onClick={viewModel.handleLoadMore}
						disabled={viewModel.isFetchingNextPage}
						className='inline-flex h-9 w-full items-center justify-center rounded-brand-sm border border-neutral-200 bg-neutral-white typo-body3_semibold text-neutral-700 transition-colors hover:border-main-blue hover:text-main-blue disabled:cursor-not-allowed disabled:opacity-60'
					>
						{viewModel.isFetchingNextPage ? '불러오는 중…' : viewModel.isFetchNextPageError ? '다시 시도' : '더 보기'}
					</button>
				</div>
			) : null}
		</div>
	)
}

export default IntegrationServiceWorkflowList
