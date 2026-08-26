import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkflowDraftData } from '@/utils/workflow/workflowDraftStorage'
import {
	getWorkflowDraftKey,
	isSameWorkflowDraft,
	readWorkflowDraft,
	removeWorkflowDraft,
	writeWorkflowDraft,
} from '@/utils/workflow/workflowDraftStorage'

const draft: WorkflowDraftData = {
	title: '고객 문의 분류',
	nodes: [
		{ id: 'trigger', type: 'TRIGGER', label: '문의 도착', position: { x: 10, y: 20 }, config: {} },
		{ id: 'ai', type: 'AI', label: '문의 분류', position: { x: 320, y: 20 }, config: { model: 'model-1' } },
	],
	edges: [{ source: 'trigger', target: 'ai', conditionType: null }],
}

describe('workflowDraftStorage', () => {
	beforeEach(() => {
		localStorage.clear()
		vi.restoreAllMocks()
	})

	it('워크플로우별 키에 제목과 노드, 연결 초안을 저장하고 복원한다', () => {
		expect(writeWorkflowDraft('workflow-1', 3, draft)).toBe(true)
		expect(readWorkflowDraft('workflow-1', 3)).toMatchObject(draft)
		expect(localStorage.getItem(getWorkflowDraftKey('workflow-2'))).toBeNull()
	})

	it('서버 버전이 다르거나 저장 데이터가 손상되면 초안을 제거한다', () => {
		writeWorkflowDraft('versioned', 2, draft)
		expect(readWorkflowDraft('versioned', 3)).toBeNull()
		expect(localStorage.getItem(getWorkflowDraftKey('versioned'))).toBeNull()

		localStorage.setItem(getWorkflowDraftKey('broken'), '{bad json')
		expect(readWorkflowDraft('broken', 1)).toBeNull()
		expect(localStorage.getItem(getWorkflowDraftKey('broken'))).toBeNull()
	})

	it('잘못된 노드 위치는 초안을 무효화하고 고아 연결선은 제외한다', () => {
		localStorage.setItem(
			getWorkflowDraftKey('invalid-position'),
			JSON.stringify({
				...draft,
				schemaVersion: 1,
				workflowVersion: 1,
				updatedAt: new Date().toISOString(),
				nodes: [{ ...draft.nodes[0], position: { x: 'bad', y: 0 } }],
			})
		)
		expect(readWorkflowDraft('invalid-position', 1)).toBeNull()

		writeWorkflowDraft('orphan-edge', 1, { ...draft, edges: [...draft.edges, { source: 'ai', target: 'missing' }] })
		expect(readWorkflowDraft('orphan-edge', 1)?.edges).toEqual(draft.edges)
	})

	it('원본과 같은 정의를 판별하고 초안을 제거한다', () => {
		expect(isSameWorkflowDraft(draft, { ...draft, edges: [{ source: 'trigger', target: 'ai' }] })).toBe(true)
		writeWorkflowDraft('workflow-1', 1, draft)
		expect(removeWorkflowDraft('workflow-1')).toBe(true)
		expect(localStorage.getItem(getWorkflowDraftKey('workflow-1'))).toBeNull()
	})

	it('로컬 스토리지 쓰기가 실패해도 예외를 전파하지 않는다', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('quota exceeded')
		})

		expect(writeWorkflowDraft('workflow-1', 1, draft)).toBe(false)
	})
})
