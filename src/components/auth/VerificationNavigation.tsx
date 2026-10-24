type VerificationNavigationProps = { email: string; onChangeEmail: () => void; disabled?: boolean }
const VerificationNavigation = ({ email, onChangeEmail, disabled }: VerificationNavigationProps) => (
	<div className='mt-4 flex flex-wrap items-center justify-center gap-2'>
		<span className='break-all typo-caption1_medium text-neutral-500'>{email}</span>
		<button
			type='button'
			disabled={disabled}
			onClick={onChangeEmail}
			className='min-h-10 rounded-brand-md px-3 typo-caption1_medium text-main-deep-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue disabled:opacity-60'
		>
			이메일 변경
		</button>
	</div>
)
export default VerificationNavigation
