import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkflowEditorViewModel } from '@/hooks/workflow/useWorkflowEditorViewModel'
import type { WorkflowEdgeType } from '@/types/workflow'
import {
	getWorkflowDraftKey,
	readWorkflowDraft,
	type WorkflowDraftData,
	writeWorkflowDraft,
} from '@/utils/workflow/workflowDraftStorage'

const serverDocument: WorkflowDraftData = {
	title: '고객 문의 분류',
	nodes: [
		{ id: 'trigger', type: 'TRIGGER', label: '문의 도착', position: { x: 10, y: 20 }, config: {} },
		{ id: 'ai', type: 'AI', label: '문의 분류', position: { x: 320, y: 20 }, config: { model: 'model-1' } },
	],
	edges: [{ source: 'trigger', target: 'ai', conditionType: null }],
}

const renderEditor = () =>
	renderHook(() => useWorkflowEditorViewModel({ workflowId: 'workflow-1', workflowVersion: 3, serverDocument }))

describe('useWorkflowEditorViewModel', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('서버 버전과 일치하는 변경 초안을 편집 문서로 복원한다', () => {
		writeWorkflowDraft('workflow-1', 3, { ...serverDocument, title: '복원된 문의 분류' })

		const { result } = renderEditor()

		expect(result.current.document?.title).toBe('복원된 문의 분류')
		expect(result.current.hasUnsavedChanges).toBe(true)
		expect(result.current.isDraftPersisted).toBe(true)
	})

	it('서버 원본과 같은 초안은 마운트 이후 제거한다', () => {
		writeWorkflowDraft('workflow-1', 3, serverDocument)

		const { result } = renderEditor()

		expect(result.current.hasUnsavedChanges).toBe(false)
		expect(localStorage.getItem(getWorkflowDraftKey('workflow-1'))).toBeNull()
	})

	it('제목, 노드 위치와 연결선 변경을 같은 로컬 초안에 반영한다', () => {
		const { result } = renderEditor()

		act(() => result.current.handleTitleChange('수정된 문의 분류'))
		act(() => result.current.handleNodePositionCommit('trigger', { x: 90, y: 120 }))
		act(() =>
			result.current.handleEdgesCommit([
				{
					id: 'ai-trigger',
					source: 'ai',
					target: 'trigger',
					data: { conditionType: 'false' },
				} as WorkflowEdgeType,
			])
		)

		expect(readWorkflowDraft('workflow-1', 3)).toMatchObject({
			title: '수정된 문의 분류',
			nodes: [expect.objectContaining({ id: 'trigger', position: { x: 90, y: 120 } }), expect.any(Object)],
			edges: [{ source: 'ai', target: 'trigger', conditionType: 'false' }],
		})
	})

	it('AI 캔버스 갱신 시 기존 위치를 유지하고 고아 연결선을 제외한다', () => {
		const { result } = renderEditor()
		const initialCanvasKey = result.current.canvasKey

		act(() =>
			result.current.handleCanvasUpdate(
				[
					{ id: 'ai', type: 'AI', label: '수정된 문의 분류', config: {} },
					{ id: 'action', type: 'HTTP', label: '담당자에게 알리기', config: {} },
				],
				[
					{ source: 'ai', target: 'action', conditionType: null },
					{ source: 'action', target: 'missing', conditionType: null },
				]
			)
		)

		expect(result.current.document?.nodes.find(node => node.id === 'ai')?.position).toEqual({ x: 320, y: 20 })
		expect(result.current.document?.edges).toEqual([{ source: 'ai', target: 'action', conditionType: null }])
		expect(result.current.canvasKey).not.toBe(initialCanvasKey)
	})
})
