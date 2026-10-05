import type { ReactNode } from 'react'
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { useAuthMode } from '@/stores/useAuthMode'
import { renderAppRoute } from '@/test/renderAppRoute'

// 화면 동작은 애니메이션 종료 시점과 무관하게 검증한다.
vi.mock('framer-motion', async () => {
	const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
	return {
		...actual,
		AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
	}
})

const openForgotPassword = () => {
	renderAppRoute('/auth', { auth: null })
	fireEvent.click(screen.getByRole('button', { name: '비밀번호 찾기' }))
	return screen.getByRole('form', { name: '비밀번호 찾기' })
}

const fillValidValues = () => {
	fireEvent.change(screen.getByLabelText('이름', { exact: true }), { target: { value: '홍길동' } })
	fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'ieum@example.com' } })
}

const submitForgotPassword = () => {
	fireEvent.click(screen.getByRole('button', { name: '재설정 이메일 받기' }))
}

describe('비밀번호 찾기 화면', () => {
	it('로그인에서 이름과 이메일 폼으로 전환하고 회원가입과 같은 방향으로 패널을 바꾼다', () => {
		const form = openForgotPassword()
		expect(within(form).getByRole('heading', { name: '비밀번호 찾기' })).toBeInTheDocument()
		expect(within(form).getAllByRole('textbox')).toHaveLength(2)
		expect(screen.queryByLabelText('비밀번호', { exact: true })).not.toBeInTheDocument()
		expect(useAuthMode.getState().swapDirection).toBe(1)
		expect(form.closest('.lg\\:basis-1\\/2')).toHaveClass('lg:order-1')
	})

	it('빈 값을 제출하면 두 입력창에 오류를 표시하고 오류 설명을 연결한다', () => {
		openForgotPassword()
		submitForgotPassword()

		const name = screen.getByLabelText('이름', { exact: true })
		const email = screen.getByLabelText('이메일', { exact: true })
		expect(name).toHaveAttribute('aria-invalid', 'true')
		expect(email).toHaveAttribute('aria-invalid', 'true')
		expect(name).toHaveAccessibleDescription('이름을 입력해주세요!')
		expect(email).toHaveAccessibleDescription('이메일 주소를 다시 확인해주세요!')
		expect(screen.getAllByRole('alert')).toHaveLength(2)
		expect(screen.queryByRole('status')).not.toBeInTheDocument()
	})

	it('공백으로만 된 이름과 잘못된 이메일을 거부한다', () => {
		openForgotPassword()
		fireEvent.change(screen.getByLabelText('이름', { exact: true }), { target: { value: '   ' } })
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'invalid-email' } })
		submitForgotPassword()

		expect(screen.getByText('이름을 입력해주세요!')).toBeInTheDocument()
		expect(screen.getByText('이메일 주소를 다시 확인해주세요!')).toBeInTheDocument()
		expect(screen.queryByRole('status')).not.toBeInTheDocument()
	})

	it('오류가 있는 입력을 수정하면 해당 필드의 오류만 해제한다', () => {
		openForgotPassword()
		submitForgotPassword()
		fireEvent.change(screen.getByLabelText('이름', { exact: true }), { target: { value: '홍길동' } })

		expect(screen.getByLabelText('이름', { exact: true })).toHaveAttribute('aria-invalid', 'false')
		expect(screen.getByLabelText('이름', { exact: true })).not.toHaveAttribute('aria-describedby')
		expect(screen.queryByText('이름을 입력해주세요!')).not.toBeInTheDocument()
		expect(screen.getByText('이메일 주소를 다시 확인해주세요!')).toBeInTheDocument()
	})

	it('유효한 폼 제출은 앞뒤 공백을 정리하고 네트워크 요청 없이 준비 중 안내를 표시한다', () => {
		const observeRequest = vi.fn()
		server.events.on('request:start', observeRequest)
		try {
			const form = openForgotPassword()
			fireEvent.change(screen.getByLabelText('이름', { exact: true }), { target: { value: ' 홍길동 ' } })
			fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: ' ieum@example.com ' } })
			fireEvent.submit(form)

			expect(screen.getByLabelText('이름', { exact: true })).toHaveValue('홍길동')
			expect(screen.getByLabelText('이메일', { exact: true })).toHaveValue('ieum@example.com')
			expect(screen.getByRole('status')).toHaveTextContent(
				'비밀번호 재설정 이메일 발송 기능을 준비 중입니다. 아직 이메일이 발송되지 않습니다.'
			)
			expect(screen.queryByRole('alert')).not.toBeInTheDocument()
			expect(observeRequest).not.toHaveBeenCalled()
		} finally {
			server.events.removeListener('request:start', observeRequest)
		}
	})

	it('제출 후 값을 수정하면 안내를 지우고 다시 제출할 때 새 값을 검증한다', () => {
		openForgotPassword()
		fillValidValues()
		submitForgotPassword()
		expect(screen.getByRole('status')).toBeInTheDocument()

		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'invalid' } })
		expect(screen.queryByRole('status')).not.toBeInTheDocument()
		submitForgotPassword()
		expect(screen.getByText('이메일 주소를 다시 확인해주세요!')).toBeInTheDocument()
		expect(screen.queryByRole('status')).not.toBeInTheDocument()

		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'new@example.com' } })
		submitForgotPassword()
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(screen.getByRole('status')).toBeInTheDocument()
	})

	it('입력 검증 없이 로그인으로 복귀하고 다시 열면 이전 값과 오류를 초기화한다', () => {
		openForgotPassword()
		fireEvent.change(screen.getByLabelText('이름', { exact: true }), { target: { value: '홍길동' } })
		submitForgotPassword()
		fireEvent.click(screen.getByRole('button', { name: '로그인으로 돌아가기' }))

		expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
		expect(screen.getByLabelText('비밀번호', { exact: true })).toBeInTheDocument()
		expect(useAuthMode.getState().swapDirection).toBe(-1)
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '비밀번호 찾기' }))
		expect(screen.getByLabelText('이름', { exact: true })).toHaveValue('')
		expect(screen.getByLabelText('이메일', { exact: true })).toHaveValue('')
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(screen.queryByRole('status')).not.toBeInTheDocument()
	})

	it('비밀번호 찾기에서 돌아온 후에도 회원가입과 로그인 전환을 유지한다', () => {
		openForgotPassword()
		fireEvent.click(screen.getByRole('button', { name: '로그인으로 돌아가기' }))
		fireEvent.click(screen.getByRole('button', { name: '회원가입하기' }))

		expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument()
		expect(screen.getByLabelText('이름', { exact: true })).toBeInTheDocument()
		const password = screen.getByLabelText('비밀번호', { exact: true })
		const confirmation = screen.getByLabelText('비밀번호 확인', { exact: true })
		expect(password.id).not.toBe(confirmation.id)
		expect(useAuthMode.getState().swapDirection).toBe(1)

		fireEvent.click(screen.getByRole('button', { name: '로그인하기' }))
		expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
		expect(useAuthMode.getState().swapDirection).toBe(-1)
	})
})
