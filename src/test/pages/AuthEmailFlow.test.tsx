import type { ReactNode } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { useAuthStore } from '@/stores/useAuthStore'
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

afterEach(() => vi.restoreAllMocks())

const errorResponse = (code: string, status = 400) =>
	HttpResponse.json({ success: false, code, message: '서버 내부 문구' }, { status })
const installCodeSuccess = () =>
	server.use(http.post('*/api/v1/auth/email/send-code', success), http.post('*/api/v1/auth/email/verify-code', success))
const openReset = () => {
	renderAppRoute('/auth', { auth: null })
	fireEvent.click(screen.getByRole('button', { name: '비밀번호 찾기' }))
}
const verifyReset = async () => {
	fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '048291' } })
	fireEvent.click(screen.getByRole('button', { name: '인증코드 확인' }))
	await screen.findByLabelText('새 비밀번호')
}
const fillResetDetails = (password = 'NewPassw0rd!', confirmation = password) => {
	fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: password } })
	fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: confirmation } })
}
const advanceClock = (milliseconds: number) => {
	const clock = Date.now() + milliseconds
	vi.spyOn(Date, 'now').mockReturnValue(clock)
	fireEvent(document, new Event('visibilitychange'))
}

describe('인증 정책과 오류 처리', () => {
	it.each(['signup', 'reset'])('%s 이메일 단계에서도 같은 이메일의 재발송 대기 중에는 제출을 막는다', async mode => {
		const sends = vi.fn()
		installCodeSuccess()
		server.use(
			http.post('*/api/v1/auth/email/send-code', () => {
				sends()
				return success()
			})
		)
		if (mode === 'signup') openSignup()
		else openReset()
		await enterEmail()
		fireEvent.click(screen.getByRole('button', { name: '이메일 변경' }))
		const button = screen.getByRole('button', { name: '인증코드 받기' })
		expect(button).toBeDisabled()
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'other@example.com' } })
		expect(button).toBeEnabled()
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: ' USER@Example.COM ' } })
		expect(button).toBeDisabled()
		expect(sends).toHaveBeenCalledTimes(1)
		advanceClock(30_001)
		expect(button).toBeEnabled()
		fireEvent.click(button)
		await screen.findByLabelText('인증코드')
		expect(sends).toHaveBeenCalledTimes(2)
	})

	it.each([
		['EMAIL_ALREADY_EXISTS', 400, '이미 가입된 이메일입니다. 로그인해주세요.'],
		['VERIFICATION_RESEND_TOO_SOON', 429, '잠시 후 다시 요청해주세요.'],
		['MAIL_SEND_FAILED', 503, '메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'],
		['INVALID_INPUT', 400, '이메일 주소를 확인해주세요.'],
	])('발송 오류 %s를 코드 기준으로 안내한다', async (code, status, message) => {
		server.use(http.post('*/api/v1/auth/email/send-code', () => errorResponse(code, status)))
		openSignup()
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'user@example.com' } })
		fireEvent.click(screen.getByRole('button', { name: '인증코드 받기' }))
		expect(await screen.findByRole('alert')).toHaveTextContent(message)
		expect(screen.queryByText('서버 내부 문구')).not.toBeInTheDocument()
		expect(screen.queryByLabelText('인증코드')).not.toBeInTheDocument()
		if (code === 'VERIFICATION_RESEND_TOO_SOON') expect(screen.getByRole('button', { name: '인증코드 받기' })).toBeDisabled()
		else expect(screen.getByRole('button', { name: '인증코드 받기' })).toBeEnabled()
	})
	it('메일 발송 실패는 바로 재시도할 수 있다', async () => {
		let calls = 0
		server.use(
			http.post('*/api/v1/auth/email/send-code', () => (++calls === 1 ? errorResponse('MAIL_SEND_FAILED', 503) : success()))
		)
		openSignup()
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'user@example.com' } })
		fireEvent.click(screen.getByRole('button', { name: '인증코드 받기' }))
		await screen.findByRole('alert')
		fireEvent.click(screen.getByRole('button', { name: '인증코드 받기' }))
		await screen.findByLabelText('인증코드')
		expect(calls).toBe(2)
	})
	it('인증코드 입력에서 문자와 초과 자릿수를 제거한다', async () => {
		installCodeSuccess()
		openSignup()
		await enterEmail()
		fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '0a48291!7' } })
		expect(screen.getByLabelText('인증코드')).toHaveValue('048291')
	})
	it('6자리가 아닌 코드로는 검증 요청을 보내지 않는다', async () => {
		const verifyRequest = vi.fn()
		installCodeSuccess()
		server.use(
			http.post('*/api/v1/auth/email/verify-code', () => {
				verifyRequest()
				return success()
			})
		)
		openSignup()
		await enterEmail()
		fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '123' } })
		fireEvent.click(screen.getByRole('button', { name: '인증코드 확인' }))
		expect(screen.getByRole('alert')).toHaveTextContent('6자리 숫자')
		expect(verifyRequest).not.toHaveBeenCalled()
	})
	it.each([
		['VERIFICATION_CODE_INVALID', '인증코드가 일치하지 않습니다.', false],
		['VERIFICATION_ATTEMPTS_EXCEEDED', '입력 횟수를 초과했습니다. 인증코드를 다시 받아주세요.', true],
		['VERIFICATION_CODE_EXPIRED', '인증코드가 만료되었습니다. 다시 받아주세요.', true],
		['INVALID_INPUT', '인증코드는 6자리 숫자로 입력해주세요.', false],
	])('검증 오류 %s를 안내하고 폐기된 코드를 차단한다', async (code, message, blocked) => {
		installCodeSuccess()
		server.use(http.post('*/api/v1/auth/email/verify-code', () => errorResponse(code)))
		openSignup()
		await enterEmail()
		fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '048291' } })
		fireEvent.click(screen.getByRole('button', { name: '인증코드 확인' }))
		expect(await screen.findByRole('alert')).toHaveTextContent(message)
		expect(screen.queryByLabelText('비밀번호', { exact: true })).not.toBeInTheDocument()
		if (blocked) {
			expect(screen.getByLabelText('인증코드')).toBeDisabled()
			expect(screen.getByLabelText('인증코드')).toHaveValue('')
			expect(screen.getByRole('button', { name: '인증코드 확인' })).toBeDisabled()
		}
	})
	it('다섯 번째 실패로 폐기된 코드는 재발송 후에만 다시 검증한다', async () => {
		let attempts = 0
		installCodeSuccess()
		server.use(
			http.post('*/api/v1/auth/email/verify-code', () =>
				errorResponse(++attempts < 5 ? 'VERIFICATION_CODE_INVALID' : 'VERIFICATION_ATTEMPTS_EXCEEDED')
			)
		)
		openSignup()
		await enterEmail()
		for (let index = 0; index < 5; index += 1) {
			fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '111111' } })
			fireEvent.click(screen.getByRole('button', { name: '인증코드 확인' }))
			await waitFor(() => expect(attempts).toBe(index + 1))
			await screen.findByRole('alert')
		}
		expect(screen.getByRole('button', { name: '인증코드 확인' })).toBeDisabled()
		advanceClock(30_001)
		fireEvent.click(screen.getByRole('button', { name: '인증코드 다시 받기' }))
		await waitFor(() => expect(screen.getByLabelText('인증코드')).toBeEnabled())
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})
	it('재발송은 30초 후에 가능하고 성공 시 이전 입력과 타이머를 초기화한다', async () => {
		const sends = vi.fn()
		installCodeSuccess()
		server.use(
			http.post('*/api/v1/auth/email/send-code', () => {
				sends()
				return success()
			})
		)
		openReset()
		await enterEmail()
		expect(screen.getByRole('button', { name: /인증코드 다시 받기/ })).toBeDisabled()
		expect(screen.getByLabelText('인증코드 남은 시간')).toHaveTextContent('5:00')
		fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '123456' } })
		advanceClock(29_000)
		expect(screen.getByRole('button', { name: /인증코드 다시 받기/ })).toBeDisabled()
		advanceClock(1_001)
		fireEvent.click(screen.getByRole('button', { name: '인증코드 다시 받기' }))
		await waitFor(() => expect(sends).toHaveBeenCalledTimes(2))
		await waitFor(() => expect(screen.getByLabelText('인증코드')).toHaveValue(''))
		expect(screen.getByLabelText('인증코드 남은 시간')).toHaveTextContent('5:00')
		expect(screen.getByRole('button', { name: /인증코드 다시 받기/ })).toBeDisabled()
	})
	it('5분이 지난 코드는 탭 복귀 시 폐기하고 다시 받기를 유도한다', async () => {
		const request = vi.fn()
		installCodeSuccess()
		server.use(
			http.post('*/api/v1/auth/email/verify-code', () => {
				request()
				return success()
			})
		)
		openReset()
		await enterEmail()
		fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '123456' } })
		advanceClock(300_001)
		expect(screen.getByRole('alert')).toHaveTextContent('인증코드가 만료되었습니다.')
		expect(screen.getByLabelText('인증코드')).toHaveValue('')
		expect(screen.getByRole('button', { name: '인증코드 확인' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '인증코드 다시 받기' })).toBeEnabled()
		expect(request).not.toHaveBeenCalled()
	})
	it.each(['signup', 'reset'])('인증 완료 10분 만료는 %s 입력을 지우고 이메일 단계로 돌아간다', async mode => {
		installCodeSuccess()
		if (mode === 'signup') {
			openSignup()
			await enterEmail()
			await verify()
			fillSignupDetails()
		} else {
			openReset()
			await enterEmail()
			await verifyReset()
			fillResetDetails()
		}
		expect(screen.getByLabelText('인증 완료 남은 시간')).toHaveTextContent('10:00')
		advanceClock(600_001)
		expect(screen.getByLabelText('이메일', { exact: true })).toHaveAccessibleDescription(/유효시간이 만료/)
		expect(screen.queryByLabelText('비밀번호', { exact: true })).not.toBeInTheDocument()
		expect(screen.queryByLabelText('새 비밀번호')).not.toBeInTheDocument()
		await enterEmail()
		if (mode === 'signup') {
			await verify()
			expect(screen.getByLabelText('비밀번호', { exact: true })).toHaveValue('')
		} else {
			await verifyReset()
			expect(screen.getByLabelText('새 비밀번호')).toHaveValue('')
		}
	})
	it('이메일을 변경하면 이전 인증·코드·비밀번호를 사용할 수 없다', async () => {
		installCodeSuccess()
		openSignup()
		await enterEmail()
		await verify()
		fillSignupDetails()
		fireEvent.click(screen.getByRole('button', { name: '이메일 변경' }))
		expect(screen.getByLabelText('이메일', { exact: true })).toBeInTheDocument()
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'other@example.com' } })
		fireEvent.click(screen.getByRole('button', { name: '인증코드 받기' }))
		await screen.findByLabelText('인증코드')
		expect(screen.getByLabelText('인증코드')).toHaveValue('')
		await verify()
		expect(screen.getByText('other@example.com')).toBeInTheDocument()
		expect(screen.getByLabelText('비밀번호', { exact: true })).toHaveValue('')
	})
	it('인증 요청을 빠르게 중복 제출해도 한 번만 보낸다', async () => {
		const sends = vi.fn()
		server.use(
			http.post('*/api/v1/auth/email/send-code', async () => {
				sends()
				await delay(100)
				return success()
			})
		)
		openSignup()
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'user@example.com' } })
		const form = screen.getByRole('form', { name: '회원가입' })
		fireEvent.submit(form)
		fireEvent.submit(form)
		await screen.findByLabelText('인증코드')
		expect(sends).toHaveBeenCalledTimes(1)
	})
	it('화면을 떠난 뒤 도착한 발송 응답이 재진입 화면을 바꾸지 않는다', async () => {
		let finish!: () => void
		const responseReady = new Promise<void>(resolve => {
			finish = resolve
		})
		const sends = vi.fn()
		server.use(
			http.post('*/api/v1/auth/email/send-code', async () => {
				sends()
				await responseReady
				return success()
			})
		)
		openSignup()
		fireEvent.change(screen.getByLabelText('이메일', { exact: true }), { target: { value: 'user@example.com' } })
		fireEvent.click(screen.getByRole('button', { name: '인증코드 받기' }))
		await waitFor(() => expect(sends).toHaveBeenCalledTimes(1))
		fireEvent.click(screen.getByRole('button', { name: '로그인하기' }))
		fireEvent.click(screen.getByRole('button', { name: '회원가입하기' }))
		finish()
		await waitFor(() => expect(screen.getByLabelText('이메일', { exact: true })).toHaveValue(''))
		expect(screen.queryByLabelText('인증코드')).not.toBeInTheDocument()
	})
	it('비밀번호 규칙과 확인 불일치는 재설정 요청 전에 차단한다', async () => {
		const resets = vi.fn()
		installCodeSuccess()
		server.use(
			http.post('*/api/v1/auth/password/reset', () => {
				resets()
				return success()
			})
		)
		openReset()
		await enterEmail()
		await verifyReset()
		fillResetDetails('abcdefgh', 'different')
		fireEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }))
		expect(screen.getByLabelText('새 비밀번호')).toHaveAttribute('aria-invalid', 'true')
		expect(screen.getByLabelText('비밀번호 확인')).toHaveAccessibleDescription('비밀번호가 일치하지 않아요!')
		expect(resets).not.toHaveBeenCalled()
	})
	it.each(['EMAIL_NOT_VERIFIED', 'INVALID_INPUT'])('재설정 오류 %s를 안내한다', async code => {
		installCodeSuccess()
		server.use(http.post('*/api/v1/auth/password/reset', () => errorResponse(code)))
		openReset()
		await enterEmail()
		await verifyReset()
		fillResetDetails()
		fireEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }))
		expect(await screen.findByRole('alert')).toHaveTextContent(
			code === 'EMAIL_NOT_VERIFIED' ? '이메일 인증을 다시 진행해주세요.' : '비밀번호는 8~100자'
		)
		if (code === 'EMAIL_NOT_VERIFIED') expect(screen.getByLabelText('이메일', { exact: true })).toBeInTheDocument()
	})
	it('재설정 성공은 기존 로컬 로그인 상태도 지우고 자동 로그인하지 않는다', async () => {
		installCodeSuccess()
		server.use(http.post('*/api/v1/auth/password/reset', success))
		openReset()
		await enterEmail()
		await verifyReset()
		fillResetDetails()
		useAuthStore.getState().setAuth('existing-access', 'existing-refresh')
		fireEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }))
		await screen.findByRole('button', { name: '로그인' })
		expect(useAuthStore.getState().accessToken).toBeNull()
		expect(useAuthStore.getState().refreshToken).toBeNull()
	})
	it('200 안의 실패 응답도 인증 성공으로 취급하지 않는다', async () => {
		installCodeSuccess()
		server.use(http.post('*/api/v1/auth/email/verify-code', () => errorResponse('VERIFICATION_CODE_INVALID', 200)))
		openSignup()
		await enterEmail()
		fireEvent.change(screen.getByLabelText('인증코드'), { target: { value: '048291' } })
		fireEvent.click(screen.getByRole('button', { name: '인증코드 확인' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('인증코드가 일치하지 않습니다.')
		expect(screen.queryByLabelText('비밀번호', { exact: true })).not.toBeInTheDocument()
	})
})

describe('늦게 완료된 비밀번호 재설정', () => {
	it.each(['expired', 'left'])('%s 상태에서도 성공한 재설정은 기존 로그인 정보를 지우고 현재 화면을 유지한다', async state => {
		let finish!: () => void
		const responseReady = new Promise<void>(resolve => {
			finish = resolve
		})
		const requested = vi.fn()
		installCodeSuccess()
		server.use(
			http.post('*/api/v1/auth/password/reset', async () => {
				requested()
				await responseReady
				return success()
			})
		)
		openReset()
		await enterEmail()
		await verifyReset()
		fillResetDetails()
		useAuthStore.getState().setAuth('existing-access', 'existing-refresh')
		fireEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }))
		await waitFor(() => expect(requested).toHaveBeenCalledTimes(1))
		if (state === 'expired') {
			advanceClock(600_001)
			expect(screen.getByLabelText('이메일', { exact: true })).toBeInTheDocument()
		} else {
			fireEvent.click(screen.getByRole('button', { name: '로그인으로 돌아가기' }))
			expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
		}
		finish()
		await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull())
		expect(useAuthStore.getState().refreshToken).toBeNull()
		expect(screen.queryByRole('heading', { name: '비밀번호 변경 완료' })).not.toBeInTheDocument()
		if (state === 'expired') expect(screen.getByRole('heading', { name: '비밀번호 찾기' })).toBeInTheDocument()
		else expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
	})
})
