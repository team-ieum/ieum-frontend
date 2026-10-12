import { Suspense, type ComponentType } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createPreloadableLazy } from '@/app/createPreloadableLazy'

const ChunkContent = () => <p>분리 chunk 내용</p>

const renderWithFallback = (Component: ComponentType) =>
	render(
		<Suspense fallback={<p>chunk 불러오는 중</p>}>
			<Component />
		</Suspense>
	)

describe('createPreloadableLazy', () => {
	it('preload가 끝난 module은 첫 렌더에서 fallback 없이 바로 표시한다', async () => {
		const { Component, preload } = createPreloadableLazy(() => Promise.resolve({ default: ChunkContent }))

		await preload()
		renderWithFallback(Component)

		expect(screen.getByText('분리 chunk 내용')).toBeInTheDocument()
		expect(screen.queryByText('chunk 불러오는 중')).not.toBeInTheDocument()
	})

	it('preload 전에 렌더하면 fallback을 표시한 뒤 module을 표시한다', async () => {
		const { Component } = createPreloadableLazy(() => Promise.resolve({ default: ChunkContent }))

		renderWithFallback(Component)

		expect(screen.getByText('chunk 불러오는 중')).toBeInTheDocument()
		expect(await screen.findByText('분리 chunk 내용')).toBeInTheDocument()
	})

	it('진행 중인 import는 preload와 lazy 렌더가 공유한다', async () => {
		const importer = vi.fn(() => Promise.resolve({ default: ChunkContent }))
		const { Component, preload } = createPreloadableLazy(importer)

		const preloading = preload()
		renderWithFallback(Component)
		await preloading

		expect(await screen.findByText('분리 chunk 내용')).toBeInTheDocument()
		expect(importer).toHaveBeenCalledTimes(1)
	})

	it('import가 실패해도 preload는 reject하지 않고 다음 호출에서 다시 import한다', async () => {
		const importer = vi
			.fn<() => Promise<{ default: typeof ChunkContent }>>()
			.mockRejectedValueOnce(new Error('chunk 요청 실패'))
			.mockResolvedValueOnce({ default: ChunkContent })
		const { Component, preload } = createPreloadableLazy(importer)

		await expect(preload()).resolves.toBeUndefined()
		await preload()
		renderWithFallback(Component)

		expect(screen.getByText('분리 chunk 내용')).toBeInTheDocument()
		expect(importer).toHaveBeenCalledTimes(2)
	})
})
