import type { ReactNode } from 'react'
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAuthMode } from '@/stores/useAuthMode'
import { renderAppRoute } from '@/test/renderAppRoute'

vi.mock('framer-motion', async () => {
	const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
	return { ...actual, AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</> }
})
const openForgotPassword = () => {
	renderAppRoute('/auth', { auth: null })
	fireEvent.click(screen.getByRole('button', { name: '비밀번호 찾기' }))
	return screen.getByRole('form', { name: '비밀번호 찾기' })
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: '인증코드 받기' }))

describe('인증 화면', () => {
	it('비밀번호 찾기는 이메일만 표시하며 패널 위치를 바꾼다', () => {
		const form = openForgotPassword()
		expect(within(form).getAllByRole('textbox')).toHaveLength(1)
		expect(screen.queryByLabelText('이름', { exact: true })).not.toBeInTheDocument()
		expect(screen.queryByLabelText('비밀번호', { exact: true })).not.toBeInTheDocument()
		expect(useAuthMode.getState().swapDirection).toBe(1)
		expect(form.closest('.lg\\:basis-1\\/2')).toHaveClass('lg:order-1')
	})
	it('빈 이메일을 제출하면 입력 오류를 설명한다', () => {
		openForgotPassword()
		submit()
		expect(screen.getByLabelText('이메일', { exact: true })).toHaveAttribute('aria-invalid', 'true')
		expect(screen.getByLabelText('이메일', { exact: true })).toHaveAccessibleDescription('이메일 주소를 다시 확인해주세요!')
	})
	it('잘못된 이메일은 코드 단계로 이동하지 않는다', () => {
		openForgotPassword()
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'invalid' } })
		submit()
		expect(screen.queryByLabelText('인증코드')).not.toBeInTheDocument()
		expect(screen.getByRole('alert')).toBeInTheDocument()
	})
	it('이메일 수정 시 오류를 해제한다', () => {
		openForgotPassword()
		submit()
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'a@example.com' } })
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})
	it('로그인 복귀 후 재진입 시 입력과 오류를 초기화한다', () => {
		openForgotPassword()
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'invalid' } })
		submit()
		fireEvent.click(screen.getByRole('button', { name: '로그인으로 돌아가기' }))
		expect(useAuthMode.getState().swapDirection).toBe(-1)
		fireEvent.click(screen.getByRole('button', { name: '비밀번호 찾기' }))
		expect(screen.getByLabelText('이메일', { exact: true })).toHaveValue('')
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})
	it('회원가입도 이메일 단계부터 시작하고 로그인으로 복귀한다', () => {
		renderAppRoute('/auth', { auth: null })
		fireEvent.click(screen.getByRole('button', { name: '회원가입하기' }))
		expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument()
		expect(screen.queryByLabelText('이름', { exact: true })).not.toBeInTheDocument()
		expect(screen.queryByLabelText('비밀번호', { exact: true })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '로그인하기' }))
		expect(screen.getByLabelText('비밀번호', { exact: true })).toBeInTheDocument()
	})
})
