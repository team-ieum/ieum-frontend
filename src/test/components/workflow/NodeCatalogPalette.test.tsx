import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import NodeCatalogPalette from '@/components/workflow/NodeCatalogPalette'
import { nodeCatalogQueryOptions } from '@/hooks/workflow/queries/nodeCatalogQueryOptions'
import {
	createPartialFailureHandlers,
	createResourceEmptyHandler,
	createResourceHoldHandler,
	createResourceSuccessHandler,
} from '@/mocks/apiScenarios'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'

const renderPalette = () => {
	const onSelect = vi.fn()
	const onClose = vi.fn()
	render(
		<QueryClientProvider client={createTestQueryClient()}>
			<NodeCatalogPalette onSelect={onSelect} onClose={onClose} />
		</QueryClientProvider>
	)
	return { onSelect, onClose }
}

describe('NodeCatalogPalette', () => {
	it('받은 카탈로그가 있으면 재조회가 실패해도 오류 화면 대신 목록을 유지한다', async () => {
		const client = createTestQueryClient()
		const { queryKey } = nodeCatalogQueryOptions()
		render(
			<QueryClientProvider client={client}>
				<NodeCatalogPalette onSelect={vi.fn()} onClose={vi.fn()} />
			</QueryClientProvider>
		)
		expect(await screen.findByRole('button', { name: /Slack/ })).toBeInTheDocument()

		server.use(...createPartialFailureHandlers(['nodeCatalog']))
		// React Query는 결과 알림을 setTimeout(0)으로 미뤄 보내므로 실패 상태가 화면에 반영될 때까지 한 번 더 기다린다.
		await act(async () => {
			await client.refetchQueries({ queryKey })
			await new Promise(resolve => setTimeout(resolve, 0))
		})

		expect(client.getQueryState(queryKey)?.status).toBe('error')
		expect(screen.getByRole('button', { name: /Slack/ })).toBeInTheDocument()
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
	})

	it('카탈로그를 받기 전에는 앱 목록 대신 skeleton을 표시한다', async () => {
		let release!: () => void
		server.use(createResourceHoldHandler('nodeCatalog', new Promise<void>(resolve => (release = resolve))))
		renderPalette()

		expect(screen.getByRole('status', { name: '노드 목록 불러오는 중' })).toHaveAttribute('aria-busy', 'true')
		expect(screen.queryByText('추가할 수 있는 노드가 없어요.')).not.toBeInTheDocument()

		release()
		expect(await screen.findByRole('button', { name: /Slack/ })).toBeInTheDocument()
	})

	it('앱 → 종류 → 이벤트 순서로 고른 항목을 넘기고 뒤로 가기로 앱 목록에 돌아온다', async () => {
		const user = userEvent.setup()
		const { onSelect } = renderPalette()

		await user.click(await screen.findByRole('button', { name: /^AI/ }))

		expect(screen.getByRole('heading', { level: 2, name: 'AI' })).toBeInTheDocument()
		const actionSection = screen.getByRole('region', { name: '작업' })
		await user.click(within(actionSection).getByRole('button', { name: /AI 에이전트/ }))
		expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'ai.agent' }))

		await user.click(screen.getByRole('button', { name: '앱 목록으로' }))
		expect(screen.getByRole('heading', { level: 2, name: '노드 추가' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /Gmail/ })).toBeInTheDocument()
	})

	it('트리거만 있는 앱은 트리거 구역만 보여 준다', async () => {
		const user = userEvent.setup()
		renderPalette()

		await user.click(await screen.findByRole('button', { name: /Gmail/ }))

		expect(screen.getByRole('region', { name: '트리거' })).toBeInTheDocument()
		expect(screen.queryByRole('region', { name: '작업' })).not.toBeInTheDocument()
	})

	it('불러오기에 실패하면 패널 안에서 다시 시도할 수 있다', async () => {
		const user = userEvent.setup()
		server.use(...createPartialFailureHandlers(['nodeCatalog']))
		renderPalette()

		expect(await screen.findByRole('alert')).toHaveTextContent('노드 목록을 불러오지 못했어요.')

		server.use(createResourceSuccessHandler('nodeCatalog'))
		await user.click(screen.getByRole('button', { name: '다시 시도' }))

		expect(await screen.findByRole('button', { name: /Slack/ })).toBeInTheDocument()
	})

	it('추가할 항목이 없으면 빈 상태 문구를 표시한다', async () => {
		server.use(createResourceEmptyHandler('nodeCatalog'))
		renderPalette()

		expect(await screen.findByText('추가할 수 있는 노드가 없어요.')).toBeInTheDocument()
	})

	it('닫기 버튼과 Escape로 닫는다', async () => {
		const user = userEvent.setup()
		const { onClose } = renderPalette()

		await user.click(screen.getByRole('button', { name: '노드 추가 닫기' }))
		await user.keyboard('{Escape}')

		expect(onClose).toHaveBeenCalledTimes(2)
	})
})
