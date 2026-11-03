import { ChevronDown, KeyRound } from 'lucide-react'
import { useId, useState } from 'react'
import Collapse from '@/components/common/Collapse'
import { useChangePasswordForm } from '@/hooks/user/useChangePasswordForm'
import { PASSWORD_RULE_MESSAGE } from '@/schemas/auth'
import type { UserAuthProvider } from '@/types/user'
import { cn } from '@/utils/cn'

type PasswordChangeSectionProps = {
	/** 조회 전이면 undefined다. 이메일 가입(LOCAL) 계정만 비밀번호를 바꿀 수 있다. */
	provider: UserAuthProvider | undefined
	/** 펼치면 화면 높이를 넘지 않도록 페이지가 프로필 입력을 접으므로 열림 상태는 페이지가 갖는다. */
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

const PasswordChangeSection = ({ provider, isOpen, onOpenChange }: PasswordChangeSectionProps) => {
	const panelId = useId()
	const ruleId = useId()
	const form = useChangePasswordForm()

	// 직접 닫거나 다른 메뉴를 펼쳐 닫히면 입력을 비워 다시 펼쳤을 때 이전 값이 남지 않게 한다.
	const [wasOpen, setWasOpen] = useState(isOpen)
	if (wasOpen !== isOpen) {
		setWasOpen(isOpen)
		if (!isOpen) form.reset()
	}

	return (
		<div className='border-b border-neutral-200 last:border-b-0'>
			<button
				type='button'
				aria-expanded={isOpen}
				aria-controls={panelId}
				disabled={!provider}
				onClick={() => onOpenChange(!isOpen)}
				className='flex min-h-16 w-full items-center gap-3 px-5 text-left disabled:cursor-default sm:px-8 lg:px-10'
			>
				<KeyRound size={19} className='text-main-blue' />
				<span className='flex-1 typo-body2_semibold text-neutral-700'>비밀번호 변경</span>
				<ChevronDown
					size={18}
					className={cn('text-neutral-400 transition-transform duration-300', isOpen && 'rotate-180')}
				/>
			</button>

			<Collapse open={isOpen} id={panelId}>
				<div className='px-5 pb-5 sm:px-8 lg:px-10'>
					{provider === 'LOCAL' ? (
						<form noValidate onSubmit={event => void form.onSubmit(event)} className='flex flex-col gap-3'>
							<PasswordField
								label='현재 비밀번호'
								autoComplete='current-password'
								value={form.values.currentPassword}
								onChange={form.onChange('currentPassword')}
								error={form.errors.currentPassword}
								disabled={form.isPending}
							/>
							<div className='grid gap-3'>
								<PasswordField
									label='새 비밀번호'
									autoComplete='new-password'
									value={form.values.newPassword}
									onChange={form.onChange('newPassword')}
									error={form.errors.newPassword}
									describedBy={form.errors.newPassword ? undefined : ruleId}
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
							</div>
							{/* 새 비밀번호 오류가 있으면 입력 아래 오류가 규칙을 대신 안내하므로 겹쳐 보이지 않게 숨긴다. */}
							{form.errors.newPassword ? null : (
								<p id={ruleId} className='m-0 typo-caption1_regular text-neutral-500'>
									{PASSWORD_RULE_MESSAGE}
								</p>
							)}

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
									disabled={form.isPending}
									className='h-10 shrink-0 self-end rounded-brand-sm bg-main-blue px-5 typo-button1_semibold text-white transition-opacity disabled:cursor-default disabled:opacity-50 sm:self-auto'
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
