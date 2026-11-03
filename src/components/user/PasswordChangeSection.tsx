import { ChevronDown, KeyRound } from 'lucide-react'
import { useId, useState } from 'react'
import { useChangePasswordForm } from '@/hooks/user/useChangePasswordForm'
import { PASSWORD_RULE_MESSAGE } from '@/schemas/auth'
import type { UserAuthProvider } from '@/types/user'
import { cn } from '@/utils/cn'

type PasswordChangeSectionProps = {
	/** 조회 전이면 undefined다. 이메일 가입(LOCAL) 계정만 비밀번호를 바꿀 수 있다. */
	provider: UserAuthProvider | undefined
}

const PasswordChangeSection = ({ provider }: PasswordChangeSectionProps) => {
	const panelId = useId()
	const [isOpen, setIsOpen] = useState(false)
	const form = useChangePasswordForm()

	const toggle = () => {
		// 닫으면 입력한 비밀번호가 화면에 남지 않도록 비운다.
		if (isOpen) form.reset()
		setIsOpen(open => !open)
	}

	return (
		<div className='border-b border-neutral-200 last:border-b-0'>
			<button
				type='button'
				aria-expanded={isOpen}
				aria-controls={panelId}
				disabled={!provider}
				onClick={toggle}
				className='flex min-h-16 w-full items-center gap-3 px-5 text-left disabled:cursor-default sm:px-8 lg:px-10'
			>
				<KeyRound size={19} className='text-main-blue' />
				<span className='flex-1 typo-body2_semibold text-neutral-700'>비밀번호 변경</span>
				<ChevronDown size={18} className={cn('text-neutral-400 transition-transform', isOpen && 'rotate-180')} />
			</button>

			{isOpen ? (
				<div id={panelId} className='px-5 pb-6 sm:px-8 lg:px-10'>
					{provider === 'LOCAL' ? (
						<form noValidate onSubmit={event => void form.onSubmit(event)} className='flex flex-col gap-4'>
							<PasswordField
								label='현재 비밀번호'
								autoComplete='current-password'
								value={form.values.currentPassword}
								onChange={form.onChange('currentPassword')}
								error={form.errors.currentPassword}
								disabled={form.isPending}
							/>
							<PasswordField
								label='새 비밀번호'
								autoComplete='new-password'
								value={form.values.newPassword}
								onChange={form.onChange('newPassword')}
								error={form.errors.newPassword}
								hint={PASSWORD_RULE_MESSAGE}
								disabled={form.isPending}
							/>
							<PasswordField
								label='새 비밀번호 확인'
								autoComplete='new-password'
								value={form.values.newPasswordConfirm}
								onChange={form.onChange('newPasswordConfirm')}
								error={form.errors.newPasswordConfirm}
								disabled={form.isPending}
							/>

							<p className='m-0 typo-caption1_regular text-neutral-500'>
								변경하면 이 기기를 포함한 모든 기기에서 로그아웃되고 새 비밀번호로 다시 로그인해야 해요.
							</p>
							{form.formError ? (
								<p role='alert' className='m-0 typo-caption1_medium text-danger-700'>
									{form.formError}
								</p>
							) : null}

							<div className='flex justify-end'>
								<button
									type='submit'
									disabled={form.isPending}
									className='h-10 rounded-brand-sm bg-main-blue px-5 typo-button1_semibold text-white transition-opacity disabled:cursor-default disabled:opacity-50'
								>
									{form.isPending ? '변경 중...' : '비밀번호 변경'}
								</button>
							</div>
						</form>
					) : (
						<p className='m-0 typo-body3_regular text-neutral-500'>
							소셜 로그인으로 가입한 계정은 비밀번호를 변경할 수 없어요.
						</p>
					)}
				</div>
			) : null}
		</div>
	)
}

type PasswordFieldProps = {
	label: string
	autoComplete: 'current-password' | 'new-password'
	value: string
	onChange: (value: string) => void
	error?: string
	hint?: string
	disabled: boolean
}

const PasswordField = ({ label, autoComplete, value, onChange, error, hint, disabled }: PasswordFieldProps) => {
	const inputId = useId()
	const hintId = `${inputId}-hint`
	const errorId = `${inputId}-error`

	return (
		<div className='grid gap-2'>
			<label htmlFor={inputId} className='typo-body2_semibold text-neutral-700'>
				{label}
			</label>
			<input
				id={inputId}
				type='password'
				autoComplete={autoComplete}
				aria-invalid={error ? true : undefined}
				aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
				value={value}
				onChange={event => onChange(event.target.value)}
				disabled={disabled}
				className={cn(
					'h-11 w-full rounded-brand-sm border bg-neutral-white px-4 typo-body1_regular text-neutral-800 outline-none transition-colors focus:border-main-blue disabled:bg-neutral-50 lg:h-10',
					error ? 'border-danger-500 focus:border-danger-500' : 'border-neutral-300'
				)}
			/>
			{hint ? (
				<span id={hintId} className='typo-caption1_regular text-neutral-500'>
					{hint}
				</span>
			) : null}
			{error ? (
				<span id={errorId} className='typo-caption1_regular text-danger-700'>
					{error}
				</span>
			) : null}
		</div>
	)
}

export default PasswordChangeSection
