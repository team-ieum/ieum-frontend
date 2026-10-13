import { Bell, Camera, ChevronDown, Trash2, UserRound } from 'lucide-react'
import PatternBackground from '@/components/common/PatternBackground'

const UserPage = () => {
	return (
		<section className='relative -mx-6 -my-6 min-h-[calc(100vh-var(--layout-header-height))] overflow-hidden bg-[#f4fbfe] px-4 py-5 sm:px-6 lg:px-8 lg:py-4'>
			<PatternBackground />

			<div className='relative z-10 mx-auto flex min-h-[calc(100vh-var(--layout-header-height)-2.5rem)] w-full items-start justify-center pt-6 sm:pt-8 lg:min-h-[calc(100vh-var(--layout-header-height)-2rem)] lg:pt-4'>
				<div className='w-full max-w-xl'>
					<div className='relative z-10 mx-auto flex h-28 w-28 items-center justify-center rounded-full border-[5px] border-white bg-linear-to-b from-[#f4f8fb] to-[#e4ebf0] text-neutral-400 shadow-[0_12px_30px_-14px_rgba(41,83,124,.5)] sm:h-32 sm:w-32 lg:h-24 lg:w-24 lg:border-4'>
						<UserRound className='h-16 w-16 sm:h-20 sm:w-20 lg:h-14 lg:w-14' strokeWidth={1.25} />
						<button
							type='button'
							disabled
							aria-label='프로필 이미지 변경'
							className='absolute bottom-0 right-0 flex h-10 w-10 cursor-default items-center justify-center rounded-full border-4 border-white bg-main-blue text-white shadow-md lg:-bottom-0.5 lg:-right-1 lg:h-8 lg:w-8 lg:border-[3px]'
						>
							<Camera className='h-4 w-4 lg:h-3.5 lg:w-3.5' />
						</button>
					</div>

					<div className='mt-6 overflow-hidden rounded-brand-md border border-white/90 bg-white shadow-[0_22px_50px_-28px_rgba(41,83,124,.55)]'>
						<div className='px-5 py-8 sm:px-8 sm:py-9 lg:px-10 lg:py-10'>
							<h2 className='text-center typo-title1_bold text-neutral-800'>프로필 정보</h2>

							<div className='mt-5 flex flex-col gap-5 lg:mt-4'>
								<label className='grid gap-2'>
									<span className='typo-body2_semibold text-neutral-700'>닉네임</span>
									<input
										aria-label='닉네임'
										readOnly
										value='이음새'
										className='h-11 w-full rounded-brand-sm border border-neutral-300 bg-neutral-white px-4 typo-body1_regular text-neutral-800 outline-none lg:h-10'
									/>
									<span className='typo-caption1_regular text-neutral-500'>2~20자로 입력해 주세요.</span>
								</label>

								<label className='grid content-start gap-2'>
									<span className='typo-body2_semibold text-neutral-700'>이메일</span>
									<input
										aria-label='이메일'
										readOnly
										value='ieumsae@example.com'
										className='h-11 w-full rounded-brand-sm border border-neutral-200 bg-neutral-50 px-4 typo-body1_regular text-neutral-500 outline-none lg:h-10'
									/>
								</label>
							</div>
						</div>

						<div className='border-t border-neutral-200'>
							<SettingRow icon={Bell} label='알림 설정' />
							<SettingRow icon={Trash2} label='계정 삭제' danger />
						</div>
					</div>

					<div className='mt-4 flex justify-end'>
						<button
							type='button'
							disabled
							className='h-10 cursor-default rounded-brand-sm bg-main-blue px-5 typo-button1_semibold text-white shadow-[0_8px_18px_-10px_rgba(0,123,167,.75)]'
						>
							변경사항 저장
						</button>
					</div>
				</div>
			</div>
		</section>
	)
}

type SettingRowProps = {
	icon: typeof Bell
	label: string
	danger?: boolean
}

const SettingRow = ({ icon: Icon, label, danger = false }: SettingRowProps) => (
	<div className='flex min-h-16 items-center gap-3 border-b border-neutral-200 px-5 last:border-b-0 sm:px-8 lg:px-10'>
		<Icon size={19} className={danger ? 'text-danger-700' : 'text-main-blue'} />
		<span className={`flex-1 typo-body2_semibold ${danger ? 'text-danger-700' : 'text-neutral-700'}`}>{label}</span>
		<ChevronDown size={18} className={danger ? 'text-danger-500' : 'text-neutral-400'} />
	</div>
)

export default UserPage
