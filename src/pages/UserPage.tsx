import { Camera } from 'lucide-react'
import Collapse from '@/components/common/Collapse'
import DefaultProfileImage from '@/components/common/DefaultProfileImage'
import PatternBackground from '@/components/common/PatternBackground'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import PasswordChangeSection from '@/components/user/PasswordChangeSection'
import WithdrawSection from '@/components/user/WithdrawSection'
import { useUserPageViewModel } from '@/hooks/user/useUserPageViewModel'
import type { ProfileNameMessage as ProfileNameMessageState } from '@/types/user'
import { cn } from '@/utils/cn'

const UserPage = () => {
	const viewModel = useUserPageViewModel()
	const { nameField } = viewModel

	return (
		<section className='relative -mx-6 -my-6 min-h-[calc(100vh-var(--layout-header-height))] overflow-hidden bg-main-light-blue/40 px-4 py-5 sm:px-6 lg:px-8 lg:py-4'>
			{/* 디자인상 화면 제목은 두지 않고 보조 기술에만 페이지 제목을 제공한다. */}
			<h1 className='sr-only'>계정 설정</h1>
			<PatternBackground />

			<div className='relative z-10 mx-auto flex min-h-[calc(100vh-var(--layout-header-height)-2.5rem)] w-full items-start justify-center pt-6 sm:pt-8 lg:min-h-[calc(100vh-var(--layout-header-height)-2rem)] lg:pt-4'>
				<div className='w-full max-w-xl'>
					<DefaultProfileImage
						className='z-10 mx-auto h-28 w-28 border-[5px] border-white shadow-[0_12px_30px_-14px_rgba(41,83,124,.5)] sm:h-32 sm:w-32 lg:h-24 lg:w-24 lg:border-4'
						iconClassName='h-16 w-16 sm:h-20 sm:w-20 lg:h-14 lg:w-14'
					>
						<button
							type='button'
							disabled
							aria-label='프로필 이미지 변경'
							className='absolute bottom-0 right-0 flex h-10 w-10 cursor-default items-center justify-center rounded-full border-4 border-white bg-main-blue text-white shadow-md lg:-bottom-0.5 lg:-right-1 lg:h-8 lg:w-8 lg:border-[3px]'
						>
							<Camera className='h-4 w-4 lg:h-3.5 lg:w-3.5' />
						</button>
					</DefaultProfileImage>

					<div
						className={cn(
							'overflow-hidden rounded-brand-md border border-white/90 bg-white shadow-[0_22px_50px_-28px_rgba(41,83,124,.55)] transition-[margin] duration-300',
							viewModel.isProfileCollapsed ? 'mt-4' : 'mt-6'
						)}
					>
						<div
							className={cn(
								'px-5 transition-[padding] duration-300 sm:px-8 lg:px-10',
								viewModel.isProfileCollapsed ? 'pb-3 pt-5' : 'py-8 sm:py-9 lg:py-10'
							)}
						>
							<h2 className='text-center typo-title1_bold text-neutral-800'>프로필 정보</h2>

							{viewModel.profileResource.isLoading ? (
								<ProfileFieldsSkeleton />
							) : viewModel.profileResource.isLoadingError ? (
								<ProfileFieldsError retry={viewModel.profileResource.retry} />
							) : (
								// 처음 들어오면 닉네임·이메일을 모두 보이고, 메뉴를 펼치면 프로필 정보 제목만 남기고 접는다.
								<Collapse open={!viewModel.isProfileCollapsed}>
									<form
										noValidate
										onSubmit={nameField.handleSubmit}
										className='mt-5 flex flex-col gap-5 lg:mt-4'
									>
										<div className='grid gap-2'>
											<label htmlFor='profile-name' className='typo-body2_semibold text-neutral-700'>
												닉네임
											</label>
											<div className='flex gap-2'>
												<input
													id='profile-name'
													aria-invalid={nameField.hasError ? true : undefined}
													aria-describedby='profile-name-hint'
													value={nameField.value}
													onChange={event => nameField.handleChange(event.target.value)}
													disabled={nameField.isInputDisabled}
													className={cn(
														'h-11 min-w-0 flex-1 rounded-brand-sm border bg-neutral-white px-4 typo-body1_regular text-neutral-800 outline-none transition-colors focus:border-main-blue disabled:bg-neutral-50 disabled:text-neutral-500 lg:h-10',
														nameField.hasError
															? 'border-danger-500 focus:border-danger-500'
															: 'border-neutral-300'
													)}
												/>
												<button
													type='submit'
													disabled={nameField.isSubmitDisabled}
													className='h-11 shrink-0 rounded-brand-sm bg-main-blue px-4 typo-button1_semibold text-white transition-opacity disabled:cursor-default disabled:opacity-50 lg:h-10'
												>
													{nameField.submitLabel}
												</button>
											</div>
											<ProfileNameMessage id='profile-name-hint' message={nameField.message} />
										</div>

										<label className='grid content-start gap-2'>
											<span className='typo-body2_semibold text-neutral-700'>이메일</span>
											<input
												aria-label='이메일'
												readOnly
												value={viewModel.email}
												className='h-11 w-full rounded-brand-sm border border-neutral-200 bg-neutral-50 px-4 typo-body1_regular text-neutral-500 outline-none lg:h-10'
											/>
										</label>
									</form>
								</Collapse>
							)}
						</div>

						<div className='border-t border-neutral-200'>
							<PasswordChangeSection section={viewModel.passwordSection} />
							<WithdrawSection section={viewModel.withdrawSection} />
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

const MESSAGE_TONE_CLASS: Record<ProfileNameMessageState['tone'], string> = {
	hint: 'typo-caption1_regular text-neutral-500',
	error: 'typo-caption1_regular text-danger-700',
	success: 'typo-caption1_medium text-main-blue',
}

const ProfileNameMessage = ({ id, message }: { id: string; message: ProfileNameMessageState }) => (
	<span id={id} role={message.role} className={MESSAGE_TONE_CLASS[message.tone]}>
		{message.text}
	</span>
)

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

export default UserPage
