import { useEffect, useState } from 'react'

// 남은 시간을 감소시키는 대신 실제 마감 시각과 비교해 탭 복귀 시에도 맞춘다.
export const useAuthClock = (active: boolean) => {
	const [now, setNow] = useState(Date.now)
	useEffect(() => {
		if (!active) return
		const update = () => setNow(Date.now())
		const timer = window.setInterval(update, 1000)
		document.addEventListener('visibilitychange', update)
		return () => {
			window.clearInterval(timer)
			document.removeEventListener('visibilitychange', update)
		}
	}, [active])
	return now
}
