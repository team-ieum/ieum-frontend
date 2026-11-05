import { useState } from 'react'

/** 직접 닫거나 다른 메뉴를 펼쳐 닫히면 입력을 비워 다시 펼쳤을 때 이전 값이 남지 않게 한다. */
export const useResetOnClose = (isOpen: boolean, reset: () => void) => {
	const [wasOpen, setWasOpen] = useState(isOpen)
	if (wasOpen !== isOpen) {
		setWasOpen(isOpen)
		if (!isOpen) reset()
	}
}
