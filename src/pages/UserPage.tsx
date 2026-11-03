import { Bell, Camera, ChevronDown, Trash2, UserRound } from 'lucide-react'
import PatternBackground from '@/components/common/PatternBackground'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import { useCurrentUserQuery } from '@/hooks/user/queries/useCurrentUserQuery'
import { useProfileNameForm } from '@/hooks/user/useProfileNameForm'
import { PROFILE_NAME_RULE_MESSAGE } from '@/schemas/user'
import { cn } from '@/utils/cn'

const UserPage = () => {
	const { data: user, isPending, isError, refetch } = useCurrentUserQuery()
	const nameForm = useProfileNameForm(user?.name)

	return (
		<section className='relative -mx-6 -my-6 min-h-[calc(100vh-var(--layout-header-height))] overflow-hidden bg-[#f4fbfe] px-4 py-5 sm:px-6 lg:px-8 lg:py-4'>
			{/* 디자인상 화면 제목은 두지 않고 보조 기술에만 페이지 제목을 제공한다. */}
			<h1 className='sr-only'>계정 설정</h1>
			<PatternBackground />

			<div className='relative z-10 mx-auto flex min-h-[calc(100vh-var(--layout-header-height)-2.5rem)] w-full items-start justify-center pt-6 sm:pt-8 lg:min-h-[calc(100vh-var(--layout-header-height)-2rem)] lg:pt-4'>
				<form noValidate onSubmit={event => void nameForm.onSubmit(event)} className='w-full max-w-xl'>
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

							{isPending ? (
								<ProfileFieldsSkeleton />
							) : isError ? (
								<ProfileFieldsError retry={() => void refetch()} />
							) : (
								<div className='mt-5 flex flex-col gap-5 lg:mt-4'>
									<label className='grid gap-2'>
										<span className='typo-body2_semibold text-neutral-700'>닉네임</span>
										<input
											aria-label='닉네임'
											aria-invalid={nameForm.error ? true : undefined}
											aria-describedby='profile-name-hint'
											value={nameForm.name}
											onChange={nameForm.onNameChange}
											disabled={nameForm.isPending}
											className={cn(
												'h-11 w-full rounded-brand-sm border bg-neutral-white px-4 typo-body1_regular text-neutral-800 outline-none transition-colors focus:border-main-blue disabled:bg-neutral-50 disabled:text-neutral-500 lg:h-10',
												nameForm.error
													? 'border-danger-500 focus:border-danger-500'
													: 'border-neutral-300'
											)}
										/>
										<span
											id='profile-name-hint'
											className={cn(
												'typo-caption1_regular',
												nameForm.error ? 'text-danger-700' : 'text-neutral-500'
											)}
										>
											{nameForm.error || PROFILE_NAME_RULE_MESSAGE}
										</span>
									</label>

									<label className='grid content-start gap-2'>
										<span className='typo-body2_semibold text-neutral-700'>이메일</span>
										<input
											aria-label='이메일'
											readOnly
											value={user.email}
											className='h-11 w-full rounded-brand-sm border border-neutral-200 bg-neutral-50 px-4 typo-body1_regular text-neutral-500 outline-none lg:h-10'
										/>
									</label>
								</div>
							)}
						</div>

						<div className='border-t border-neutral-200'>
							<SettingRow icon={Bell} label='알림 설정' />
							<SettingRow icon={Trash2} label='계정 삭제' danger />
						</div>
					</div>

					<div className='mt-4 flex items-center justify-end gap-3'>
						{nameForm.feedback ? (
							<p
								role={nameForm.feedback.type === 'error' ? 'alert' : 'status'}
								className={cn(
									'm-0 min-w-0 typo-caption1_medium',
									nameForm.feedback.type === 'error' ? 'text-danger-700' : 'text-main-blue'
								)}
							>
								{nameForm.feedback.message}
							</p>
						) : null}
						<button
							type='submit'
							disabled={!user || !nameForm.isDirty || nameForm.isPending}
							className='h-10 shrink-0 rounded-brand-sm bg-main-blue px-5 typo-button1_semibold text-white shadow-[0_8px_18px_-10px_rgba(0,123,167,.75)] transition-opacity disabled:cursor-default disabled:opacity-50 disabled:shadow-none'
						>
							{nameForm.isPending ? '저장 중...' : '변경사항 저장'}
						</button>
					</div>
				</form>
			</div>
		</section>
	)
}

/** 높이는 닉네임·이메일 입력 영역과 같아야 데이터 도착 후 카드 높이가 흔들리지 않는다. */
const ProfileFieldsSkeleton = () => (
	<div role='status' aria-label='프로필 정보 불러오는 중' className='mt-5 flex flex-col gap-5 lg:mt-4'>
		<div className='grid gap-2'>
			<SkeletonPulse className='h-5 w-12 rounded bg-neutral-200' />
			<SkeletonPulse className='h-11 rounded-brand-sm bg-neutral-200 lg:h-10' />
			<SkeletonPulse className='h-4 w-32 rounded bg-neutral-200' />
		</div>
		<div className='grid gap-2'>
			<SkeletonPulse className='h-5 w-12 rounded bg-neutral-200' />
			<SkeletonPulse className='h-11 rounded-brand-sm bg-neutral-200 lg:h-10' />
		</div>
	</div>
)

const ProfileFieldsError = ({ retry }: { retry: () => void }) => (
	<div
		role='alert'
		className='mt-5 flex min-h-41 flex-col items-center justify-center rounded-brand-md border border-danger-200 bg-danger-50 px-6 text-center lg:mt-4'
	>
		<p className='m-0 typo-body2_semibold text-danger-700'>프로필 정보를 불러오지 못했습니다.</p>
		<button
			type='button'
			onClick={retry}
			className='mt-4 rounded-brand-sm border border-danger-300 bg-neutral-white px-4 py-2 typo-body3_semibold text-danger-700'
		>
			다시 시도
		</button>
	</div>
)

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
