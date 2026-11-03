import { ChevronDown, TriangleAlert, UserX } from 'lucide-react'
import { useId, useState } from 'react'
import Collapse from '@/components/common/Collapse'
import { useWithdrawAccount } from '@/hooks/user/useWithdrawAccount'
import { cn } from '@/utils/cn'

const DELETED_DATA = [
	'워크플로우 전체 (버전·실행 이력·채팅·스케줄·노드 테스트 샘플·웹훅 수신 주소)',
	'AI API Key, 웹훅 자격 증명, MCP 서버, 프롬프트 템플릿',
	'Google·Notion·GitHub·Slack 등 외부 서비스 연동',
] as const

type WithdrawSectionProps = {
	/** 펼치면 화면 높이를 넘지 않도록 페이지가 프로필 입력을 접으므로 열림 상태는 페이지가 갖는다. */
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	disabled: boolean
}

const WithdrawSection = ({ isOpen, onOpenChange, disabled }: WithdrawSectionProps) => {
	const panelId = useId()
	const agreeId = useId()
	const withdrawal = useWithdrawAccount()

	// 직접 닫거나 다른 메뉴를 펼쳐 닫히면 입력을 비워 다시 펼쳤을 때 이전 값이 남지 않게 한다.
	const [wasOpen, setWasOpen] = useState(isOpen)
	if (wasOpen !== isOpen) {
		setWasOpen(isOpen)
		if (!isOpen) withdrawal.reset()
	}

	return (
		<div className='border-b border-neutral-200 last:border-b-0'>
			<button
				type='button'
				aria-expanded={isOpen}
				aria-controls={panelId}
				disabled={disabled}
				onClick={() => onOpenChange(!isOpen)}
				className='flex min-h-16 w-full items-center gap-3 px-5 text-left disabled:cursor-default sm:px-8 lg:px-10'
			>
				<UserX size={19} className='text-danger-700' />
				<span className='flex-1 typo-body2_semibold text-danger-700'>회원 탈퇴</span>
				<ChevronDown
					size={18}
					className={cn('text-danger-500 transition-transform duration-300', isOpen && 'rotate-180')}
				/>
			</button>

			<Collapse open={isOpen} id={panelId}>
				<div className='flex flex-col gap-4 px-5 pb-5 sm:px-8 lg:px-10'>
					<div className='rounded-brand-sm border border-danger-200 bg-danger-50 px-4 py-3'>
						<p className='m-0 flex items-center gap-1.5 typo-body3_semibold text-danger-700'>
							<TriangleAlert size={16} aria-hidden='true' />
							탈퇴하면 계정과 아래 데이터가 즉시 영구 삭제되며 복구할 수 없어요.
						</p>
						<ul className='m-0 mt-2 flex list-disc flex-col gap-1 pl-5 typo-caption1_regular text-neutral-700'>
							{DELETED_DATA.map(item => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</div>
					<p className='m-0 typo-caption1_regular text-neutral-500'>
						Google·Notion·GitHub에서 허용한 앱 권한은 해제되지 않으니 각 서비스에서 직접 해제해 주세요.
					</p>

					<label htmlFor={agreeId} className='flex cursor-pointer items-center gap-2'>
						<input
							id={agreeId}
							type='checkbox'
							checked={withdrawal.agreed}
							onChange={event => withdrawal.onAgreedChange(event.target.checked)}
							disabled={withdrawal.isPending}
							className='size-4 accent-danger-700'
						/>
						<span className='typo-body3_medium text-neutral-700'>
							안내를 모두 확인했으며 데이터 삭제에 동의합니다.
						</span>
					</label>

					{withdrawal.error ? (
						<p role='alert' className='m-0 typo-caption1_medium text-danger-700'>
							{withdrawal.error}
						</p>
					) : null}

					<div className='flex justify-end'>
						<button
							type='button'
							onClick={() => void withdrawal.withdraw()}
							disabled={!withdrawal.agreed || withdrawal.isPending}
							className='h-10 rounded-brand-sm bg-danger-700 px-5 typo-button1_semibold text-white transition-opacity disabled:cursor-default disabled:opacity-50'
						>
							{withdrawal.isPending ? '탈퇴 처리 중...' : '회원 탈퇴'}
						</button>
					</div>
				</div>
			</Collapse>
		</div>
	)
}

export default WithdrawSection
