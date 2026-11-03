import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createPartialFailureHandlers } from '@/mocks/apiScenarios'
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
})
