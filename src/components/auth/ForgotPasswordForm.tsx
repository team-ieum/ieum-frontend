import { useId } from 'react'
import TextInput from './textInput'
import AuthSubmitButton from './AuthSubmitButton'
import { useValidatedForgotPasswordForm } from '@/hooks/auth/useValidatedForgotPasswordForm'
import { useAuthMode } from '@/stores/useAuthMode'

const ForgotPasswordForm = () => {
	const titleId = useId()
	const descriptionId = `${titleId}-description`
	const { values, errors, showUnavailableNotice, handleChange, handleSubmit } = useValidatedForgotPasswordForm()
	const toLogin = useAuthMode(state => state.toLogin)

	return (
		<form
			className='flex w-full flex-col justify-center'
			onSubmit={handleSubmit}
			aria-labelledby={titleId}
			aria-describedby={descriptionId}
			noValidate
		>
			<div className='space-y-3 text-center'>
				<h1 id={titleId} className='typo-title2_bold text-main-deep-blue'>
					비밀번호 찾기
				</h1>
				<p id={descriptionId} className='typo-body2_regular text-balance text-neutral-500'>
					가입할 때 사용한 이름과 이메일을 입력해주세요.
				</p>
			</div>

			<div className='mt-8 space-y-4 sm:mt-12 lg:mt-16'>
				<TextInput
					text='name'
					value={values.name}
					onChange={value => handleChange('name', value)}
					error={errors.name}
					autoComplete='name'
				/>
				<TextInput
					text='email'
					value={values.email}
					onChange={value => handleChange('email', value)}
					error={errors.email}
					autoComplete='email'
				/>
			</div>

			<div className='mt-8 sm:mt-10 lg:mt-13'>
				<AuthSubmitButton label='재설정 이메일 받기' />
			</div>

			{showUnavailableNotice && (
				<p
					role='status'
					className='mt-4 rounded-brand-md bg-main-light-blue px-4 py-3 typo-caption1_regular text-main-deep-blue'
				>
					비밀번호 재설정 이메일 발송 기능을 준비 중입니다. 아직 이메일이 발송되지 않습니다.
				</p>
			)}

			<div className='pt-6 text-center'>
				<button
					type='button'
					onClick={toLogin}
					className='typo-caption1_medium inline-flex min-h-10 items-center justify-center rounded-brand-md px-3 text-main-deep-blue hover:typo-caption1_bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
				>
					로그인으로 돌아가기
				</button>
			</div>
		</form>
	)
}

export default ForgotPasswordForm
