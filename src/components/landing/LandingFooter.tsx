import { Link } from 'react-router'
import symbol from '@/assets/symbol.png'

const LandingFooter = () => (
	<footer className='border-t border-neutral-200 bg-neutral-50 py-10'>
		<div className='mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 sm:flex-row lg:px-8'>
			<div className='flex items-center gap-2'>
				<img src={symbol} alt='' className='h-6 w-6' />
				<span className='font-logo_regular text-lg text-main-deep-blue'>IEUM</span>
				<span className='typo-caption1_regular text-neutral-400'>beta · v0.0.1</span>
			</div>
			<div className='flex flex-wrap items-center justify-center gap-6 typo-caption1_medium text-neutral-500'>
				<Link to='/auth' className='transition-colors hover:text-main-blue'>
					로그인
				</Link>
				<Link to='/main' className='transition-colors hover:text-main-blue'>
					대시보드
				</Link>
				<Link to='/workflow' className='transition-colors hover:text-main-blue'>
					워크플로우
				</Link>
			</div>
		</div>
	</footer>
)

export default LandingFooter
