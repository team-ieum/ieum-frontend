import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { createPartialFailureHandlers } from '@/mocks/apiScenarios'
import { currentUserResponse } from '@/mocks/fixtures/user'
import { server } from '@/mocks/server'
import { useAuthStore } from '@/stores/useAuthStore'
import { setReducedMotion } from '@/test/domEnvironment'
import { renderAppRoute } from '@/test/renderAppRoute'

vi.mock('@/components/routing/RouteTransition', async () => {
	const { Outlet } = await import('react-router')
	return { RouteTransition: Outlet }
})

describe('UserPage 내 정보 조회', () => {
	it('불러오는 동안 skeleton을 보인 뒤 내 이름과 이메일을 표시한다', async () => {
		renderAppRoute('/user')

		expect(await screen.findByRole('status', { name: '프로필 정보 불러오는 중' })).toBeInTheDocument()
		expect(await screen.findByLabelText('닉네임')).toHaveValue('이음새')
		expect(screen.getByLabelText('이메일')).toHaveValue('ieumsae@example.com')
		expect(screen.queryByRole('status', { name: '프로필 정보 불러오는 중' })).not.toBeInTheDocument()
	})

	it('조회에 실패하면 오류를 표시하고 다시 시도로 다시 불러온다', async () => {
		server.use(...createPartialFailureHandlers(['currentUser']))
		renderAppRoute('/user')

		expect(await screen.findByText('프로필 정보를 불러오지 못했습니다.')).toBeInTheDocument()
		expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument()

		server.resetHandlers()
		await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))

		expect(await screen.findByLabelText('닉네임')).toHaveValue('이음새')
	})

	it('닉네임을 바꾸면 닉네임 변경 버튼이 켜지고 응답으로 화면을 갱신한다', async () => {
		const requestBodies: unknown[] = []
		server.use(
			http.patch('*/api/v1/users/me', async ({ request }) => {
				const body = (await request.json()) as { name: string }
				requestBodies.push(body)
				return HttpResponse.json({ ...currentUserResponse, data: { ...currentUserResponse.data, name: body.name } })
			})
		)
		renderAppRoute('/user')
		const nameInput = await screen.findByLabelText('닉네임')
		const saveButton = screen.getByRole('button', { name: '닉네임 변경' })
		expect(saveButton).toBeDisabled()

		await userEvent.clear(nameInput)
		await userEvent.type(nameInput, '  새 닉네임 ')
		expect(saveButton).toBeEnabled()
		await userEvent.click(saveButton)

		expect(await screen.findByText('닉네임을 변경했어요.')).toHaveAttribute('role', 'status')
		expect(requestBodies).toEqual([{ name: '새 닉네임' }])
		expect(nameInput).toHaveValue('새 닉네임')
		expect(screen.getByRole('button', { name: '닉네임 변경' })).toBeDisabled()
	})

	it('2~20자를 벗어나면 요청하지 않고 입력 아래에 오류를 표시한다', async () => {
		const onPatch = vi.fn()
		server.use(
			http.patch('*/api/v1/users/me', () => {
				onPatch()
				return HttpResponse.json(currentUserResponse)
			})
		)
		renderAppRoute('/user')
		const nameInput = await screen.findByLabelText('닉네임')

		await userEvent.clear(nameInput)
		await userEvent.type(nameInput, '가')
		await userEvent.click(screen.getByRole('button', { name: '닉네임 변경' }))

		expect(nameInput).toHaveAttribute('aria-invalid', 'true')
		expect(nameInput).toHaveAccessibleDescription('2~20자로 입력해 주세요.')
		expect(onPatch).not.toHaveBeenCalled()
	})

	it('저장에 실패하면 서버 메시지를 표시하고 입력값을 유지한다', async () => {
		server.use(
			http.patch('*/api/v1/users/me', () =>
				HttpResponse.json(
					{ success: false, data: null, message: '사용할 수 없는 닉네임입니다.', code: 'INVALID_INPUT_VALUE' },
					{ status: 400 }
				)
			)
		)
		renderAppRoute('/user')
		const nameInput = await screen.findByLabelText('닉네임')

		await userEvent.clear(nameInput)
		await userEvent.type(nameInput, '새 닉네임')
		await userEvent.click(screen.getByRole('button', { name: '닉네임 변경' }))

		expect(await screen.findByRole('alert')).toHaveTextContent('사용할 수 없는 닉네임입니다.')
		expect(nameInput).toHaveValue('새 닉네임')
		expect(screen.getByRole('button', { name: '닉네임 변경' })).toBeEnabled()
	})

	describe('비밀번호 변경', () => {
		const openPasswordForm = async () => {
			renderAppRoute('/user')
			await screen.findByLabelText('닉네임')
			await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))
		}

		const fillPasswordForm = async (current: string, next: string, confirm = next) => {
			await userEvent.type(screen.getByLabelText('현재 비밀번호'), current)
			await userEvent.type(screen.getByLabelText('새 비밀번호'), next)
			await userEvent.type(screen.getByLabelText('새 비밀번호 확인'), confirm)
			const panel = screen.getByLabelText('현재 비밀번호').closest('form') as HTMLFormElement
			await userEvent.click(within(panel).getByRole('button', { name: '비밀번호 변경' }))
		}

		it('알림 설정 대신 비밀번호 변경 메뉴를 펼치고 닫으면 입력을 비운다', async () => {
			await openPasswordForm()

			expect(screen.queryByText('알림 설정')).not.toBeInTheDocument()
			expect(screen.getAllByRole('button', { name: '비밀번호 변경' })[0]).toHaveAttribute('aria-expanded', 'true')
			await userEvent.type(screen.getByLabelText('현재 비밀번호'), 'Password1!')

			await userEvent.click(screen.getAllByRole('button', { name: '비밀번호 변경' })[0])
			// 접히는 애니메이션이 끝나야 패널이 DOM에서 빠진다.
			await waitFor(() => expect(screen.queryByLabelText('현재 비밀번호')).not.toBeInTheDocument())
			await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))
			expect(screen.getByLabelText('현재 비밀번호')).toHaveValue('')
		})

		it('처음에는 닉네임·이메일을 모두 보이고 펼치면 프로필 정보 제목만 남기고 접었다가 닫으면 되돌린다', async () => {
			// jsdom에서는 처음부터 펼쳐져 있던 영역의 접힘 애니메이션이 끝나지 않으므로 동작 줄이기로 바로 접는다.
			setReducedMotion(true)
			renderAppRoute('/user')
			expect(await screen.findByLabelText('닉네임')).toHaveValue('이음새')
			expect(screen.getByLabelText('이메일')).toHaveValue('ieumsae@example.com')

			await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))
			await waitFor(() => expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument())
			expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument()
			expect(screen.getByRole('heading', { level: 2, name: '프로필 정보' })).toBeInTheDocument()

			await userEvent.click(screen.getAllByRole('button', { name: '비밀번호 변경' })[0])
			expect(await screen.findByLabelText('닉네임')).toHaveValue('이음새')
			expect(screen.getByLabelText('이메일')).toHaveValue('ieumsae@example.com')
		})

		it('회원 탈퇴를 펼쳐도 프로필 정보 제목만 남기고 닉네임·이메일을 접는다', async () => {
			setReducedMotion(true)
			renderAppRoute('/user')
			await screen.findByLabelText('닉네임')

			await userEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }))
			await waitFor(() => expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument())
			expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument()
			expect(screen.getByRole('heading', { level: 2, name: '프로필 정보' })).toBeInTheDocument()
		})

		it('성공하면 토큰을 지우고 로그인 화면으로 보내며 다시 로그인하라고 안내한다', async () => {
			const requestBodies: unknown[] = []
			server.use(
				http.patch('*/api/v1/users/me/password', async ({ request }) => {
					requestBodies.push(await request.json())
					return HttpResponse.json({ success: true, data: {}, message: 'success', code: 'SUCCESS' })
				})
			)
			await openPasswordForm()

			await fillPasswordForm('Password1!', 'NewPassword1!')

			expect(await screen.findByRole('heading', { name: '비밀번호 변경 완료' })).toBeInTheDocument()
			expect(screen.getByText('새 비밀번호로 다시 로그인해 주세요.')).toBeInTheDocument()
			expect(screen.queryByText('로그인 필요')).not.toBeInTheDocument()
			expect(requestBodies).toEqual([{ currentPassword: 'Password1!', newPassword: 'NewPassword1!' }])
			expect(useAuthStore.getState().accessToken).toBeNull()
			expect(localStorage.getItem('accessToken')).toBeNull()
			expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument()
		})

		it('규칙에 맞지 않거나 확인이 다르면 요청하지 않는다', async () => {
			const onPatch = vi.fn()
			server.use(
				http.patch('*/api/v1/users/me/password', () => {
					onPatch()
					return HttpResponse.json({ success: true, data: {}, message: 'success', code: 'SUCCESS' })
				})
			)
			await openPasswordForm()

			await fillPasswordForm('Password1!', 'short', 'other')

			expect(screen.getByLabelText('새 비밀번호')).toHaveAttribute('aria-invalid', 'true')
			expect(screen.getByText('새 비밀번호가 일치하지 않아요.')).toBeInTheDocument()
			expect(onPatch).not.toHaveBeenCalled()
		})

		it('현재 비밀번호가 틀리면 400 응답을 현재 비밀번호 오류로 표시하고 로그인 상태를 유지한다', async () => {
			server.use(
				http.patch('*/api/v1/users/me/password', () =>
					HttpResponse.json(
						{
							success: false,
							data: null,
							message: '현재 비밀번호가 일치하지 않습니다.',
							code: 'CURRENT_PASSWORD_MISMATCH',
						},
						{ status: 400 }
					)
				)
			)
			await openPasswordForm()

			await fillPasswordForm('Wrong1!aa', 'NewPassword1!')

			expect(await screen.findByText('현재 비밀번호가 일치하지 않아요.')).toBeInTheDocument()
			expect(screen.getByLabelText('현재 비밀번호')).toHaveAttribute('aria-invalid', 'true')
			expect(useAuthStore.getState().accessToken).not.toBeNull()
		})

		it('로그인 제한(429)은 form 전체 안내로 표시한다', async () => {
			server.use(
				http.patch('*/api/v1/users/me/password', () =>
					HttpResponse.json({ success: false, data: null, message: 'locked', code: 'LOGIN_LOCKED' }, { status: 429 })
				)
			)
			await openPasswordForm()

			await fillPasswordForm('Wrong1!aa', 'NewPassword1!')

			expect(await screen.findByRole('alert')).toHaveTextContent('24시간 동안 비밀번호 변경과 로그인이 제한돼요.')
		})

		it('소셜 로그인 계정에는 비밀번호 입력 대신 안내를 표시한다', async () => {
			server.use(
				http.get('*/api/v1/users/me', () =>
					HttpResponse.json({ ...currentUserResponse, data: { ...currentUserResponse.data, provider: 'GOOGLE' } })
				)
			)
			await openPasswordForm()

			expect(screen.getByText('소셜 로그인으로 가입한 계정은 비밀번호를 변경할 수 없어요.')).toBeInTheDocument()
			expect(screen.queryByLabelText('현재 비밀번호')).not.toBeInTheDocument()
		})
	})

	describe('회원 탈퇴', () => {
		const openWithdrawPanel = async () => {
			renderAppRoute('/user')
			await screen.findByLabelText('닉네임')
			await userEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }))
		}

		const getWithdrawButton = () => {
			const buttons = screen.getAllByRole('button', { name: '회원 탈퇴' })
			// 첫 번째는 메뉴를 펼치는 버튼이다.
			return buttons[buttons.length - 1]
		}

		it('계정 삭제 대신 회원 탈퇴 메뉴를 펼치고 동의해야 탈퇴 버튼이 켜진다', async () => {
			await openWithdrawPanel()

			expect(screen.queryByText('계정 삭제')).not.toBeInTheDocument()
			expect(screen.getByText('탈퇴하면 계정과 아래 데이터가 즉시 영구 삭제되며 복구할 수 없어요.')).toBeInTheDocument()
			expect(getWithdrawButton()).toBeDisabled()

			await userEvent.click(screen.getByLabelText('안내를 모두 확인했으며 데이터 삭제에 동의합니다.'))
			expect(getWithdrawButton()).toBeEnabled()
		})

		it('비밀번호 변경과 동시에 펼치지 않고 다른 메뉴로 바꾸면 동의를 비운다', async () => {
			setReducedMotion(true)
			await openWithdrawPanel()
			await userEvent.click(screen.getByLabelText('안내를 모두 확인했으며 데이터 삭제에 동의합니다.'))

			await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))
			await waitFor(() =>
				expect(screen.queryByLabelText('안내를 모두 확인했으며 데이터 삭제에 동의합니다.')).not.toBeInTheDocument()
			)
			expect(screen.getAllByRole('button', { name: '회원 탈퇴' })).toHaveLength(1)
			expect(screen.getByLabelText('현재 비밀번호')).toBeInTheDocument()

			await userEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }))
			expect(screen.getByLabelText('안내를 모두 확인했으며 데이터 삭제에 동의합니다.')).not.toBeChecked()
		})

		it('탈퇴에 성공하면 토큰을 지우고 로그인 화면으로 보내며 탈퇴 완료를 안내한다', async () => {
			const onDelete = vi.fn()
			server.use(
				http.delete('*/api/v1/users/me', () => {
					onDelete()
					return HttpResponse.json({ success: true, data: {}, message: 'success', code: 'SUCCESS' })
				})
			)
			await openWithdrawPanel()

			await userEvent.click(screen.getByLabelText('안내를 모두 확인했으며 데이터 삭제에 동의합니다.'))
			await userEvent.click(getWithdrawButton())

			expect(await screen.findByRole('heading', { name: '회원 탈퇴 완료' })).toBeInTheDocument()
			expect(screen.queryByText('로그인 필요')).not.toBeInTheDocument()
			expect(onDelete).toHaveBeenCalledTimes(1)
			expect(useAuthStore.getState().accessToken).toBeNull()
			expect(localStorage.getItem('refreshToken')).toBeNull()
		})

		it('탈퇴에 실패하면 계정이 남아 있다고 안내하고 로그인 상태를 유지한다', async () => {
			server.use(http.delete('*/api/v1/users/me', () => new HttpResponse(null, { status: 500 })))
			await openWithdrawPanel()

			await userEvent.click(screen.getByLabelText('안내를 모두 확인했으며 데이터 삭제에 동의합니다.'))
			await userEvent.click(getWithdrawButton())

			expect(await screen.findByRole('alert')).toHaveTextContent('계정은 그대로 남아 있으니')
			expect(useAuthStore.getState().accessToken).not.toBeNull()
			expect(getWithdrawButton()).toBeEnabled()
		})
	})
})
