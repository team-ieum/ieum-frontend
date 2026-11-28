import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import type { NodeOptionsComboboxState } from '@/hooks/workflow/useNodeOptionsCombobox'
import type { GithubAppInstallLink } from '@/types/integration'

type NodeOptionsDropdownFooterProps = {
	/** 불러오는 중 안내 이름(`{title} 목록 불러오는 중`)에 쓴다. */
	title: string
	combobox: NodeOptionsComboboxState
}

const GITHUB_ACTION_CLASS =
	'inline-flex items-center gap-1 rounded-md typo-caption1_semibold text-main-deep-blue underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'

type GithubAppInstallNoticeProps = {
	installLink: GithubAppInstallLink
	isRefetching: boolean
	onRefetch: () => void
}

/** 설치는 새 탭에서 하고, 편집 중인 캔버스는 그대로 둔 채 돌아와 목록을 다시 불러온다. */
const GithubAppInstallNotice = ({ installLink, isRefetching, onRefetch }: GithubAppInstallNoticeProps) => (
	<div className='flex flex-col items-start gap-2 px-2.5 pt-2 pb-1 typo-caption1_regular text-neutral-600'>
		<p className='m-0'>
			GitHub 앱을 설치한 레포가 없어요. GitHub에서 앱을 설치하고 쓸 레포를 추가한 뒤 목록을 다시 불러와 주세요.
		</p>
		<div className='flex flex-wrap items-center gap-3'>
			{installLink.href ? (
				<a href={installLink.href} target='_blank' rel='noopener noreferrer' className={GITHUB_ACTION_CLASS}>
					GitHub 앱 설치
					<ExternalLink size={12} aria-hidden='true' />
					<span className='sr-only'>(새 탭)</span>
				</a>
			) : installLink.hasError ? (
				<Link to='/inter-setting' className={GITHUB_ACTION_CLASS}>
					통합 설정 열기
				</Link>
			) : installLink.isLoading ? (
				<span role='status'>설치 주소 불러오는 중…</span>
			) : null}
			<button
				type='button'
				onClick={onRefetch}
				disabled={isRefetching}
				className='rounded-md border border-neutral-200 px-2 py-1 typo-caption1_semibold text-main-deep-blue hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue disabled:opacity-60'
			>
				{isRefetching ? '불러오는 중…' : '다시 불러오기'}
			</button>
		</div>
	</div>
)

/** options 드롭다운 목록 아래의 불러오는 중·오류 안내·더 불러오기·빈 목록 안내. 부모 칸이 막혔으면 그리지 않는다. */
const NodeOptionsDropdownFooter = ({ title, combobox }: NodeOptionsDropdownFooterProps) => {
	// 부모 칸이 막혔으면 목록을 부르지 않는다. 비우기 행이 있는 칸은 그 행만 남고, 이유는 칸 아래 안내로 이미 알린다.
	if (combobox.isBlocked) return null

	if (combobox.isLoading) {
		return (
			<div role='status' aria-label={`${title} 목록 불러오는 중`} aria-busy='true' className='flex flex-col gap-1 pt-1'>
				{[0, 1, 2].map(index => (
					<SkeletonPulse key={index} className='h-8 rounded-lg bg-neutral-100' />
				))}
			</div>
		)
	}

	const notice = combobox.errorNotice
	if (notice) {
		return (
			<div
				role='alert'
				className='flex flex-col items-start gap-2 px-2.5 pt-2 pb-1 text-xs leading-relaxed text-neutral-600'
			>
				<p className='m-0'>{notice.message}</p>
				{notice.action === 'connect' ? (
					<Link to='/inter-setting' className='font-semibold text-main-deep-blue underline underline-offset-2'>
						통합 설정 열기
					</Link>
				) : (
					<button
						type='button'
						onClick={combobox.retry}
						disabled={combobox.isFetchingNextPage}
						className='rounded-md border border-neutral-200 px-2 py-1 font-semibold text-main-deep-blue hover:bg-neutral-50 disabled:opacity-60'
					>
						{combobox.isFetchingNextPage ? '불러오는 중…' : '다시 시도'}
					</button>
				)}
			</div>
		)
	}

	if (combobox.hasNextPage) {
		return (
			<button
				type='button'
				onClick={combobox.fetchNextPage}
				disabled={combobox.isFetchingNextPage}
				className='mt-0.5 w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-main-deep-blue hover:bg-neutral-50 disabled:opacity-60'
			>
				{combobox.isFetchingNextPage ? '불러오는 중…' : '더 불러오기'}
			</button>
		)
	}

	if (combobox.items.length === 0) {
		if (combobox.githubAppInstall) {
			return (
				<GithubAppInstallNotice
					installLink={combobox.githubAppInstall}
					isRefetching={combobox.isRefetching}
					onRefetch={combobox.retry}
				/>
			)
		}
		return <p className='m-0 px-2.5 pt-1.5 pb-1 text-xs text-neutral-500'>고를 수 있는 항목이 없어요.</p>
	}
	return null
}

export default NodeOptionsDropdownFooter
