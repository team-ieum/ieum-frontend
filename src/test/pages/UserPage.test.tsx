import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { createPartialFailureHandlers } from '@/mocks/apiScenarios'
import { currentUserResponse } from '@/mocks/fixtures/user'
import { server } from '@/mocks/server'
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

	it('닉네임을 바꾸면 저장 버튼이 켜지고 저장 응답으로 화면을 갱신한다', async () => {
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
		const saveButton = screen.getByRole('button', { name: '변경사항 저장' })
		expect(saveButton).toBeDisabled()

		await userEvent.clear(nameInput)
		await userEvent.type(nameInput, '  새 닉네임 ')
		expect(saveButton).toBeEnabled()
		await userEvent.click(saveButton)

		expect(await screen.findByText('변경사항을 저장했어요.')).toHaveAttribute('role', 'status')
		expect(requestBodies).toEqual([{ name: '새 닉네임' }])
		expect(nameInput).toHaveValue('새 닉네임')
		expect(screen.getByRole('button', { name: '변경사항 저장' })).toBeDisabled()
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
		await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

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
		await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

		expect(await screen.findByRole('alert')).toHaveTextContent('사용할 수 없는 닉네임입니다.')
		expect(nameInput).toHaveValue('새 닉네임')
		expect(screen.getByRole('button', { name: '변경사항 저장' })).toBeEnabled()
	})
})
