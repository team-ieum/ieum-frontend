import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkflowActivation } from '@/hooks/workflow/useWorkflowActivation'
import type { WorkflowRevalidateResult } from '@/types/workflowValidation'

const mocks = vi.hoisted(() => ({
	toggle: vi.fn(),
	openModal: vi.fn(),
	openConfirm: vi.fn(),
}))

vi.mock('@/hooks/workflow/mutations/useToggleWorkflowMutation', () => ({
	useToggleWorkflowMutation: () => ({ mutateAsync: mocks.toggle }),
}))

vi.mock('@/stores/useModalStore', () => ({
	useModalStore: (selector: (state: { open: typeof mocks.openModal; openConfirm: typeof mocks.openConfirm }) => unknown) =>
		selector({ open: mocks.openModal, openConfirm: mocks.openConfirm }),
}))

const createDeferred = <T,>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>(resolvePromise => {
		resolve = resolvePromise
	})
	return { promise, resolve }
}

const renderActivation = (revalidate: () => Promise<WorkflowRevalidateResult>, serverActive = false) =>
	renderHook(({ workflowId }) => useWorkflowActivation({ workflowId, serverActive, revalidate }), {
		initialProps: { workflowId: 'workflow-1' },
	})

const getConfirmOptions = () => mocks.openConfirm.mock.calls[0][0] as { title: string; message: string; onConfirm: () => void }

describe('useWorkflowActivation', () => {
	beforeEach(() => {
		mocks.toggle.mockReset()
		mocks.toggle.mockResolvedValue(undefined)
		mocks.openModal.mockReset()
		mocks.openConfirm.mockReset()
	})

	it('켤 때 다시 검사해 문제가 없으면 확인 없이 켠다', async () => {
		const revalidate = vi.fn().mockResolvedValue({ status: 'ok', errorCount: 0 })
		const { result } = renderActivation(revalidate)

		await act(() => result.current.handleToggleActive())

		expect(revalidate).toHaveBeenCalledOnce()
		expect(mocks.openConfirm).not.toHaveBeenCalled()
		expect(mocks.toggle).toHaveBeenCalledExactlyOnceWith(true)
	})

	it('검사에서 문제가 나오면 확인 창을 띄우고, 확인해야 켠다', async () => {
		const { result } = renderActivation(vi.fn().mockResolvedValue({ status: 'ok', errorCount: 2 }))

		await act(() => result.current.handleToggleActive())

		expect(mocks.toggle).not.toHaveBeenCalled()
		expect(getConfirmOptions().message).toBe('서버 검사에서 문제 2건을 찾았어요. 이대로 켜면 실행될 때마다 실패해요.')

		await act(async () => getConfirmOptions().onConfirm())
		expect(mocks.toggle).toHaveBeenCalledExactlyOnceWith(true)
	})

	it('검사 요청이 실패하면 검사할 수 없다는 확인 창을 띄운다', async () => {
		const { result } = renderActivation(vi.fn().mockResolvedValue({ status: 'unavailable' }))

		await act(() => result.current.handleToggleActive())

		expect(getConfirmOptions()).toMatchObject({
			title: '설정을 검사하지 못했어요',
			message: '지금은 설정을 검사할 수 없어요. 그래도 켤까요?',
		})
		expect(mocks.toggle).not.toHaveBeenCalled()
	})

	it('끌 때는 검사하지 않고 바로 끈다', async () => {
		const revalidate = vi.fn()
		const { result } = renderActivation(revalidate, true)

		await act(() => result.current.handleToggleActive())

		expect(revalidate).not.toHaveBeenCalled()
		expect(mocks.toggle).toHaveBeenCalledExactlyOnceWith(false)
	})

	it('검사 중에 다시 누르면 검사를 겹쳐 보내지 않는다', async () => {
		const pending = createDeferred<WorkflowRevalidateResult>()
		const revalidate = vi.fn().mockReturnValue(pending.promise)
		const { result } = renderActivation(revalidate)

		let first!: Promise<void>
		act(() => {
			first = result.current.handleToggleActive()
		})
		await act(() => result.current.handleToggleActive())
		await act(async () => {
			pending.resolve({ status: 'ok', errorCount: 0 })
			await first
		})

		expect(revalidate).toHaveBeenCalledOnce()
		expect(mocks.toggle).toHaveBeenCalledOnce()
	})

	it('검사 중에 다른 워크플로우로 옮기면 늦은 결과로 확인 창을 열거나 켜지 않는다', async () => {
		const pending = createDeferred<WorkflowRevalidateResult>()
		const { result, rerender } = renderActivation(vi.fn().mockReturnValue(pending.promise))

		let request!: Promise<void>
		act(() => {
			request = result.current.handleToggleActive()
		})
		rerender({ workflowId: 'workflow-2' })
		await act(async () => {
			pending.resolve({ status: 'ok', errorCount: 3 })
			await request
		})

		expect(mocks.openConfirm).not.toHaveBeenCalled()
		expect(mocks.toggle).not.toHaveBeenCalled()
	})
})
