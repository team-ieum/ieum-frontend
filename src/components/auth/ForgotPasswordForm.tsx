import { useState } from 'react'
import TextInput from './textInput'
import AuthSubmitButton from './AuthSubmitButton'

const ForgotPasswordForm = () => {
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')

	return (
		<form className='flex w-full flex-col justify-center' onSubmit={event => event.preventDefault()}>
			<div className='space-y-3 text-center'>
				<h1 className='typo-title2_bold text-main-deep-blue'>비밀번호 찾기</h1>
				<p className='typo-body2_regular text-neutral-500'>가입할 때 사용한 이름과 이메일을 입력해주세요.</p>
			</div>

			<div className='mt-16 space-y-4'>
				<TextInput text='name' value={name} onChange={setName} />
				<TextInput text='email' value={email} onChange={setEmail} />
			</div>

			<div className='mt-13'>
				<AuthSubmitButton label='재설정 이메일 받기' disabled />
			</div>
		</form>
	)
}

export default ForgotPasswordForm
