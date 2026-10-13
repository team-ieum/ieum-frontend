type VerificationTimerProps = { seconds: number; verified?: boolean }
const VerificationTimer = ({ seconds, verified = false }: VerificationTimerProps) => {
	const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
	return (
		<p
			aria-label={verified ? '인증 완료 남은 시간' : '인증코드 남은 시간'}
			className='mt-4 text-center typo-caption1_medium text-main-deep-blue'
		>
			{verified ? '인증 완료 유효시간' : '인증코드 유효시간'} {time}
		</p>
	)
}
export default VerificationTimer
