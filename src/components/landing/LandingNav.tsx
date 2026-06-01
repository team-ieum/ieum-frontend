import { Link } from 'react-router'
import symbol from '@/assets/symbol.png'
import { ArrowRight } from 'lucide-react'

const LandingNav = () => (
	<header className='sticky top-0 z-50 border-b border-[#cde9f4]/80 bg-neutral-white/80 backdrop-blur-md'>
		<div className='mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 lg:px-8'>
			<Link to='/' className='inline-flex items-center gap-2.5'>
				<img src={symbol} alt='' className='h-8 w-8' />
				<span className='font-logo_regular text-2xl text-main-deep-blue'>IEUM</span>
			</Link>

			<nav className='hidden items-center gap-8 md:flex'>
				<a href='#features' className='typo-body3_medium text-neutral-600 transition-colors hover:text-main-blue'>
					기능
				</a>
				<a href='#integrations' className='typo-body3_medium text-neutral-600 transition-colors hover:text-main-blue'>
					연동
				</a>
			</nav>

			<div className='ml-auto flex items-center gap-2'>
				<Link
					to='/auth'
					className='hidden h-10 items-center px-4 typo-body3_semibold text-main-deep-blue transition-colors hover:text-main-blue sm:inline-flex'
				>
					로그인
				</Link>
				<Link
					to='/auth'
					className='inline-flex h-10 items-center gap-1.5 rounded-brand-md bg-main-blue px-4 typo-body3_semibold text-neutral-white shadow-sm transition-colors hover:bg-main-deep-blue'
				>
					무료로 시작
					<ArrowRight size={16} />
				</Link>
			</div>
		</div>
	</header>
)

export default LandingNav
