import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import { MOCK_OAUTH_STORAGE_KEYS } from '@/mocks/storedOAuthConnectionsHandler'

const GOOGLE_CONNECT_PATH = '*/api/v1/oauth/google/connect'
const GOOGLE_CONNECTION_PATH = '*/api/v1/oauth/connections/GOOGLE'

type GoogleOAuthHandlersOptions = {
	delayMs?: number
	/** connect 응답의 `authorizationUrl`. measurement는 Google 대신 연결 완료 콜백 주소를 넣어 흐름을 끝까지 확인한다. */
	authorizationUrl?: string
	/**
	 * connect 호출을 연결 완료로, 해제를 연결 삭제로 기록한다(measurement용).
	 * 연결 목록 조회는 이 기록을 읽는 `createStoredOAuthConnectionsHandler`가 반영한다.
	 */
	connectionStorage?: Pick<Storage, 'setItem' | 'removeItem'>
}

const hasScopeGroups = (body: unknown): boolean => {
	if (typeof body !== 'object' || body === null || !('scopeGroups' in body)) return false
	const { scopeGroups } = body
	return Array.isArray(scopeGroups) && scopeGroups.length > 0
}

/** Google 연결·재연결(connect)과 해제(DELETE) mock. 연결 상태의 기본값은 fixture(연결됨)를 따른다. */
export const createGoogleOAuthHandlers = ({
	delayMs,
	authorizationUrl = '/api/v1/oauth2/authorize/google?scope_groups=calendar&link_token=mock-link-token',
	connectionStorage,
}: GoogleOAuthHandlersOptions = {}): HttpHandler[] => [
	http.post(GOOGLE_CONNECT_PATH, async ({ request }) => {
		if (delayMs) await delay(delayMs)
		const body: unknown = await request.json().catch(() => null)
		if (!hasScopeGroups(body)) {
			return HttpResponse.json(
				{ success: false, data: null, message: 'scopeGroups가 비어 있습니다.', code: 'INVALID_INPUT' },
				{ status: 400 }
			)
		}
		connectionStorage?.removeItem(MOCK_OAUTH_STORAGE_KEYS.googleDisconnected)
		return HttpResponse.json({ success: true, message: 'OK', code: 'OK', data: { authorizationUrl } })
	}),
	http.delete(GOOGLE_CONNECTION_PATH, async () => {
		if (delayMs) await delay(delayMs)
		connectionStorage?.setItem(MOCK_OAUTH_STORAGE_KEYS.googleDisconnected, 'true')
		return HttpResponse.json({ success: true, message: 'OK', code: 'OK' })
	}),
]
