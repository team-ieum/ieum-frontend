type AuthSubmitButtonProps = {
	label: '로그인' | '회원가입' | '재설정 이메일 받기'
	disabled?: boolean
}

const AuthSubmitButton = ({ label, disabled = false }: AuthSubmitButtonProps) => {
	return (
		<button
			type='submit'
			disabled={disabled}
			className='typo-body2_bold w-full rounded-2xl bg-main-blue py-3.5 text-neutral-50 shadow-[0_4px_14px_4px_color-mix(in_srgb,var(--color-main-blue)_25%,transparent)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60'
		>
			{label}
		</button>
	)
}

export default AuthSubmitButton
