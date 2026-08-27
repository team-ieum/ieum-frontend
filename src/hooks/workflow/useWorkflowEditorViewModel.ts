import { useCallback, useEffect, useState } from 'react'
import type { WorkflowEdgeType } from '@/types/workflow'
import { isWorkflowEdgeDto, isWorkflowNodeDto, toWorkflowEdgeDtos } from '@/utils/workflow/mapWorkflowCanvas'
import {
	inspectWorkflowDraft,
	isSameWorkflowDraft,
	removeWorkflowDraft,
	type WorkflowDraftData,
	writeWorkflowDraft,
} from '@/utils/workflow/workflowDraftStorage'

type WorkflowEditorSession = {
	key: string
	document: WorkflowDraftData
	isDraftPersisted: boolean
	canvasRevision: number
	staleDraftWorkflowId: string | null
}

type UseWorkflowEditorViewModelOptions = {
	workflowId?: string
	workflowVersion?: number
	serverDocument: WorkflowDraftData | null
}

export const useWorkflowEditorViewModel = ({
	workflowId,
	workflowVersion,
	serverDocument,
}: UseWorkflowEditorViewModelOptions) => {
	const [editorSession, setEditorSession] = useState<WorkflowEditorSession | null>(null)
	const editorKey = workflowId && workflowVersion !== undefined ? `${workflowId}:${workflowVersion}` : ''

	if (workflowId && workflowVersion !== undefined && serverDocument && editorSession?.key !== editorKey) {
		const { draft, shouldRemove } = inspectWorkflowDraft(workflowId, workflowVersion)
		const draftDocument = draft ? { title: draft.title, nodes: draft.nodes, edges: draft.edges } : null
		const hasDraftChanges = Boolean(draftDocument && !isSameWorkflowDraft(draftDocument, serverDocument))
		setEditorSession({
			key: editorKey,
			document: hasDraftChanges && draftDocument ? draftDocument : serverDocument,
			isDraftPersisted: hasDraftChanges,
			canvasRevision: 0,
			staleDraftWorkflowId: shouldRemove || (draftDocument && !hasDraftChanges) ? workflowId : null,
		})
	}

	const editorSessionKey = editorSession?.key
	const staleDraftWorkflowId = editorSession?.staleDraftWorkflowId
	useEffect(() => {
		if (!editorSessionKey || !staleDraftWorkflowId) return
		removeWorkflowDraft(staleDraftWorkflowId)
		const clearDraftId = window.setTimeout(() => {
			setEditorSession(current =>
				current?.key === editorSessionKey && current.staleDraftWorkflowId === staleDraftWorkflowId
					? { ...current, staleDraftWorkflowId: null }
					: current
			)
		}, 0)
		return () => window.clearTimeout(clearDraftId)
	}, [editorSessionKey, staleDraftWorkflowId])

	const document = editorSession?.key === editorKey ? editorSession.document : serverDocument
	const hasUnsavedChanges = Boolean(document && serverDocument && !isSameWorkflowDraft(document, serverDocument))

	const commitDocument = useCallback(
		(nextDocument: WorkflowDraftData, remountCanvas = false) => {
			if (!workflowId || workflowVersion === undefined || !serverDocument) return
			const dirty = !isSameWorkflowDraft(nextDocument, serverDocument)
			const isDraftPersisted = dirty
				? writeWorkflowDraft(workflowId, workflowVersion, nextDocument)
				: (removeWorkflowDraft(workflowId), false)

			setEditorSession(current => {
				if (!current || current.key !== editorKey) return current
				return {
					...current,
					document: nextDocument,
					isDraftPersisted,
					canvasRevision: remountCanvas ? current.canvasRevision + 1 : current.canvasRevision,
				}
			})
		},
		[editorKey, serverDocument, workflowId, workflowVersion]
	)

	const handleTitleChange = useCallback(
		(title: string) => {
			if (!document) return
			commitDocument({ ...document, title })
		},
		[commitDocument, document]
	)

	const handleNodePositionCommit = useCallback(
		(nodeId: string, position: { x: number; y: number }) => {
			if (!document) return
			commitDocument({
				...document,
				nodes: document.nodes.map(node => (node.id === nodeId ? { ...node, position } : node)),
			})
		},
		[commitDocument, document]
	)

	const handleEdgesCommit = useCallback(
		(edges: WorkflowEdgeType[]) => {
			if (!document) return
			commitDocument({ ...document, edges: toWorkflowEdgeDtos(edges) })
		},
		[commitDocument, document]
	)

	const handleCanvasUpdate = useCallback(
		(rawNodes: unknown[], rawEdges: unknown[]) => {
			if (!document) return
			const previousPositions = new Map(document.nodes.map(node => [node.id, node.position]))
			const nodes = rawNodes.filter(isWorkflowNodeDto).map(node => {
				const position = previousPositions.get(node.id)
				return position ? { ...node, position } : node
			})
			const nodeIds = new Set(nodes.map(node => node.id))
			const edges = rawEdges.filter(isWorkflowEdgeDto).filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target))
			commitDocument({ ...document, nodes, edges }, true)
		},
		[commitDocument, document]
	)

	return {
		document,
		hasUnsavedChanges,
		isDraftPersisted: Boolean(hasUnsavedChanges && editorSession?.isDraftPersisted),
		canvasKey: editorSession?.key === editorKey ? `${editorSession.key}:${editorSession.canvasRevision}` : null,
		handleTitleChange,
		handleNodePositionCommit,
		handleEdgesCommit,
		handleCanvasUpdate,
	}
}
