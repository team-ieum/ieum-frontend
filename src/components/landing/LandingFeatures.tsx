import { BarChart3, Blocks, GitBranch, Shield } from 'lucide-react'

const FEATURES = [
	{
		icon: GitBranch,
		title: '비주얼 워크플로우',
		desc: '트리거, 조건, 액션을 노드로 연결해 복잡한 업무 흐름을 직관적으로 설계합니다.',
	},
	{
		icon: Blocks,
		title: '통합 설정 한곳에서',
		desc: 'Slack, Discord, GitHub, Notion 등 서비스를 연결하고 OAuth·웹훅을 안전하게 관리합니다.',
	},
	{
		icon: BarChart3,
		title: '실행 대시보드',
		desc: '시간대별 실행량, 성공률, 최근 로그와 오류 요약을 한눈에 파악할 수 있습니다.',
	},
	{
		icon: Shield,
		title: '안정적인 운영',
		desc: '실패 시 알림과 재시도 흐름으로 중요한 자동화가 멈추지 않도록 돕습니다.',
	},
] as const

const LandingFeatures = () => (
	<section id='features' className='border-t border-neutral-100 bg-neutral-white py-20'>
		<div className='mx-auto max-w-6xl px-5 lg:px-8'>
			<div className='mb-12 max-w-2xl'>
				<p className='m-0 typo-caption1_semibold uppercase tracking-wider text-main-blue'>Features</p>
				<h2 className='typo-title2_bold m-0 mt-2 text-main-deep-blue'>팀이 바로 쓸 수 있는 자동화 도구</h2>
				<p className='typo-body2_regular m-0 mt-3 text-neutral-600'>
					설계부터 연동, 모니터링까지 IEUM 하나로 이어집니다.
				</p>
			</div>

			<div className='grid gap-5 sm:grid-cols-2'>
				{FEATURES.map(({ icon: Icon, title, desc }) => (
					<article
						key={title}
						className='flex gap-4 rounded-brand-lg border border-neutral-200 bg-neutral-white p-6 transition-shadow hover:shadow-md'
					>
						<span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-main-light-blue text-main-blue'>
							<Icon size={22} />
						</span>
						<div>
							<h3 className='typo-body2_semibold m-0 text-neutral-900'>{title}</h3>
							<p className='typo-body3_regular m-0 mt-1.5 text-neutral-500'>{desc}</p>
						</div>
					</article>
				))}
			</div>
		</div>
	</section>
)

export default LandingFeatures
