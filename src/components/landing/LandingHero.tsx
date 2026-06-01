import { Link } from 'react-router'
import symbolNoLine from '@/assets/symbolNoLine.png'
import { ArrowRight, Play, Sparkles, Workflow, Zap } from 'lucide-react'

const LandingHero = () => (
	<section className='relative overflow-hidden bg-linear-to-b from-[#eaf7fe] via-neutral-white to-neutral-white'>
		<div
			className='pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-main-light-blue/60 blur-3xl'
			aria-hidden
		/>
		<div
			className='pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-sub-blue/20 blur-3xl'
			aria-hidden
		/>

		<div className='mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-2 lg:items-center lg:gap-8 lg:px-8 lg:py-24'>
			<div className='flex flex-col gap-6'>
				<span className='inline-flex w-fit items-center gap-2 rounded-full border border-[#cde9f4] bg-white/80 px-3 py-1 typo-caption1_semibold text-main-deep-blue'>
					<Sparkles size={14} className='text-main-blue' />
					워크플로우 자동화 플랫폼
				</span>

				<h1 className='m-0 font-logo_regular text-4xl leading-tight text-main-deep-blue sm:text-5xl lg:text-[3.25rem]'>
					반복 업무는
					<br />
					IEUM에 맡기고
					<br />
					<span className='text-main-blue'>본업에 집중</span>하세요
				</h1>

				<p className='m-0 max-w-lg typo-body2_regular text-neutral-600'>
					슬랙, GitHub, Notion까지 한 화면에서 연결하고. 드래그 앤 드롭으로 워크플로우를 설계하고, 실행 현황과 오류를
					실시간으로 확인하세요.
				</p>

				<div className='flex flex-wrap items-center gap-3'>
					<Link
						to='/auth'
						className='inline-flex h-12 items-center gap-2 rounded-brand-md bg-main-blue px-6 typo-body2_semibold text-neutral-white shadow-md transition-colors hover:bg-main-deep-blue'
					>
						무료로 시작하기
						<ArrowRight size={18} />
					</Link>
					<Link
						to='/main'
						className='inline-flex h-12 items-center gap-2 rounded-brand-md border border-neutral-200 bg-neutral-white px-6 typo-body2_semibold text-neutral-700 transition-colors hover:border-main-blue hover:text-main-blue'
					>
						<Play size={18} />
						대시보드 둘러보기
					</Link>
				</div>

				<ul className='m-0 flex flex-wrap gap-4 p-0 list-none typo-caption1_medium text-neutral-500'>
					<li className='inline-flex items-center gap-1.5'>
						<Zap size={14} className='text-main-blue' />
						코드 없이 구성
					</li>
					<li className='inline-flex items-center gap-1.5'>
						<Workflow size={14} className='text-main-blue' />
						24시간 모니터링
					</li>
				</ul>
			</div>

			<div className='relative mx-auto w-full max-w-md lg:max-w-none'>
				<div className='overflow-hidden rounded-2xl border border-[#cde9f4] bg-neutral-white shadow-[0_24px_48px_-12px_rgba(41,83,124,0.18)]'>
					<div className='flex items-center gap-2 border-b border-neutral-100 bg-main-light-blue/50 px-4 py-3'>
						<span className='h-2.5 w-2.5 rounded-full bg-danger-400' />
						<span className='h-2.5 w-2.5 rounded-full bg-node-yellow' />
						<span className='h-2.5 w-2.5 rounded-full bg-node-green' />
						<span className='ml-2 typo-caption1_medium text-neutral-400'>워크플로우 미리보기</span>
					</div>
					<div className='space-y-3 bg-linear-to-br from-main-light-blue/30 to-neutral-white p-6'>
						<div className='flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-white p-3 shadow-sm'>
							<img src={symbolNoLine} alt='' className='h-9 w-9' />
							<div>
								<p className='m-0 typo-body3_semibold text-neutral-900'>신규 리드 → CRM 등록</p>
								<p className='m-0 typo-caption1_regular text-neutral-400'>방금 실행 · 성공</p>
							</div>
							<span className='ml-auto rounded-full bg-main-light-blue px-2 py-0.5 typo-caption1_semibold text-main-deep-blue'>
								99%
							</span>
						</div>
						<div className='grid grid-cols-3 gap-2'>
							{['Webhook', 'GPT-4', 'Slack'].map((step, i) => (
								<div
									key={step}
									className='rounded-lg border border-dashed border-main-blue/40 bg-white/80 px-2 py-3 text-center typo-caption1_semibold text-main-deep-blue'
								>
									{i + 1}. {step}
								</div>
							))}
						</div>
						<div className='h-2 overflow-hidden rounded-full bg-neutral-100'>
							<div className='h-full w-4/5 rounded-full bg-main-blue' />
						</div>
						<p className='m-0 text-center typo-caption1_regular text-neutral-500'>
							오늘 1,240회 실행 · 어제 대비 +12%
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>
)

export default LandingHero
