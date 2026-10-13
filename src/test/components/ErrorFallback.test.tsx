import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorFallback } from '@/components/ErrorFallback'

const error = new Error('secret internal message')

describe('ErrorFallback', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('개발 모드에서는 안내 문구와 함께 오류 메시지를 표시한다', () => {
		vi.stubEnv('DEV', true)
		render(<ErrorFallback error={error} resetErrorBoundary={vi.fn()} />)

		expect(screen.getByText('일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
		expect(screen.getByText('secret internal message')).toBeInTheDocument()
	})

	it('운영 모드에서는 오류 메시지를 노출하지 않는다', () => {
		vi.stubEnv('DEV', false)
		render(<ErrorFallback error={error} resetErrorBoundary={vi.fn()} />)

		expect(screen.getByText('일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
		expect(screen.queryByText('secret internal message')).not.toBeInTheDocument()
	})

	it('다시 시도 버튼은 resetErrorBoundary를 호출한다', async () => {
		const resetErrorBoundary = vi.fn()
		render(<ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />)

		await userEvent.click(screen.getByRole('button', { name: '다시 시도하기' }))

		expect(resetErrorBoundary).toHaveBeenCalledOnce()
	})
})
