import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiKeySection } from '@/components/aiCredentials/ApiKeySection'
import type { AiProvider } from '@/types/aiCredentials'

const provider = {
	id: 'OPENAI',
	name: 'OpenAI',
	desc: 'GPT 모델',
	methods: ['apikey'],
	brand: 'openai',
	tint: '#000000',
	state: { apikey: { status: 'empty' } },
} as AiProvider

describe('ApiKeySection 접근성', () => {
	it('API Key 입력에 provider 이름이 포함된 접근 이름과 안내 문구를 연결한다', () => {
		render(<ApiKeySection provider={provider} onRegister={vi.fn()} onDelete={vi.fn()} />)

		const input = screen.getByLabelText('OpenAI API Key')
		expect(input).toHaveAccessibleDescription('키는 암호화되어 저장되며, 일부만 표시됩니다.')
		expect(input.closest('label')).not.toContainElement(screen.getByRole('button', { name: 'API Key 표시' }))
	})

	it('키 표시 토글이 aria-pressed로 상태를 전달하고 입력 형식을 바꾼다', async () => {
		const user = userEvent.setup()
		render(<ApiKeySection provider={provider} onRegister={vi.fn()} onDelete={vi.fn()} />)
		const toggle = screen.getByRole('button', { name: 'API Key 표시' })

		expect(toggle).toHaveAttribute('aria-pressed', 'false')
		expect(screen.getByLabelText('OpenAI API Key')).toHaveAttribute('type', 'password')

		await user.click(toggle)

		expect(toggle).toHaveAttribute('aria-pressed', 'true')
		expect(screen.getByLabelText('OpenAI API Key')).toHaveAttribute('type', 'text')
	})

	it('등록 요청 중에는 등록 버튼을 비활성화하고 aria-busy를 전달한다', async () => {
		const user = userEvent.setup()
		render(<ApiKeySection provider={provider} onRegister={vi.fn()} onDelete={vi.fn()} isPending />)

		await user.type(screen.getByLabelText('OpenAI API Key'), 'sk-test')

		const submit = screen.getByRole('button', { name: '등록 중…' })
		expect(submit).toBeDisabled()
		expect(submit).toHaveAttribute('aria-busy', 'true')
	})
})
