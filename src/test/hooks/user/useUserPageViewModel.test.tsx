import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { useUserPageViewModel } from '@/hooks/user/useUserPageViewModel'
import { currentUserResponse } from '@/mocks/fixtures/user'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'

const createWrapper =
	() =>
	({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
	)

const renderViewModel = async () => {
	const rendered = renderHook(() => useUserPageViewModel(), { wrapper: createWrapper() })
	await waitFor(() => expect(rendered.result.current.profileResource.isLoading).toBe(false))
	return rendered
}

describe('useUserPageViewModel', () => {
	it('내 정보를 받으면 프로필을 펼친 채 이메일·닉네임과 입력 규칙을 내려준다', async () => {
		const { result } = await renderViewModel()

		expect(result.current.email).toBe('ieumsae@example.com')
		expect(result.current.nameField.value).toBe('이음새')
		expect(result.current.nameField.message).toEqual({ text: '2~20자로 입력해 주세요.', tone: 'hint' })
		expect(result.current.nameField.isSubmitDisabled).toBe(true)
		expect(result.current.isProfileCollapsed).toBe(false)
		expect(result.current.passwordSection.canChangePassword).toBe(true)
	})

	it('비밀번호 변경과 회원 탈퇴는 하나만 펼치고 펼친 동안 프로필을 접는다', async () => {
		const { result } = await renderViewModel()

		act(() => result.current.passwordSection.handleToggle())
		expect(result.current.passwordSection.isOpen).toBe(true)
		expect(result.current.isProfileCollapsed).toBe(true)

		act(() => result.current.withdrawSection.handleToggle())
		expect(result.current.passwordSection.isOpen).toBe(false)
		expect(result.current.withdrawSection.isOpen).toBe(true)

		act(() => result.current.withdrawSection.handleToggle())
		expect(result.current.withdrawSection.isOpen).toBe(false)
		expect(result.current.isProfileCollapsed).toBe(false)
	})

	it('닉네임을 바꾸면 변경 버튼을 켜고 저장 결과를 입력 규칙 대신 보여 준다', async () => {
		server.use(
			http.patch('*/api/v1/users/me', () =>
				HttpResponse.json({ ...currentUserResponse, data: { ...currentUserResponse.data, name: '새 닉네임' } })
			)
		)
		const { result } = await renderViewModel()

		act(() => result.current.nameField.handleChange('새 닉네임'))
		expect(result.current.nameField.isSubmitDisabled).toBe(false)

		act(() => result.current.nameField.handleSubmit({ preventDefault: () => {} } as never))
		await waitFor(() =>
			expect(result.current.nameField.message).toEqual({ text: '닉네임을 변경했어요.', tone: 'success', role: 'status' })
		)
		expect(result.current.nameField.value).toBe('새 닉네임')
	})

	it('소셜 로그인 계정은 비밀번호를 바꿀 수 없다고 알린다', async () => {
		server.use(
			http.get('*/api/v1/users/me', () =>
				HttpResponse.json({ ...currentUserResponse, data: { ...currentUserResponse.data, provider: 'GOOGLE' } })
			)
		)
		const { result } = await renderViewModel()

		expect(result.current.passwordSection.canChangePassword).toBe(false)
		expect(result.current.passwordSection.isToggleDisabled).toBe(false)
	})
})
