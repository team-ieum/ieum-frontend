import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCreateBlankWorkflow } from '@/hooks/workflow/useCreateBlankWorkflow'
import { useModalStore } from '@/stores/useModalStore'
import { ApiError } from '@/utils/ApiError'

const mocks = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('@/hooks/workflow/mutations/useCreateWorkflowMutation', () => ({
	useCreateWorkflowMutation: () => ({ mutateAsync: mocks.create, isPending: false }),
}))

const renderCreate = () =>
	renderHook(() => ({ create: useCreateBlankWorkflow(), location: useLocation() }), {
		wrapper: ({ children }: PropsWithChildren) => <MemoryRouter initialEntries={['/user']}>{children}</MemoryRouter>,
	})

describe('useCreateBlankWorkflow', () => {
	beforeEach(() => {
		mocks.create.mockReset()
		useModalStore.getState().close()
	})

	it('이름과 빈 노드·연결 세 필드만 보내고 응답 id의 편집 화면으로 이동한 뒤 onCreated에 그 경로를 넘긴다', async () => {
		mocks.create.mockResolvedValue({ data: { id: 'created-workflow' } })
		const onCreated = vi.fn()
		const { result } = renderCreate()

		await act(async () => {
			await result.current.create.createBlankWorkflow(onCreated)
		})

		expect(mocks.create).toHaveBeenCalledExactlyOnceWith({ name: '새 워크플로우', nodes: [], edges: [] })
		expect(result.current.location.pathname).toBe('/workflow/created-workflow')
		expect(onCreated).toHaveBeenCalledExactlyOnceWith('/workflow/created-workflow')
	})

	it.each([
		{ error: new ApiError('INVALID_INPUT', '이름은 필수입니다.'), message: '이름은 필수입니다.' },
		{ error: new Error('network error'), message: '워크플로우 생성에 실패했어요. 다시 시도해주세요.' },
	])('실패하면 "$message" 모달을 띄우고 이동하거나 onCreated를 부르지 않는다', async ({ error, message }) => {
		mocks.create.mockRejectedValue(error)
		const onCreated = vi.fn()
		const { result } = renderCreate()

		await act(async () => {
			await result.current.create.createBlankWorkflow(onCreated)
		})

		expect(useModalStore.getState()).toMatchObject({ isOpen: true, title: '오류', message })
		expect(result.current.location.pathname).toBe('/user')
		expect(onCreated).not.toHaveBeenCalled()
	})

	it('요청이 끝나기 전 다시 부르면 무시하고, 끝난 뒤에는 다시 만들 수 있다', async () => {
		let resolveFirst!: (value: { data: { id: string } }) => void
		mocks.create.mockImplementationOnce(() => new Promise(resolve => (resolveFirst = resolve)))
		const { result } = renderCreate()

		let first!: Promise<void>
		act(() => {
			first = result.current.create.createBlankWorkflow()
		})
		await act(async () => {
			await result.current.create.createBlankWorkflow()
		})
		expect(mocks.create).toHaveBeenCalledTimes(1)

		await act(async () => {
			resolveFirst({ data: { id: 'first' } })
			await first
		})
		mocks.create.mockResolvedValue({ data: { id: 'second' } })
		await act(async () => {
			await result.current.create.createBlankWorkflow()
		})

		expect(mocks.create).toHaveBeenCalledTimes(2)
		expect(result.current.location.pathname).toBe('/workflow/second')
	})
})
