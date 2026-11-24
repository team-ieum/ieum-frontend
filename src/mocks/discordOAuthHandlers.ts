import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import { MOCK_OAUTH_STORAGE_KEYS } from '@/mocks/storedOAuthConnectionsHandler'

const DISCORD_AUTHORIZE_PATH = '*/api/v1/discord/oauth2/authorize'
const DISCORD_CONNECTION_PATH = '*/api/v1/discord/oauth2/connections/:guildId'

type DiscordOAuthHandlersOptions = {
	delayMs?: number
	/** authorize 응답의 `authUrl`. measurement는 Discord 대신 연결 완료 복귀 주소를 넣어 흐름을 끝까지 확인한다. */
	authUrl?: string
	/**
	 * authorize 호출을 서버 연결로, 해제를 연결 삭제로 기록한다(measurement용). 서버는 fixture 하나만 흉내 낸다.
	 * 단위 테스트 서버는 테스트 사이에 상태가 새지 않도록 넘기지 않고, 연결 목록은 테스트에서 `server.use`로 정한다.
	 */
	connectionStorage?: Pick<Storage, 'setItem' | 'removeItem'>
}

/** Discord 봇 연결 시작(authorize)과 서버별 해제(DELETE) mock. 기본 상태는 미연결이다. */
export const createDiscordOAuthHandlers = ({
	delayMs,
	authUrl = 'https://discord.com/oauth2/authorize?client_id=mock',
	connectionStorage,
}: DiscordOAuthHandlersOptions = {}): HttpHandler[] => [
	http.get(DISCORD_AUTHORIZE_PATH, async () => {
		if (delayMs) await delay(delayMs)
		connectionStorage?.setItem(MOCK_OAUTH_STORAGE_KEYS.discordConnected, 'true')
		return HttpResponse.json({ success: true, data: { authUrl }, message: 'OK', code: 'OK' })
	}),
	http.delete(DISCORD_CONNECTION_PATH, async () => {
		if (delayMs) await delay(delayMs)
		connectionStorage?.removeItem(MOCK_OAUTH_STORAGE_KEYS.discordConnected)
		return new HttpResponse(null, { status: 204 })
	}),
]
