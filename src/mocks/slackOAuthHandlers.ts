import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import { oauthConnectionsResponse, slackOAuthConnection } from '@/mocks/fixtures/integrations'

const SLACK_AUTHORIZE_PATH = '*/api/v1/slack/oauth2/authorize'
const SLACK_CONNECTION_PATH = '*/api/v1/slack/oauth2/connection'

type SlackOAuthHandlersOptions = {
	delayMs?: number
	/** authorize 응답의 `authUrl`. measurement는 Slack 대신 연결 완료 복귀 주소를 넣어 흐름을 끝까지 확인한다. */
	authUrl?: string
	/**
	 * authorize 호출을 연결 완료로, 해제를 연결 삭제로 기록하고 연결 목록 조회에 반영한다(measurement용).
	 * authorize 뒤 전체 페이지 이동으로 worker가 다시 뜨므로 메모리가 아니라 이 저장소에 남긴다.
	 * 단위 테스트 서버는 테스트 사이에 상태가 새지 않도록 넘기지 않고, 연결 목록은 테스트에서 `server.use`로 정한다.
	 */
	connectionStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

const CONNECTED_STORAGE_KEY = 'ieum-mock-slack-oauth-connected'

/** Slack 봇 연결 시작(authorize)과 해제(DELETE) mock. 기본 상태는 미연결이다. */
export const createSlackOAuthHandlers = ({
	delayMs,
	authUrl = 'https://slack.com/oauth/v2/authorize?client_id=mock',
	connectionStorage,
}: SlackOAuthHandlersOptions = {}): HttpHandler[] => {
	const setConnected = (isConnected: boolean) => {
		if (isConnected) connectionStorage?.setItem(CONNECTED_STORAGE_KEY, 'true')
		else connectionStorage?.removeItem(CONNECTED_STORAGE_KEY)
	}

	const handlers = [
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
	if (!connectionStorage) return handlers

	return [
		...handlers,
		http.get('*/api/v1/oauth/connections', async () => {
			if (delayMs) await delay(delayMs)
			const isConnected = connectionStorage.getItem(CONNECTED_STORAGE_KEY) === 'true'
			const data = isConnected ? [...oauthConnectionsResponse.data, slackOAuthConnection] : oauthConnectionsResponse.data
			return HttpResponse.json({ ...oauthConnectionsResponse, data })
		}),
	]
}
