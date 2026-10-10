import { useEffect, useRef, useState } from 'react'
import { SIDEBAR_DOCKED_MEDIA_QUERY } from '@/constants/layout'
import { useMediaQuery } from '@/hooks/layout/useMediaQuery'

/**
 * 좁은 viewport에서 off-canvas로 열리는 사이드바의 열림 상태와 keyboard·focus 계약을 제공한다.
 *
 * - 열려 있는 동안(`isModalOpen`)에는 배경(header·main)을 `inert`로 렌더하고 사이드바 안에 focus를 가둬야 한다.
 * - 열리면 사이드바 닫기 버튼(`closeButtonRef`)으로 focus를 옮긴다.
 * - Escape, 닫기 버튼, 배경 클릭으로 닫는 `dismiss`는 메뉴 버튼(`menuButtonRef`)으로 focus를 되돌린다.
 * - 화면 밖에 있는 동안(`isOffCanvasHidden`)에는 사이드바를 `inert`로 렌더해야 한다.
 * - 사이드바가 고정 표시되는 너비로 바뀌면 열림 상태를 해제한다.
 */
export const useMobileSidebar = () => {
	const [isOpen, setIsOpen] = useState(false)
	const isDocked = useMediaQuery(SIDEBAR_DOCKED_MEDIA_QUERY)
	const [previousIsDocked, setPreviousIsDocked] = useState(isDocked)
	const menuButtonRef = useRef<HTMLButtonElement>(null)
	const closeButtonRef = useRef<HTMLButtonElement>(null)
	const shouldRestoreFocus = useRef(false)

	// 고정 표시 중에 남은 열림 상태가 다시 좁아졌을 때 사이드바를 열고 focus를 빼앗지 않게 한다.
	if (previousIsDocked !== isDocked) {
		setPreviousIsDocked(isDocked)
		if (isDocked) setIsOpen(false)
	}

	const isModalOpen = isOpen && !isDocked

	const close = () => setIsOpen(false)
	const toggle = () => setIsOpen(prev => !prev)
	const dismiss = () => {
		shouldRestoreFocus.current = isModalOpen
		setIsOpen(false)
	}

	useEffect(() => {
		if (!isModalOpen) return

		closeButtonRef.current?.focus()

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return
			shouldRestoreFocus.current = true
			setIsOpen(false)
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isModalOpen])

	// 닫히는 렌더에서 header의 inert가 풀린 뒤에야 메뉴 버튼이 focus를 받을 수 있다.
	useEffect(() => {
		if (isModalOpen || !shouldRestoreFocus.current) return
		shouldRestoreFocus.current = false
		menuButtonRef.current?.focus()
	}, [isModalOpen])

	return {
		isOpen,
		isModalOpen,
		isOffCanvasHidden: !isOpen && !isDocked,
		menuButtonRef,
		closeButtonRef,
		close,
		toggle,
		dismiss,
	}
}
