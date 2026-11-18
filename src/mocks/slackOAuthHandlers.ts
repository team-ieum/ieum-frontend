import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import { MOCK_OAUTH_STORAGE_KEYS } from '@/mocks/storedOAuthConnectionsHandler'

const SLACK_AUTHORIZE_PATH = '*/api/v1/slack/oauth2/authorize'
const SLACK_CONNECTION_PATH = '*/api/v1/slack/oauth2/connection'

type SlackOAuthHandlersOptions = {
	delayMs?: number
	/** authorize 응답의 `authUrl`. measurement는 Slack 대신 연결 완료 복귀 주소를 넣어 흐름을 끝까지 확인한다. */
	authUrl?: string
	/**
	 * authorize 호출을 연결 완료로, 해제를 연결 삭제로 기록한다(measurement용).
	 * 연결 목록 조회는 이 기록을 읽는 `createStoredOAuthConnectionsHandler`가 반영한다.
	 * 단위 테스트 서버는 테스트 사이에 상태가 새지 않도록 넘기지 않고, 연결 목록은 테스트에서 `server.use`로 정한다.
	 */
	connectionStorage?: Pick<Storage, 'setItem' | 'removeItem'>
}

/** Slack 봇 연결 시작(authorize)과 해제(DELETE) mock. 기본 상태는 미연결이다. */
export const createSlackOAuthHandlers = ({
	delayMs,
	authUrl = 'https://slack.com/oauth/v2/authorize?client_id=mock',
	connectionStorage,
}: SlackOAuthHandlersOptions = {}): HttpHandler[] => {
	const setConnected = (isConnected: boolean) => {
		if (isConnected) connectionStorage?.setItem(MOCK_OAUTH_STORAGE_KEYS.slackConnected, 'true')
		else connectionStorage?.removeItem(MOCK_OAUTH_STORAGE_KEYS.slackConnected)
	}

	return [
		http.get(SLACK_AUTHORIZE_PATH, async () => {
			if (delayMs) await delay(delayMs)
			setConnected(true)
			return HttpResponse.json({ success: true, data: { authUrl }, message: 'OK', code: 'OK' })
		}),
		http.delete(SLACK_CONNECTION_PATH, async () => {
			if (delayMs) await delay(delayMs)
			setConnected(false)
			return new HttpResponse(null, { status: 204 })
		}),
	]
}
