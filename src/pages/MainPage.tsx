import { Suspense, useEffect } from 'react'
import { LazyDashboardHeroSection, preloadDashboardHeroSection } from '@/app/lazyModules'
import DashboardErrorRail from '@/components/dashboard/DashboardErrorRail'
import DashboardRunTable from '@/components/dashboard/DashboardRunTable'
import DashboardWorkflowSection from '@/components/dashboard/DashboardWorkflowSection'
import {
	DashboardHeroChunkFallback,
	DashboardResourceStatus,
	DashboardSummaryError,
	DashboardSummarySkeleton,
} from '@/components/dashboard/DashboardAsyncState'
import { useDashboardViewModel } from '@/hooks/dashboard/useDashboardViewModel'

const MainPage = () => {
	const viewModel = useDashboardViewModel()

	// hero 차트는 요약 데이터가 도착한 뒤에 렌더되므로, 그때 chunk 요청을 시작하지 않도록 mount 시점에 미리 받는다.
	useEffect(preloadDashboardHeroSection, [])

	return (
		<section className='flex flex-col gap-6'>
			<header>
				<h1 className='typo-title2_bold text-main-deep-blue'>대시보드</h1>
				<p className='typo-body2_regular mt-1 text-neutral-500'>워크플로우 실행 현황과 오류를 한눈에 확인하세요.</p>
			</header>
			<div className='flex flex-col gap-8'>
				<div aria-busy={viewModel.summaryResource.isLoading || viewModel.summaryResource.isRefetching}>
					<DashboardResourceStatus
						{...viewModel.summaryResource}
						loadingMessage='대시보드 요약 불러오는 중'
						errorMessage='대시보드 요약을 불러오지 못했습니다. 다시 시도할 수 있습니다.'
					/>
					{viewModel.summaryResource.isLoading ? (
						<DashboardSummarySkeleton />
					) : viewModel.summaryResource.isLoadingError ? (
						<DashboardSummaryError retry={viewModel.summaryResource.retry} />
					) : (
						<div className='flex flex-col gap-8'>
							<Suspense fallback={<DashboardHeroChunkFallback />}>
								<LazyDashboardHeroSection
									hero={viewModel.hero}
									hourlyExecutions={viewModel.hourlyExecutions}
									resource={viewModel.summaryResource}
								/>
							</Suspense>
							<DashboardWorkflowSection workflow={viewModel.workflow} />
						</div>
					)}
				</div>
				<div className='flex w-full flex-col gap-4'>
					<DashboardRunTable runs={viewModel.runs} />
					<DashboardErrorRail errors={viewModel.errors} />
				</div>
			</div>
		</section>
	)
}

export default MainPage
