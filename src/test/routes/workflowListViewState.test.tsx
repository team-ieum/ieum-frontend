import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAppRoute } from '@/test/renderAppRoute'

describe('워크플로우 목록 보기 URL 상태', () => {
	it('보기 전환을 URL history에 기록하고 back/forward에서 복원한다', async () => {
		const { router } = renderAppRoute('/workflow')
		await screen.findByRole('button', { name: '고객 문의 자동 분류 열기' })

		fireEvent.click(screen.getByRole('button', { name: '행 보기' }))
		await waitFor(() => expect(router.state.location.search).toBe('?view=row'))
		expect(screen.getByRole('button', { name: '행 보기' })).toHaveAttribute('aria-pressed', 'true')

		fireEvent.click(screen.getByRole('button', { name: '카드 보기' }))
		await waitFor(() => expect(router.state.location.search).toBe(''))
		expect(screen.getByRole('button', { name: '카드 보기' })).toHaveAttribute('aria-pressed', 'true')

		await act(async () => router.navigate(-1))
		expect(screen.getByRole('button', { name: '행 보기' })).toHaveAttribute('aria-pressed', 'true')

		await act(async () => router.navigate(1))
		expect(screen.getByRole('button', { name: '카드 보기' })).toHaveAttribute('aria-pressed', 'true')
	})

	it('중복되거나 잘못된 view 값을 card로 해석하고 다른 query를 보존해 정규화한다', async () => {
		const { router } = renderAppRoute('/workflow?view=row&view=invalid&source=test')

		await waitFor(() => expect(router.state.location.search).toBe('?source=test'))
		expect(screen.getByRole('button', { name: '카드 보기' })).toHaveAttribute('aria-pressed', 'true')
	})

	it('초기 진입에서 row 보기를 복원하고 다른 query를 유지한다', async () => {
		const { router } = renderAppRoute('/workflow?view=row&source=test')

		await waitFor(() => expect(screen.getByRole('button', { name: '행 보기' })).toHaveAttribute('aria-pressed', 'true'))
		expect(router.state.location.search).toBe('?view=row&source=test')
	})
})
