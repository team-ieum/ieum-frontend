import { useEffect, useRef, useState } from 'react'
import { SIDEBAR_DOCKED_MEDIA_QUERY } from '@/constants/layout'
import { useMediaQuery } from '@/hooks/layout/useMediaQuery'

/**
 * 좁은 viewport에서 off-canvas로 열리는 사이드바의 열림 상태와 keyboard·focus 계약을 제공한다.
 *
 * - 열리면 사이드바 닫기 버튼(`closeButtonRef`)으로 focus를 옮긴다.
 * - Escape, 닫기 버튼, 배경 클릭으로 닫는 `dismiss`는 메뉴 버튼(`menuButtonRef`)으로 focus를 되돌린다.
 * - 화면 밖에 있는 동안(`isOffCanvasHidden`)에는 사이드바를 `inert`로 렌더해야 한다.
 */
export const useMobileSidebar = () => {
	const [isOpen, setIsOpen] = useState(false)
	const isDocked = useMediaQuery(SIDEBAR_DOCKED_MEDIA_QUERY)
	const menuButtonRef = useRef<HTMLButtonElement>(null)
	const closeButtonRef = useRef<HTMLButtonElement>(null)
	const isModalOpen = isOpen && !isDocked

	const close = () => setIsOpen(false)
	const toggle = () => setIsOpen(prev => !prev)
	const dismiss = () => {
		setIsOpen(false)
		menuButtonRef.current?.focus()
	}

	useEffect(() => {
		if (!isModalOpen) return

		closeButtonRef.current?.focus()

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return
			setIsOpen(false)
			menuButtonRef.current?.focus()
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isModalOpen])

	return {
		isOpen,
		isOffCanvasHidden: !isOpen && !isDocked,
		menuButtonRef,
		closeButtonRef,
		close,
		toggle,
		dismiss,
	}
}
