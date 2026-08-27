import { useEffect, type RefObject } from 'react'

/**
 * 헤더 구간에서 스크롤이 멈추면, 헤더를 완전히 숨기거나(또는 다시 보이게)
 * 가까운 쪽으로 부드럽게 스냅한다.
 */
export const useSnapPastHeader = (headerRef: RefObject<HTMLElement | null>, gapPx = 24) => {
	useEffect(() => {
		let settleTimer: number | undefined
		let releaseTimer: number | undefined
		let isSnapping = false

		const getSnapY = () => {
			const header = headerRef.current
			if (!header) return 0
			return header.offsetHeight + gapPx
		}

		const snap = () => {
			if (isSnapping) return

			const snapY = getSnapY()
			if (snapY <= 0) return

			const y = window.scrollY
			// 헤더 구간을 이미 지나갔거나 맨 위면 스냅하지 않음
			if (y <= 0 || y >= snapY) return

			const target = y >= snapY / 2 ? snapY : 0
			if (Math.abs(y - target) < 2) return

			isSnapping = true
			window.scrollTo({ top: target, behavior: 'smooth' })

			window.clearTimeout(releaseTimer)
			releaseTimer = window.setTimeout(() => {
				isSnapping = false
			}, 450)
		}

		const onScroll = () => {
			if (isSnapping) return
			window.clearTimeout(settleTimer)
			settleTimer = window.setTimeout(snap, 80)
		}

		window.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			window.removeEventListener('scroll', onScroll)
			window.clearTimeout(settleTimer)
			window.clearTimeout(releaseTimer)
		}
	}, [headerRef, gapPx])
}
