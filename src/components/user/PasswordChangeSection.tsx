import { ChevronDown, KeyRound } from 'lucide-react'
import { useId } from 'react'
import Collapse from '@/components/common/Collapse'
import { usePasswordChangeFormViewModel } from '@/hooks/user/usePasswordChangeFormViewModel'
import { PASSWORD_RULE_MESSAGE } from '@/schemas/auth'
import type { UserPageViewModel } from '@/types/user'
import { cn } from '@/utils/cn'

type PasswordChangeSectionProps = {
	/** 펼치면 프로필 입력을 접어야 하므로 열림 상태는 페이지 ViewModel이 갖는다. */
	section: UserPageViewModel['passwordSection']
}

const PasswordChangeSection = ({ section }: PasswordChangeSectionProps) => {
	const panelId = useId()
	const ruleId = useId()
	const form = usePasswordChangeFormViewModel(section.isOpen)

	return (
		<div className='border-b border-neutral-200 last:border-b-0'>
			<button
				type='button'
				aria-expanded={section.isOpen}
				aria-controls={panelId}
				disabled={section.isToggleDisabled}
				onClick={section.handleToggle}
				className='flex min-h-16 w-full items-center gap-3 px-5 text-left disabled:cursor-default sm:px-8 lg:px-10'
			>
				<KeyRound size={19} className='text-main-blue' />
				<span className='flex-1 typo-body2_semibold text-neutral-700'>비밀번호 변경</span>
				<ChevronDown
					size={18}
					className={cn('text-neutral-400 transition-transform duration-300', section.isOpen && 'rotate-180')}
				/>
			</button>

			<Collapse open={section.isOpen} id={panelId}>
				<div className='px-5 pb-5 sm:px-8 lg:px-10'>
					{section.canChangePassword ? (
						<form noValidate onSubmit={form.handleSubmit} className='flex flex-col gap-3'>
							<PasswordField
								label='현재 비밀번호'
								autoComplete='current-password'
								value={form.values.currentPassword}
								onChange={form.handleChange('currentPassword')}
								error={form.errors.currentPassword}
								disabled={form.isInputDisabled}
							/>
							<div className='grid gap-3'>
								<PasswordField
									label='새 비밀번호'
									autoComplete='new-password'
									value={form.values.newPassword}
									onChange={form.handleChange('newPassword')}
									error={form.errors.newPassword}
									describedBy={form.isRuleVisible ? ruleId : undefined}
									disabled={form.isInputDisabled}
								/>
								<PasswordField
									label='새 비밀번호 확인'
									autoComplete='new-password'
									value={form.values.newPasswordConfirm}
									onChange={form.handleChange('newPasswordConfirm')}
									error={form.errors.newPasswordConfirm}
									disabled={form.isInputDisabled}
								/>
							</div>
							{form.isRuleVisible ? (
								<p id={ruleId} className='m-0 typo-caption1_regular text-neutral-500'>
									{PASSWORD_RULE_MESSAGE}
								</p>
							) : null}

							{form.formError ? (
								<p role='alert' className='m-0 typo-caption1_medium text-danger-700'>
									{form.formError}
								</p>
							) : null}

							<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
								<p className='m-0 typo-caption1_regular text-neutral-500'>
									변경하면 모든 기기에서 로그아웃되고 새 비밀번호로 다시 로그인해야 해요.
								</p>
								<button
									type='submit'
									disabled={form.isSubmitDisabled}
									className='h-10 shrink-0 self-end rounded-brand-sm bg-main-blue px-5 typo-button1_semibold text-white transition-opacity disabled:cursor-default disabled:opacity-50 sm:self-auto'
								>
									{form.submitLabel}
								</button>
							</div>
						</form>
					) : (
						<p className='m-0 typo-body3_regular text-neutral-500'>
							소셜 로그인으로 가입한 계정은 비밀번호를 변경할 수 없어요.
						</p>
					)}
				</div>
			</Collapse>
		</div>
	)
}

type PasswordFieldProps = {
	label: string
	autoComplete: 'current-password' | 'new-password'
	value: string
	onChange: (value: string) => void
	error?: string
	/** 입력 칸 밖에 있는 규칙 안내의 id */
	describedBy?: string
	disabled: boolean
}

const PasswordField = ({ label, autoComplete, value, onChange, error, describedBy, disabled }: PasswordFieldProps) => {
	const inputId = useId()
	const errorId = `${inputId}-error`

	return (
		<div className='grid content-start gap-1.5'>
			<label htmlFor={inputId} className='typo-body2_semibold text-neutral-700'>
				{label}
			</label>
			<input
				id={inputId}
				type='password'
				autoComplete={autoComplete}
				aria-invalid={error ? true : undefined}
				aria-describedby={[describedBy ?? '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
				value={value}
				onChange={event => onChange(event.target.value)}
				disabled={disabled}
				className={cn(
					'h-10 w-full rounded-brand-sm border bg-neutral-white px-4 typo-body1_regular text-neutral-800 outline-none transition-colors focus:border-main-blue disabled:bg-neutral-50',
					error ? 'border-danger-500 focus:border-danger-500' : 'border-neutral-300'
				)}
			/>
			{error ? (
				<span id={errorId} className='typo-caption1_regular text-danger-700'>
					{error}
				</span>
			) : null}
		</div>
	)
}

export default PasswordChangeSection
