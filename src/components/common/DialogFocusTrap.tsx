import { FocusTrap } from 'focus-trap-react'
import { useEffect, useRef, type ReactElement, type RefObject } from 'react'

type DialogFocusTrapProps = {
	/** focus를 가둘 단일 container. ref를 전달받을 수 있는 요소여야 한다. */
	children: ReactElement
	/** Escape 입력 시 호출한다. dialog를 닫는 상태 변경은 호출자가 소유한다. */
	onEscape: () => void
	/** 열릴 때 focus할 요소. 없으면 container의 첫 tabbable 요소로 이동한다. */
	initialFocusRef?: RefObject<HTMLElement | null>
}

/**
 * modal dialog의 Tab 순환, Escape 닫기, 닫힌 뒤 연 요소로의 focus 복원을 제공한다.
 * 마운트되면 활성화되고 언마운트될 때 해제되므로 dialog가 열린 동안에만 렌더해야 한다.
 */
const DialogFocusTrap = ({ children, onEscape, initialFocusRef }: DialogFocusTrapProps) => {
	// focus-trap은 활성화 시점의 옵션을 유지하므로 최신 콜백을 ref로 읽는다.
	const onEscapeRef = useRef(onEscape)
	useEffect(() => {
		onEscapeRef.current = onEscape
	})

	return (
		<FocusTrap
			focusTrapOptions={{
				initialFocus: () => initialFocusRef?.current ?? undefined,
				// trap은 언마운트로만 해제해 닫힘 exit 애니메이션 이후 focus를 복원한다.
				escapeDeactivates: () => {
					onEscapeRef.current()
					return false
				},
				allowOutsideClick: true,
				returnFocusOnDeactivate: true,
			}}
		>
			{children}
		</FocusTrap>
	)
}

export default DialogFocusTrap
