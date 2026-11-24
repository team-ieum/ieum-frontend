import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useNodeDeleteConfirm } from '@/hooks/workflow/useNodeDeleteConfirm'
import { useModalStore } from '@/stores/useModalStore'
import type { WorkflowNodeType } from '@/types/workflow'
import { getShouldConfirmNodeDelete, setShouldConfirmNodeDelete } from '@/utils/workflow/nodeDeleteConfirmStorage'

const createNode = (id: string, title: string) => ({ id, data: { title } }) as WorkflowNodeType

const requestDelete = (nodes: WorkflowNodeType[]) => {
	const { result } = renderHook(() => useNodeDeleteConfirm())
	let pending!: Promise<boolean>
	act(() => {
		pending = result.current(nodes)
	})
	return pending
}

describe('useNodeDeleteConfirm', () => {
	it('노드 제목과 연결선도 지워진다는 안내로 묻고, 확인하면 true로 끝나며 설정은 그대로 둔다', async () => {
		const pending = requestDelete([createNode('ai', '문의 분류')])

		const modal = useModalStore.getState()
		expect(modal).toMatchObject({
			isOpen: true,
			title: '노드 삭제',
			message: "'문의 분류' 노드를 삭제할까요? 이어진 연결선도 함께 삭제돼요.",
			confirmText: '삭제',
			variant: 'danger',
			checkboxLabel: '다시 묻지 않기',
			isChecked: false,
		})
		act(() => useModalStore.getState().confirm())

		await expect(pending).resolves.toBe(true)
		expect(getShouldConfirmNodeDelete()).toBe(true)
	})

	it('여러 노드는 개수로 묻고, 닫거나 취소하면 false로 끝난다', async () => {
		const pending = requestDelete([createNode('a', '하나'), createNode('b', '둘')])

		expect(useModalStore.getState().message).toBe('노드 2개를 삭제할까요? 이어진 연결선도 함께 삭제돼요.')
		act(() => useModalStore.getState().close())

		await expect(pending).resolves.toBe(false)
	})

	it('다시 묻지 않기를 체크하고 확인하면 저장하고, 다음 삭제는 묻지 않고 바로 true로 끝난다', async () => {
		const first = requestDelete([createNode('ai', '문의 분류')])
		act(() => {
			useModalStore.getState().setChecked(true)
			useModalStore.getState().confirm()
		})
		await expect(first).resolves.toBe(true)
		expect(getShouldConfirmNodeDelete()).toBe(false)

		const second = requestDelete([createNode('action', '메일 보내기')])

		await expect(second).resolves.toBe(true)
		expect(useModalStore.getState().isOpen).toBe(false)
	})

	it('다시 묻지 않기를 체크해도 취소하면 저장하지 않는다', async () => {
		const pending = requestDelete([createNode('ai', '문의 분류')])
		act(() => {
			useModalStore.getState().setChecked(true)
			useModalStore.getState().close()
		})

		await expect(pending).resolves.toBe(false)
		expect(getShouldConfirmNodeDelete()).toBe(true)
	})

	it('설정에서 확인을 다시 켜면 다시 묻는다', () => {
		setShouldConfirmNodeDelete(false)
		setShouldConfirmNodeDelete(true)

		void requestDelete([createNode('ai', '문의 분류')])

		expect(useModalStore.getState().isOpen).toBe(true)
	})

	// 채팅 반영·저장으로 캔버스가 다시 마운트되면 옛 캔버스의 삭제는 이어지지 않으므로 남은 창이 헛되이 설정을 저장하면 안 된다.
	it('창이 떠 있는 채 캔버스가 언마운트되면 창을 취소로 닫고 다시 묻지 않기를 저장하지 않는다', async () => {
		const { result, unmount } = renderHook(() => useNodeDeleteConfirm())
		let pending!: Promise<boolean>
		act(() => {
			pending = result.current([createNode('ai', '문의 분류')])
			useModalStore.getState().setChecked(true)
		})

		unmount()

		expect(useModalStore.getState().isOpen).toBe(false)
		await expect(pending).resolves.toBe(false)
		expect(getShouldConfirmNodeDelete()).toBe(true)
	})

	it('다른 화면이 연 창으로 바뀐 뒤 캔버스가 언마운트되면 그 창은 닫지 않는다', async () => {
		const { result, unmount } = renderHook(() => useNodeDeleteConfirm())
		let pending!: Promise<boolean>
		act(() => {
			pending = result.current([createNode('ai', '문의 분류')])
			useModalStore
				.getState()
				.openConfirm({ title: '연결 해제', message: '해제할까요?', onConfirm: vi.fn(), onCancel: vi.fn() })
		})
		await expect(pending).resolves.toBe(false)

		unmount()

		expect(useModalStore.getState()).toMatchObject({ isOpen: true, title: '연결 해제' })
	})
})
