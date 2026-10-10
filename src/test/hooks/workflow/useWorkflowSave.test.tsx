import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkflowSave } from '@/hooks/workflow/useWorkflowSave'
import { ApiError } from '@/utils/ApiError'
import { getWorkflowDraftKey, type WorkflowDraftData, writeWorkflowDraft } from '@/utils/workflow/workflowDraftStorage'

const mocks = vi.hoisted(() => ({
	mutateAsync: vi.fn(),
	openModal: vi.fn(),
	isPending: false,
}))

vi.mock('@/hooks/workflow/mutations/useUpdateWorkflowMutation', () => ({
	useUpdateWorkflowMutation: () => ({ mutateAsync: mocks.mutateAsync, isPending: mocks.isPending }),
}))

vi.mock('@/stores/useModalStore', () => ({
	useModalStore: (selector: (state: { open: typeof mocks.openModal }) => unknown) => selector({ open: mocks.openModal }),
}))

const document: WorkflowDraftData = {
	title: '  수정된 문의 분류  ',
	nodes: [
		{ id: 'trigger', type: 'TRIGGER', label: '문의 도착', position: { x: 10, y: 20 }, config: {} },
		{ id: 'ai', type: 'AI', label: '문의 분류', position: { x: 320, y: 20 }, config: { model: 'model-1' } },
	],
	edges: [{ source: 'trigger', target: 'ai', conditionType: null }],
}

const renderSave = (options?: Partial<Parameters<typeof useWorkflowSave>[0]>) =>
	renderHook(() =>
		useWorkflowSave({
			workflowId: 'workflow-1',
			description: '문의를 분류합니다.',
			document,
			hasUnsavedChanges: true,
			...options,
		})
	)

describe('useWorkflowSave', () => {
	beforeEach(() => {
		localStorage.clear()
		mocks.mutateAsync.mockReset()
		mocks.openModal.mockReset()
		mocks.isPending = false
	})

	it('편집 문서의 제목, 설명, 노드, 연결선을 수정 요청으로 보내고 로컬 초안을 지운다', async () => {
		writeWorkflowDraft('workflow-1', 3, document)
		mocks.mutateAsync.mockResolvedValueOnce({})
		const { result } = renderSave()

		await act(async () => {
			await result.current.handleSave()
		})

		expect(mocks.mutateAsync).toHaveBeenCalledExactlyOnceWith({
			name: '수정된 문의 분류',
			description: '문의를 분류합니다.',
			nodes: document.nodes,
			edges: document.edges,
		})
		expect(localStorage.getItem(getWorkflowDraftKey('workflow-1'))).toBeNull()
		expect(mocks.openModal).not.toHaveBeenCalled()
	})

	it('변경사항이 없으면 저장할 수 없고 요청을 보내지 않는다', async () => {
		const { result } = renderSave({ hasUnsavedChanges: false })

		expect(result.current.canSave).toBe(false)
		await act(async () => {
			await result.current.handleSave()
		})

		expect(mocks.mutateAsync).not.toHaveBeenCalled()
	})

	it('편집 문서가 없으면 저장할 수 없다', () => {
		const { result } = renderSave({ document: null })

		expect(result.current.canSave).toBe(false)
	})

	it('제목이 비어 있으면 요청 없이 안내 모달을 띄운다', async () => {
		const { result } = renderSave({ document: { ...document, title: '   ' } })

		await act(async () => {
			await result.current.handleSave()
		})

		expect(mocks.mutateAsync).not.toHaveBeenCalled()
		expect(mocks.openModal).toHaveBeenCalledExactlyOnceWith('저장 오류', '워크플로우 이름을 입력해주세요.')
	})

	it('API 오류면 서버 메시지를 모달로 보여주고 로컬 초안을 유지한다', async () => {
		writeWorkflowDraft('workflow-1', 3, document)
		mocks.mutateAsync.mockRejectedValueOnce(new ApiError('INVALID_WORKFLOW', '웹훅 URL은 저장할 수 없어요.'))
		const { result } = renderSave()

		await act(async () => {
			await result.current.handleSave()
		})

		expect(mocks.openModal).toHaveBeenCalledExactlyOnceWith('저장 오류', '웹훅 URL은 저장할 수 없어요.')
		expect(localStorage.getItem(getWorkflowDraftKey('workflow-1'))).not.toBeNull()
	})

	it('알 수 없는 오류면 기본 안내 메시지를 보여준다', async () => {
		mocks.mutateAsync.mockRejectedValueOnce(new Error('network'))
		const { result } = renderSave()

		await act(async () => {
			await result.current.handleSave()
		})

		expect(mocks.openModal).toHaveBeenCalledExactlyOnceWith('저장 오류', '워크플로우 저장에 실패했어요. 다시 시도해주세요.')
	})

	it('저장 중에는 isSaving이 true이고 다시 저장할 수 없다', async () => {
		mocks.isPending = true
		const { result } = renderSave()

		expect(result.current.isSaving).toBe(true)
		expect(result.current.canSave).toBe(false)
		await act(async () => {
			await result.current.handleSave()
		})

		expect(mocks.mutateAsync).not.toHaveBeenCalled()
	})
})
