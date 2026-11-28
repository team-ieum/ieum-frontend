import { ExternalLink } from 'lucide-react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import type { GithubAppInstallLink } from '@/types/integration'

type IntegrationGithubRepoAccessProps = {
	installLink: GithubAppInstallLink
}

const ACTION_CLASS =
	'inline-flex h-9 w-fit items-center gap-1.5 rounded-brand-sm border border-neutral-300 bg-neutral-white px-4 typo-body3_semibold text-neutral-700 transition-colors hover:border-main-blue hover:text-main-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue motion-reduce:transition-none'

/** GitHub 연결 상세의 레포 접근 범위 안내와 GitHub App 설치(레포 추가·관리) 링크. */
const IntegrationGithubRepoAccess = ({ installLink }: IntegrationGithubRepoAccessProps) => (
	<div className='flex flex-col gap-3 border-t border-neutral-100 px-6 py-5'>
		<div className='flex flex-col gap-1'>
			<h3 className='typo-body2_semibold m-0 text-neutral-900'>레포 접근 범위</h3>
			<p className='typo-body3_regular m-0 text-neutral-600'>
				이음이 쓸 수 있는 레포는 GitHub 앱을 설치한 레포로 정해져요. 레포를 추가하거나 빼려면 GitHub에서 설치 범위를 바꿔
				주세요. 바꾼 뒤 다시 연결하지 않아도 돼요.
			</p>
		</div>
		{installLink.href ? (
			<a href={installLink.href} className={ACTION_CLASS}>
				<ExternalLink size={15} aria-hidden='true' />
				레포 추가·관리
			</a>
		) : installLink.hasError ? (
			<div role='alert' className='flex flex-wrap items-center gap-3 typo-body3_regular text-danger-700'>
				<span>GitHub 앱 설치 주소를 불러오지 못했어요.</span>
				<button type='button' onClick={installLink.retry} className={ACTION_CLASS}>
					다시 시도
				</button>
			</div>
		) : installLink.isLoading ? (
			// 링크 버튼과 같은 크기로 자리를 잡아 주소가 와도 아래 영역이 밀리지 않게 한다.
			<div role='status' aria-label='GitHub 앱 설치 주소 불러오는 중' aria-busy='true'>
				<SkeletonPulse className='h-9 w-36 rounded-brand-sm bg-neutral-100' />
			</div>
		) : null}
	</div>
)

export default IntegrationGithubRepoAccess
