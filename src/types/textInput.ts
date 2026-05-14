export type InputText = 'email' | 'password' | 'passwordConfirm'

export type TextInputProps = {
	text: InputText
	value: string
	onChange: (value: string) => void
	error?: string
}
