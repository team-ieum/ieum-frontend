import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import UserPage from './UserPage'

/** 내 정보 조회가 끝나 닉네임·이메일 입력이 나타날 때까지 기다린다. */
const renderUserPage = async () => {
	render(
		<QueryClientProvider client={createTestQueryClient()}>
			<MemoryRouter>
				<UserPage />
			</MemoryRouter>
		</QueryClientProvider>
	)
	await screen.findByLabelText('닉네임')
}

describe('UserPage', () => {
	it('프로필과 계정 설정 UI를 표시한다', async () => {
		await renderUserPage()

		// 화면에는 제목을 보이지 않는 디자인이므로 보조 기술용 sr-only 제목만 둔다.
		expect(screen.getByRole('heading', { level: 1, name: '계정 설정' })).toHaveClass('sr-only')
		expect(screen.getAllByRole('heading').map(heading => Number(heading.tagName.slice(1)))).toEqual([1, 2])
		expect(screen.getByRole('heading', { level: 2, name: '프로필 정보' })).toBeInTheDocument()
		expect(screen.getByLabelText('닉네임')).toHaveValue('이음새')
		expect(screen.getByLabelText('이메일')).toHaveValue('ieumsae@example.com')
		expect(screen.queryByText('Google로 로그인')).not.toBeInTheDocument()
		expect(screen.queryByText('로그인 및 보안')).not.toBeInTheDocument()
		expect(screen.queryByText('알림 설정')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '비밀번호 변경' })).toHaveAttribute('aria-expanded', 'false')
		expect(screen.getByText('계정 삭제')).toBeInTheDocument()
	})

	it('기능이 연결되지 않은 컨트롤과 바꿀 수 없는 이메일을 비활성 상태로 표시한다', async () => {
		await renderUserPage()

		expect(screen.getByRole('button', { name: '프로필 이미지 변경' })).toBeDisabled()
		// 닉네임을 바꾸기 전에는 저장할 내용이 없다.
		expect(screen.getByRole('button', { name: '변경사항 저장' })).toBeDisabled()
		expect(screen.getByLabelText('닉네임')).not.toHaveAttribute('readonly')
		expect(screen.getByLabelText('이메일')).toHaveAttribute('readonly')
	})

	it('입력 폼을 세로로 배치하고 카드 너비를 제한한다', async () => {
		await renderUserPage()

		const nicknameField = screen.getByLabelText('닉네임').closest('label')
		const form = nicknameField?.parentElement
		const cardContainer = screen.getByRole('heading', { level: 2, name: '프로필 정보' }).parentElement?.parentElement
			?.parentElement

		expect(form).toHaveClass('flex-col')
		expect(cardContainer).toHaveClass('max-w-xl')
	})

	it('저장 버튼을 카드 바깥 오른쪽에 배치한다', async () => {
		await renderUserPage()

		const heading = screen.getByRole('heading', { level: 2, name: '프로필 정보' })
		const card = heading.parentElement?.parentElement
		const saveButton = screen.getByRole('button', { name: '변경사항 저장' })
		const buttonArea = saveButton.parentElement

		expect(card).not.toContainElement(saveButton)
		expect(buttonArea).toHaveClass('justify-end')
		expect(buttonArea?.previousElementSibling).toBe(card)
	})
})
