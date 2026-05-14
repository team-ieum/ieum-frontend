import { AtSignIcon, LockKeyhole } from 'lucide-react'
import type { InputText, TextInputProps } from '../../types/textInput'
import { cn } from '../../utils/cn'

const inputMeta: Record<InputText, { label: string; type: string; placeholder: string; icon: React.ReactNode }> = {
	email: { label: '이메일', type: 'email', placeholder: 'email@email.com', icon: <AtSignIcon /> },
	password: { label: '비밀번호', type: 'password', placeholder: '••••••••', icon: <LockKeyhole /> },
	passwordConfirm: { label: '비밀번호 확인', type: 'password', placeholder: '••••••••', icon: <LockKeyhole /> },
}

const TextInput = ({ text, value, onChange, error }: TextInputProps) => {
	const { icon, type, label, placeholder } = inputMeta[text]
	const hasError = Boolean(error)

	return (
		<div className='flex flex-col'>
			<label className='pl-3 typo-body1_medium text-main-deep-blue mb-2'>{label}</label>
			<div
				className={cn(
					'flex min-h-12.5 flex-row items-center gap-2 rounded-brand-md bg-main-light-blue px-3',
					'shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--color-sub-blue)_20%,transparent)]',
					'transition focus-within:outline-none ring-1',
					hasError
						? 'ring-danger-600 focus-within:ring-2 focus-within:ring-danger-600'
						: 'ring-transparent focus-within:ring-main-blue/25'
				)}
			>
				<span className='shrink-0 typo-body2_regular text-main-deep-blue [&_svg]:size-4.5' aria-hidden='true'>
					{icon}
				</span>
				<input
					type={type}
					placeholder={placeholder}
					value={value}
					onChange={event => onChange(event.target.value)}
					className='h-full min-w-0 flex-1 border-0 bg-transparent py-3 pr-1 typo-body2_regular text-main-deep-blue outline-none placeholder:text-neutral-400'
				/>
			</div>
			{hasError && <p className='pl-3 mt-1 typo-caption1_regular text-danger-700'>{error}</p>}
		</div>
	)
}

export default TextInput
