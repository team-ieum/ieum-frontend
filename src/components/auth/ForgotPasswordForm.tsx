import { useState } from 'react'
import TextInput from './textInput'

const ForgotPasswordForm = () => {
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')

	return (
		<form className='flex w-full flex-col justify-center' onSubmit={event => event.preventDefault()}>
			<h1 className='typo-title2_bold text-center text-main-deep-blue'>비밀번호 찾기</h1>

			<div className='mt-16 space-y-4'>
				<TextInput text='name' value={name} onChange={setName} />
				<TextInput text='email' value={email} onChange={setEmail} />
			</div>
		</form>
	)
}

export default ForgotPasswordForm
