import type { ReactNode } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderAppRoute } from '@/test/renderAppRoute'

vi.mock('framer-motion', async () => {
	const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
	return { ...actual, AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</> }
})
const success = () => HttpResponse.json({ success: true, code: 'OK', message: 'ok' })
const openSignup = () => {
	renderAppRoute('/auth', { auth: null })
	fireEvent.click(screen.getByRole('button', { name: '회원가입하기' }))
}
const enterEmail = async () => {
	fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: ' User@Example.COM ' } })
	fireEvent.click(screen.getByRole('button', { name: '인증코드 받기' }))
	await screen.findByLabelText('인증코드')
}
const verify = async () => {
	fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '048291' } })
	fireEvent.click(screen.getByRole('button', { name: '인증코드 확인' }))
	await screen.findByLabelText('이름', { exact: true })
}
const fillSignupDetails = () => {
	fireEvent.change(screen.getByLabelText('이름', { exact: true }), { target: { value: ' 홍길동 ' } })
	fireEvent.change(screen.getByLabelText('비밀번호', { exact: true }), { target: { value: 'NewPassw0rd!' } })
	fireEvent.change(screen.getByLabelText('비밀번호 확인', { exact: true }), { target: { value: 'NewPassw0rd!' } })
}

describe('회원가입 이메일 인증', () => {
	it('발송과 검증에 같은 소문자 이메일·purpose를 보내고 코드 앞자리 0을 보존한다', async () => {
		const requests = vi.fn()
		server.use(
			http.post('*/api/v1/auth/email/send-code', async ({ request }) => {
				requests('send', await request.json(), request.headers.get('Authorization'))
				return success()
			}),
			http.post('*/api/v1/auth/email/verify-code', async ({ request }) => {
				requests('verify', await request.json(), request.headers.get('Authorization'))
				return success()
			}),
			http.post('*/api/v1/auth/register', async ({ request }) => {
				requests('register', await request.json(), request.headers.get('Authorization'))
				return success()
			})
		)
		openSignup()
		expect(screen.queryByLabelText('비밀번호', { exact: true })).not.toBeInTheDocument()
		await enterEmail()
		await verify()
		fillSignupDetails()
		fireEvent.click(screen.getByRole('button', { name: '회원가입' }))
		await screen.findByRole('button', { name: '로그인' })
		expect(requests.mock.calls).toEqual([
			['send', { email: 'user@example.com', purpose: 'SIGNUP' }, null],
			['verify', { email: 'user@example.com', purpose: 'SIGNUP', code: '048291' }, null],
			['register', { email: 'user@example.com', name: '홍길동', password: 'NewPassw0rd!' }, null],
		])
	})
	it('가입 시 인증 만료 응답은 이메일 단계로 돌아가고 비밀번호를 지운다', async () => {
		server.use(
			http.post('*/api/v1/auth/email/send-code', success),
			http.post('*/api/v1/auth/email/verify-code', success),
			http.post('*/api/v1/auth/register', () =>
				HttpResponse.json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'expired' }, { status: 400 })
			)
		)
		openSignup()
		await enterEmail()
		await verify()
		fillSignupDetails()
		fireEvent.click(screen.getByRole('button', { name: '회원가입' }))
		await waitFor(() =>
			expect(screen.getByLabelText('이메일', { exact: true })).toHaveAccessibleDescription(
				'이메일 인증을 다시 진행해주세요.'
			)
		)
		expect(screen.queryByLabelText('비밀번호', { exact: true })).not.toBeInTheDocument()
	})
})

describe('비밀번호 재설정', () => {
	it('가입 여부를 단정하지 않고 인증 후 재설정 요청과 로그인 복귀를 처리한다', async () => {
		const requests = vi.fn()
		server.use(
			http.post('*/api/v1/auth/email/send-code', async ({ request }) => {
				requests('send', await request.json())
				return success()
			}),
			http.post('*/api/v1/auth/email/verify-code', async ({ request }) => {
				requests('verify', await request.json())
				return success()
			}),
			http.post('*/api/v1/auth/password/reset', async ({ request }) => {
				requests('reset', await request.json(), request.headers.get('Authorization'))
				return success()
			})
		)
		renderAppRoute('/auth', { auth: null })
		fireEvent.click(screen.getByRole('button', { name: '비밀번호 찾기' }))
		await enterEmail()
		expect(screen.getByRole('status')).toHaveTextContent('메일이 오지 않으면 이메일 주소를 확인해주세요.')
		fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '048291' } })
		fireEvent.click(screen.getByRole('button', { name: '인증코드 확인' }))
		await screen.findByLabelText('새 비밀번호')
		fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'NewPassw0rd!' } })
		fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'NewPassw0rd!' } })
		fireEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }))
		await screen.findByRole('button', { name: '로그인' })
		expect(requests.mock.calls).toEqual([
			['send', { email: 'user@example.com', purpose: 'PASSWORD_RESET' }],
			['verify', { email: 'user@example.com', code: '048291', purpose: 'PASSWORD_RESET' }],
			['reset', { email: 'user@example.com', newPassword: 'NewPassw0rd!' }, null],
		])
	})
})
