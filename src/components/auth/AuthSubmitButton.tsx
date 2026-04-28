type AuthSubmitButtonProps = {
	label: '로그인' | '회원가입'
}

const AuthSubmitButton = ({ label }: AuthSubmitButtonProps) => {
	return (
		<button
			type='submit'
			className='mt-2 h-11 w-full rounded-brand-sm bg-main-blue font-semibold text-neutral-white transition hover:opacity-90'
		>
			{label}
		</button>
	)
}

export default AuthSubmitButton
