type AuthSubmitButtonProps = {
	label: string
	disabled?: boolean
}

const AuthSubmitButton = ({ label, disabled = false }: AuthSubmitButtonProps) => {
	return (
		<button
			type='submit'
			disabled={disabled}
			className='typo-body2_bold w-full rounded-2xl bg-main-blue py-3.5 text-neutral-50 shadow-[0_4px_14px_4px_color-mix(in_srgb,var(--color-main-blue)_25%,transparent)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-main-deep-blue disabled:cursor-not-allowed disabled:opacity-60'
		>
			{label}
		</button>
	)
}

export default AuthSubmitButton
