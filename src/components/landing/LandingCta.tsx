import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'

const LandingCta = () => (
	<section className='py-20'>
		<div className='mx-auto max-w-6xl px-5 lg:px-8'>
			<div className='overflow-hidden rounded-2xl bg-linear-to-br from-main-blue to-main-deep-blue px-8 py-12 text-center text-neutral-white shadow-lg sm:px-12'>
				<h2 className='typo-title2_bold m-0'>지금 바로 자동화를 시작해 보세요</h2>
				<p className='typo-body2_regular m-0 mx-auto mt-3 max-w-lg text-main-light-blue'>
					계정을 만들고 첫 워크플로우를 연결하는 데 몇 분이면 충분합니다.
				</p>
				<Link
					to='/auth'
					className='mt-8 inline-flex h-12 items-center gap-2 rounded-brand-md bg-neutral-white px-8 typo-body2_semibold text-main-deep-blue transition-colors hover:bg-main-light-blue'
				>
					시작하기
					<ArrowRight size={18} />
				</Link>
			</div>
		</div>
	</section>
)

export default LandingCta
