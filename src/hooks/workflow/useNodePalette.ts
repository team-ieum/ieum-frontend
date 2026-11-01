import { useCallback, useEffect, useRef, useState } from 'react'

/** 열린 팔레트의 목적. `next`는 고른 노드를 붙일 앞 노드를 함께 기억한다. */
export type NodePaletteState = { mode: 'all' } | { mode: 'trigger' } | { mode: 'next'; sourceNodeId: string }

/**
 * 편집 화면의 노드 팔레트 열림 상태와 목적을 관리한다. 다른 워크플로우로 옮기면 닫힌 것으로 본다.
 * 닫히면 팔레트를 연 요소로 포커스를 돌려주고, 그 요소가 사라졌으면(시작 카드 등) '노드 추가' 버튼으로 돌려준다.
 */
export const useNodePalette = (workflowId: string | undefined) => {
	const [opened, setOpened] = useState<{ workflowId: string | undefined; state: NodePaletteState } | null>(null)
	const addButtonRef = useRef<HTMLButtonElement>(null)
	const invokerRef = useRef<HTMLElement | null>(null)
	const [focusRequest, setFocusRequest] = useState(0)
	const palette = opened && opened.workflowId === workflowId ? opened.state : null

	/** `invoker`는 닫힐 때 포커스를 돌려받을 요소다. 없으면 '노드 추가' 버튼으로 돌려준다. */
	const openPalette = useCallback(
		(state: NodePaletteState, invoker?: HTMLElement | null) => {
			invokerRef.current = invoker ?? null
			setOpened({ workflowId, state })
		},
		[workflowId]
	)

	const closePalette = useCallback(() => {
		setOpened(null)
		setFocusRequest(request => request + 1)
	}, [])

	const toggleAllPalette = useCallback(() => {
		if (palette) closePalette()
		else openPalette({ mode: 'all' }, addButtonRef.current)
	}, [closePalette, openPalette, palette])

	// 팔레트에서 노드를 고르면 같은 렌더에서 시작 카드가 사라질 수 있어, 닫힌 화면이 그려진 뒤 포커스 대상을 고른다.
	useEffect(() => {
		if (focusRequest === 0) return
		const invoker = invokerRef.current
		invokerRef.current = null
		if (invoker?.isConnected) invoker.focus()
		else addButtonRef.current?.focus()
	}, [focusRequest])

	return { palette, openPalette, closePalette, toggleAllPalette, addButtonRef }
}
