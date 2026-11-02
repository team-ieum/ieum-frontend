import { useState } from 'react'

/**
 * 설정 패널 선택 드롭다운의 열림과 강조 행 상태.
 * 목록 내용에 따라 조회 여부를 정하는 호출자(목록 공급원 칸)가 `isOpen`을 읽을 수 있게 상태를 컴포넌트 밖에 둔다.
 * @param canOpen false면 열지 않는다(부모 칸이 막힌 목록 칸 등).
 */
export const useSettingsDropdown = (canOpen = true) => {
	const [isOpen, setIsOpen] = useState(false)
	const [activeIndex, setActiveIndex] = useState(-1)

	const open = () => {
		if (!canOpen) return
		setIsOpen(true)
	}

	const close = () => {
		setIsOpen(false)
		setActiveIndex(-1)
	}

	return {
		isOpen,
		activeIndex,
		canOpen,
		open,
		close,
		toggle: () => (isOpen ? close() : open()),
		setActiveIndex,
	}
}

export type SettingsDropdownState = ReturnType<typeof useSettingsDropdown>
