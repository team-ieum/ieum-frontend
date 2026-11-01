type VerificationResendProps = { seconds: number; isPending: boolean; onResend: () => void }
const VerificationResend = ({ seconds, isPending, onResend }: VerificationResendProps) => (
	<div className='mt-4 text-center'>
		<button
			type='button'
			disabled={isPending || seconds > 0}
			onClick={onResend}
			className='min-h-10 rounded-brand-md px-3 typo-caption1_medium text-main-deep-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue disabled:cursor-not-allowed disabled:text-neutral-400'
		>
			인증코드 다시 받기{seconds > 0 ? ` (${seconds}초)` : ''}
		</button>
		<p className='mt-1 typo-caption1_regular text-neutral-500'>다시 받으면 이전 인증코드는 사용할 수 없습니다.</p>
	</div>
)
export default VerificationResend
