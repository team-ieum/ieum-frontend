import { fireEvent, render, screen } from '@testing-library/react'
import { ErrorBoundary } from 'react-error-boundary'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChunkLoadError } from '@/app/createPreloadableLazy'
import { ChunkLoadErrorBoundary } from '@/components/common/ChunkLoadErrorBoundary'

const Throw = ({ error }: { error: Error }): never => {
	throw error
}

const renderInBoundary = (error: Error) =>
	render(
		<ErrorBoundary fallback={<p>상위 오류 처리</p>}>
			<ChunkLoadErrorBoundary
				renderFallback={reload => (
					<button type='button' onClick={reload}>
						새로고침
					</button>
				)}
			>
				<Throw error={error} />
			</ChunkLoadErrorBoundary>
		</ErrorBoundary>
	)

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('ChunkLoadErrorBoundary', () => {
	it('chunk 로드 실패는 이 영역에 안내를 표시하고 새로고침으로 document를 다시 불러온다', () => {
		// jsdom의 location.reload는 재정의할 수 없어 location 전체를 대체한다.
		const reload = vi.fn()
		vi.stubGlobal('location', { ...window.location, reload })
		vi.spyOn(console, 'error').mockImplementation(() => undefined)

		renderInBoundary(new ChunkLoadError(new Error('chunk 요청 실패')))
		fireEvent.click(screen.getByRole('button', { name: '새로고침' }))

		expect(screen.queryByText('상위 오류 처리')).not.toBeInTheDocument()
		expect(reload).toHaveBeenCalledTimes(1)
	})

	it('chunk 로드 외 오류는 상위 오류 처리로 넘긴다', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined)

		renderInBoundary(new Error('화면 렌더 오류'))

		expect(screen.getByText('상위 오류 처리')).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '새로고침' })).not.toBeInTheDocument()
	})
})
