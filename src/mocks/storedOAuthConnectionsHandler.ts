import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import { discordOAuthConnection, oauthConnectionsResponse, slackOAuthConnection } from '@/mocks/fixtures/integrations'

/**
 * measurement에서 공급자 mock이 연결·해제 결과를 남기는 저장소 키.
 * 인가 URL로 전체 페이지를 이동하면 worker와 handler가 새로 만들어지므로 메모리가 아니라 sessionStorage에 남긴다.
 * 기본 fixture는 Google 연결됨, Slack·Discord 미연결이라 Slack·Discord는 연결 여부를, Google은 해제 여부를 기록한다.
 */
export const MOCK_OAUTH_STORAGE_KEYS = {
	slackConnected: 'ieum-mock-slack-oauth-connected',
	discordConnected: 'ieum-mock-discord-oauth-connected',
	googleDisconnected: 'ieum-mock-google-oauth-disconnected',
} as const

type StoredOAuthConnectionsHandlerOptions = {
	delayMs?: number
	connectionStorage: Pick<Storage, 'getItem'>
}

/** 저장소에 남은 Slack·Discord·Google 연결 상태를 반영해 연결 목록을 돌려준다(measurement용). */
export const createStoredOAuthConnectionsHandler = ({
	delayMs,
	connectionStorage,
}: StoredOAuthConnectionsHandlerOptions): HttpHandler =>
	http.get('*/api/v1/oauth/connections', async () => {
		if (delayMs) await delay(delayMs)
		const isGoogleDisconnected = connectionStorage.getItem(MOCK_OAUTH_STORAGE_KEYS.googleDisconnected) === 'true'
		const isSlackConnected = connectionStorage.getItem(MOCK_OAUTH_STORAGE_KEYS.slackConnected) === 'true'
		const isDiscordConnected = connectionStorage.getItem(MOCK_OAUTH_STORAGE_KEYS.discordConnected) === 'true'
		const base = oauthConnectionsResponse.data.filter(
			connection => !(isGoogleDisconnected && connection.provider === 'GOOGLE')
		)
		const data = [
			...base,
			...(isSlackConnected ? [slackOAuthConnection] : []),
			...(isDiscordConnected ? [discordOAuthConnection] : []),
		]
		return HttpResponse.json({ ...oauthConnectionsResponse, data })
	})
