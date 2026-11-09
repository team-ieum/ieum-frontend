/**
 * 발급 응답의 `path`(`/api/v1/hooks/{token}`)에 API 호스트를 붙여 외부에 알려 줄 전체 주소를 만든다.
 * `VITE_API_URL`이 없으면 같은 origin으로 API를 받는 배포라고 보고 `fallbackOrigin`(현재 화면 origin)을 쓴다.
 */
export const toWebhookUrl = (path: string, fallbackOrigin: string) => {
	const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || fallbackOrigin
	return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * 서버 시각 문자열을 화면 시간대 기준 `11월 9일 14:30`으로 보여 준다.
 * 서버는 `…Z`(UTC) 문자열을 보내지만, 오프셋 없는 옛 형식은 `Date.parse`가 화면 시간대로 읽는다. 읽지 못하면 받은 값을 그대로 쓴다.
 */
export const formatWebhookIssuedAt = (value: string) => {
	const time = Date.parse(value)
	if (Number.isNaN(time)) return value
	const date = new Date(time)
	const pad = (unit: number) => String(unit).padStart(2, '0')
	return `${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
