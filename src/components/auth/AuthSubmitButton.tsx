type AuthSubmitButtonProps = {
	label: '로그인' | '회원가입'
}

const AuthSubmitButton = ({ label }: AuthSubmitButtonProps) => {
	return (
		<button
			type='submit'
			className='typo-Body2_Bold w-full rounded-2xl bg-main-blue py-3.5 text-neutral-50 shadow-[0_4px_14px_4px_color-mix(in_srgb,var(--color-main-blue)_25%,transparent)] transition hover:brightness-105'
		>
			{label}
		</button>
	)
}

export default AuthSubmitButton
