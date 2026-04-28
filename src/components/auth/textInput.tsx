import { AtSignIcon, LockIcon } from 'lucide-react'

export type InputText = 'email' | 'password' | 'passwordConfirm'

type TextInputProps = {
	text: InputText
	value: string
	onChange: (value: string) => void
	error?: string
}

const inputMeta: Record<InputText, { label: string; type: string; icon: React.ReactNode }> = {
	email: { label: '이메일', type: 'email', icon: <AtSignIcon /> },
	password: { label: '비밀번호', type: 'password', icon: <LockIcon /> },
	passwordConfirm: { label: '비밀번호 확인', type: 'password', icon: <LockIcon /> },
}

const TextInput = ({ text, value, onChange, error }: TextInputProps) => {
	const { icon, type, label } = inputMeta[text]

	return (
		<div className='space-y-1.5'>
			<label className='text-xs font-medium text-neutral-600'>{label}</label>
			<div className='relative'>
				<span className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-500'>
					{icon}
				</span>
				<input
					type={type}
					placeholder={label}
					value={value}
					onChange={event => onChange(event.target.value)}
					className={`h-11 w-full rounded-brand-sm border pr-3 pl-9 text-sm outline-none transition ${
						error ? 'border-danger-600 focus:border-danger-600' : 'border-neutral-200 focus:border-main-blue'
					}`}
				/>
			</div>
			{error && <p className='text-xs text-danger-700'>{error}</p>}
		</div>
	)
}

export default TextInput
