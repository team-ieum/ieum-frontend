import { AtSignIcon, LockKeyhole } from 'lucide-react'

export type InputText = 'email' | 'password' | 'passwordConfirm'

type TextInputProps = {
	text: InputText
	value: string
	onChange: (value: string) => void
	error?: string
}

const inputMeta: Record<InputText, { label: string; type: string; placeholder: string; icon: React.ReactNode }> = {
	email: { label: '이메일', type: 'email', placeholder: 'email@email.com', icon: <AtSignIcon /> },
	password: { label: '비밀번호', type: 'password', placeholder: '••••••••', icon: <LockKeyhole /> },
	passwordConfirm: { label: '비밀번호 확인', type: 'password', placeholder: '••••••••', icon: <LockKeyhole /> },
}

const TextInput = ({ text, value, onChange, error }: TextInputProps) => {
	const { icon, type, label, placeholder } = inputMeta[text]

	return (
		<div className='flex flex-col'>
			<label className='pl-3 typo-Body1_Medium text-main-deep-blue mb-2'>{label}</label>
			<div
				className={`flex min-h-12.5 flex-row items-center gap-2 rounded-brand-md bg-main-light-blue px-3 shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--color-sub-blue)_20%,transparent)] transition focus-within:outline-none ${
					error
						? 'ring-1 ring-danger-600 focus-within:ring-2 focus-within:ring-danger-600'
						: 'ring-1 ring-transparent focus-within:ring-main-blue/25'
				}`}
			>
				<span className='shrink-0 typo-Body2_Regular text-main-deep-blue [&_svg]:size-4.5' aria-hidden='true'>
					{icon}
				</span>
				<input
					type={type}
					placeholder={placeholder}
					value={value}
					onChange={event => onChange(event.target.value)}
					className='h-full min-w-0 flex-1 border-0 bg-transparent py-3 pr-1 typo-Body2_Regular text-main-deep-blue outline-none placeholder:text-neutral-400'
				/>
			</div>
			{error && <p className='pl-3 mt-1 typo-Caption1_Regular text-danger-700'>{error}</p>}
		</div>
	)
}

export default TextInput
