import { useId } from 'react'

type VerificationCodeInputProps = {
	value: string
	onChange: (value: string) => void
	error?: string
	disabled?: boolean
}

const VerificationCodeInput = ({ value, onChange, error, disabled }: VerificationCodeInputProps) => {
	const id = useId()
	return (
		<div className='flex flex-col gap-2'>
			<label htmlFor={id} className='typo-body1_medium text-main-deep-blue'>
				인증코드
			</label>
			<input
				id={id}
				type='text'
				inputMode='numeric'
				autoComplete='one-time-code'
				maxLength={6}
				pattern='[0-9]{6}'
				placeholder='6자리 숫자'
				value={value}
				disabled={disabled}
				onChange={event => onChange(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
				aria-invalid={Boolean(error)}
				aria-describedby={error ? `${id}-error` : undefined}
				className='min-h-12.5 w-full rounded-brand-md bg-main-light-blue px-4 py-3 text-center text-xl tracking-[0.4em] text-main-deep-blue outline-none focus-visible:ring-2 focus-visible:ring-main-blue disabled:opacity-60'
			/>
			{error && (
				<p id={`${id}-error`} role='alert' className='typo-caption1_regular text-danger-700'>
					{error}
				</p>
			)}
		</div>
	)
}

export default VerificationCodeInput
