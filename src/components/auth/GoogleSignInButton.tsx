import googleIcon from '../../assets/web_light_rd_na.svg'

type GoogleSignInButtonProps = {
	onClick?: () => void
}

const GoogleSignInButton = ({ onClick }: GoogleSignInButtonProps) => {
	return (
		<button
			type='button'
			onClick={onClick}
			className='shrink-0 rounded-full transition-opacity hover:opacity-80'
			aria-label='Google로 로그인'
		>
			<img src={googleIcon} alt='' className='h-10 w-10' />
		</button>
	)
}

export default GoogleSignInButton
