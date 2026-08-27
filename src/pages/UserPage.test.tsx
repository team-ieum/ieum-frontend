import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import UserPage from './UserPage'

describe('UserPage', () => {
	it('프로필과 계정 설정 UI를 표시한다', () => {
		render(<UserPage />)

		expect(screen.queryByRole('heading', { level: 1, name: '계정 설정' })).not.toBeInTheDocument()
		expect(screen.getByRole('heading', { level: 2, name: '프로필 정보' })).toBeInTheDocument()
		expect(screen.getByLabelText('닉네임')).toHaveValue('이음새')
		expect(screen.getByLabelText('이메일')).toHaveValue('ieumsae@example.com')
		expect(screen.queryByText('Google로 로그인')).not.toBeInTheDocument()
		expect(screen.queryByText('로그인 및 보안')).not.toBeInTheDocument()
		expect(screen.getByText('알림 설정')).toBeInTheDocument()
		expect(screen.getByText('계정 삭제')).toBeInTheDocument()
	})

	it('기능이 연결되지 않은 컨트롤을 비활성 상태로 표시한다', () => {
		render(<UserPage />)

		expect(screen.getByRole('button', { name: '프로필 이미지 변경' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '변경사항 저장' })).toBeDisabled()
		expect(screen.getByLabelText('닉네임')).toHaveAttribute('readonly')
		expect(screen.getByLabelText('이메일')).toHaveAttribute('readonly')
	})

	it('입력 폼을 세로로 배치하고 카드 너비를 제한한다', () => {
		render(<UserPage />)

		const nicknameField = screen.getByLabelText('닉네임').closest('label')
		const form = nicknameField?.parentElement
		const cardContainer = screen.getByRole('heading', { level: 2, name: '프로필 정보' }).parentElement?.parentElement
			?.parentElement

		expect(form).toHaveClass('flex-col')
		expect(cardContainer).toHaveClass('max-w-xl')
	})

	it('저장 버튼을 카드 바깥 오른쪽에 배치한다', () => {
		render(<UserPage />)

		const heading = screen.getByRole('heading', { level: 2, name: '프로필 정보' })
		const card = heading.parentElement?.parentElement
		const saveButton = screen.getByRole('button', { name: '변경사항 저장' })
		const buttonArea = saveButton.parentElement

		expect(card).not.toContainElement(saveButton)
		expect(buttonArea).toHaveClass('justify-end')
		expect(buttonArea?.previousElementSibling).toBe(card)
	})
})
