import DashboardErrorRail from '../components/dashboard/DashboardErrorRail'
import DashboardHeroSection from '../components/dashboard/DashboardHeroSection'
import DashboardRunTable from '../components/dashboard/DashboardRunTable'
import DashboardWorkflowSection from '../components/dashboard/DashboardWorkflowSection'

const MainPage = () => (
	<section className='flex flex-col gap-6'>
		<header>
			<h1 className='typo-title2_bold text-main-deep-blue'>대시보드</h1>
			<p className='typo-body2_regular mt-1 text-neutral-500'>워크플로우 실행 현황과 오류를 한눈에 확인하세요.</p>
		</header>
		<div className='flex flex-col gap-8'>
			<DashboardHeroSection />
			<DashboardWorkflowSection />
			<div className='flex w-full flex-col gap-4'>
				<DashboardRunTable />
				<DashboardErrorRail />
			</div>
		</div>
	</section>
)

export default MainPage
