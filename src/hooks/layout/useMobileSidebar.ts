import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { SIDEBAR_DOCKED_MEDIA_QUERY } from '@/constants/layout'
import { useMediaQuery } from '@/hooks/layout/useMediaQuery'

type FocusTargetAfterClose = 'menuButton' | 'main'

/**
 * 좁은 viewport에서 off-canvas로 열리는 사이드바의 열림 상태와 keyboard·focus 계약을 제공한다.
 *
 * - 열려 있는 동안(`isModalOpen`)에는 배경(header·main)을 `inert`로 렌더하고 사이드바 안에 focus를 가둬야 한다.
 * - 열리면 사이드바 닫기 버튼(`closeButtonRef`)으로 focus를 옮긴다.
 * - Escape, 닫기 버튼, 배경 클릭으로 닫는 `dismiss`는 메뉴 버튼(`menuButtonRef`)으로 focus를 되돌린다.
 * - 항목 선택으로 닫는 `closeAfterSelect`는 다른 경로로 이동하면 `mainRef`로, 현재 경로면 메뉴 버튼으로 focus를 옮긴다.
 * - 화면 밖에 있는 동안(`isOffCanvasHidden`)에는 사이드바를 `inert`로 렌더해야 한다.
 * - 사이드바가 고정 표시되는 너비로 바뀌면 열림 상태를 해제한다. 고정 표시 중에는 focus를 옮기지 않는다.
 */
export const useMobileSidebar = () => {
	const [isOpen, setIsOpen] = useState(false)
	const isDocked = useMediaQuery(SIDEBAR_DOCKED_MEDIA_QUERY)
	const [previousIsDocked, setPreviousIsDocked] = useState(isDocked)
	const { pathname } = useLocation()
	const menuButtonRef = useRef<HTMLButtonElement>(null)
	const closeButtonRef = useRef<HTMLButtonElement>(null)
	const mainRef = useRef<HTMLElement>(null)
	const focusTargetAfterClose = useRef<FocusTargetAfterClose | null>(null)

	// 고정 표시 중에 남은 열림 상태가 다시 좁아졌을 때 사이드바를 열고 focus를 빼앗지 않게 한다.
	if (previousIsDocked !== isDocked) {
		setPreviousIsDocked(isDocked)
		if (isDocked) setIsOpen(false)
	}

	const isModalOpen = isOpen && !isDocked

	const closeWithFocus = (target: FocusTargetAfterClose) => {
		// inert가 적용되면 사이드바 안의 focus가 body로 떨어지므로 닫은 뒤 이동할 곳을 정해 둔다.
		focusTargetAfterClose.current = isModalOpen ? target : null
		setIsOpen(false)
	}

	const toggle = () => setIsOpen(prev => !prev)
	const dismiss = () => closeWithFocus('menuButton')
	const closeAfterSelect = (targetPathname: string) => closeWithFocus(targetPathname === pathname ? 'menuButton' : 'main')

	useEffect(() => {
		if (!isModalOpen) return

		closeButtonRef.current?.focus()

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return
			focusTargetAfterClose.current = 'menuButton'
			setIsOpen(false)
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isModalOpen])

	// 닫히는 렌더에서 header·main의 inert가 풀린 뒤에야 focus를 받을 수 있다.
	useEffect(() => {
		const target = focusTargetAfterClose.current
		if (isModalOpen || !target) return
		focusTargetAfterClose.current = null
		const element = target === 'main' ? mainRef.current : menuButtonRef.current
		element?.focus()
	}, [isModalOpen])

	return {
		isOpen,
		isModalOpen,
		isOffCanvasHidden: !isOpen && !isDocked,
		menuButtonRef,
		closeButtonRef,
		mainRef,
		toggle,
		dismiss,
		closeAfterSelect,
	}
}
