/**
 * 발급 응답의 `path`(`/api/v1/hooks/{token}`)에 API 호스트를 붙여 외부에 알려 줄 전체 주소를 만든다.
 * `VITE_API_URL`이 없으면 같은 origin으로 API를 받는 배포라고 보고 `fallbackOrigin`(현재 화면 origin)을 쓴다.
 */
export const toWebhookUrl = (path: string, fallbackOrigin: string) => {
	const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || fallbackOrigin
	return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`
}
