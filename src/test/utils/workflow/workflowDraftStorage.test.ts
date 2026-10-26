import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkflowDraftData } from '@/utils/workflow/workflowDraftStorage'
import {
	getWorkflowDraftKey,
	inspectWorkflowDraft,
	isSameWorkflowDraft,
	readWorkflowDraft,
	removeLegacyWorkflowDrafts,
	removeWorkflowDraft,
	writeWorkflowDraft,
} from '@/utils/workflow/workflowDraftStorage'

const draft: WorkflowDraftData = {
	title: '고객 문의 분류',
	nodes: [
		{ id: 'trigger', type: 'TRIGGER', event: 'manual.run', label: '문의 도착', position: { x: 10, y: 20 }, config: {} },
		{
			id: 'ai',
			type: 'AI',
			event: 'ai.reasoning',
			label: '문의 분류',
			position: { x: 320, y: 20 },
			config: { model: 'model-1' },
		},
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

	it('초안 검사는 손상되거나 버전이 다른 데이터를 삭제하지 않고 정리 필요 상태만 반환한다', () => {
		writeWorkflowDraft('versioned', 2, draft)
		expect(inspectWorkflowDraft('versioned', 3)).toEqual({ draft: null, shouldRemove: true })
		expect(localStorage.getItem(getWorkflowDraftKey('versioned'))).not.toBeNull()

		localStorage.setItem(getWorkflowDraftKey('broken'), '{bad json')
		expect(inspectWorkflowDraft('broken', 1)).toEqual({ draft: null, shouldRemove: true })
		expect(localStorage.getItem(getWorkflowDraftKey('broken'))).toBe('{bad json')
	})

	it('잘못된 노드 위치는 초안을 무효화하고 고아 연결선은 제외한다', () => {
		localStorage.setItem(
			getWorkflowDraftKey('invalid-position'),
			JSON.stringify({
				...draft,
				schemaVersion: 2,
				workflowVersion: 1,
				updatedAt: new Date().toISOString(),
				nodes: [{ ...draft.nodes[0], position: { x: 'bad', y: 0 } }],
			})
		)
		expect(readWorkflowDraft('invalid-position', 1)).toBeNull()

		writeWorkflowDraft('orphan-edge', 1, { ...draft, edges: [...draft.edges, { source: 'ai', target: 'missing' }] })
		expect(readWorkflowDraft('orphan-edge', 1)?.edges).toEqual(draft.edges)
	})

	it('v2 키에 저장하고 event 없는 옛 v1 키 초안은 읽지 않는다', () => {
		expect(getWorkflowDraftKey('workflow-1')).toBe('ieum-workflow-draft:v2:workflow-1')

		const legacyDraft = {
			...draft,
			schemaVersion: 1,
			workflowVersion: 1,
			updatedAt: new Date().toISOString(),
			// JSON.stringify가 undefined 키를 빼므로 event 없는 v1 노드가 된다.
			nodes: draft.nodes.map(node => ({ ...node, event: undefined })),
		}
		localStorage.setItem('ieum-workflow-draft:v1:workflow-1', JSON.stringify(legacyDraft))

		expect(readWorkflowDraft('workflow-1', 1)).toBeNull()
		expect(localStorage.getItem('ieum-workflow-draft:v1:workflow-1')).not.toBeNull()
	})

	it('이전 버전 초안 키만 모두 지우고 v2 초안과 다른 키는 남긴다', () => {
		localStorage.setItem('ieum-workflow-draft:v1:workflow-1', '{}')
		localStorage.setItem('ieum-workflow-draft:v1:workflow-2', '{}')
		writeWorkflowDraft('workflow-1', 1, draft)
		localStorage.setItem('other-key', 'keep')

		removeLegacyWorkflowDrafts()

		expect(localStorage.getItem('ieum-workflow-draft:v1:workflow-1')).toBeNull()
		expect(localStorage.getItem('ieum-workflow-draft:v1:workflow-2')).toBeNull()
		expect(localStorage.getItem(getWorkflowDraftKey('workflow-1'))).not.toBeNull()
		expect(localStorage.getItem('other-key')).toBe('keep')
	})

	it('저장소 접근이 실패해도 이전 버전 초안 정리가 예외를 전파하지 않는다', () => {
		vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
			throw new Error('blocked')
		})
		localStorage.setItem('ieum-workflow-draft:v1:workflow-1', '{}')

		expect(() => removeLegacyWorkflowDrafts()).not.toThrow()
	})

	it('v2 키라도 event 없는 노드가 있으면 초안을 무효화한다', () => {
		localStorage.setItem(
			getWorkflowDraftKey('missing-event'),
			JSON.stringify({
				...draft,
				schemaVersion: 2,
				workflowVersion: 1,
				updatedAt: new Date().toISOString(),
				nodes: [{ ...draft.nodes[0], event: undefined }],
			})
		)

		expect(readWorkflowDraft('missing-event', 1)).toBeNull()
	})

	it('서버 엣지 id가 null인 정의와 id를 생략한 정의를 같은 초안으로 본다', () => {
		const serverDraft = { ...draft, edges: [{ id: null, source: 'trigger', target: 'ai', conditionType: null }] }
		const canvasDraft = { ...draft, edges: [{ source: 'trigger', target: 'ai', conditionType: null }] }

		expect(isSameWorkflowDraft(serverDraft, canvasDraft)).toBe(true)
		expect(isSameWorkflowDraft(serverDraft, { ...draft, edges: [{ id: 'edge-1', source: 'trigger', target: 'ai' }] })).toBe(
			false
		)
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
