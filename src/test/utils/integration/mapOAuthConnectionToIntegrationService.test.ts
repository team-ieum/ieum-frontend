import { describe, expect, it } from 'vitest'
import { oauthConnectionsResponse } from '@/mocks/fixtures/integrations'
import { getExcludedCatalogIdsForOAuthConnections } from '@/utils/integration/mapOAuthConnectionToIntegrationService'

describe('Google 권한에 따른 재연결 타일', () => {
	const drive = 'https://www.googleapis.com/auth/drive'
	const sheets = 'https://www.googleapis.com/auth/spreadsheets'
	const gmail = 'https://www.googleapis.com/auth/gmail.modify'
	it.each([
		{ scopes: ['openid', 'email', 'profile'], excluded: [] },
		{ scopes: [gmail], excluded: ['gmail'] },
		{ scopes: [sheets], excluded: [] },
		{ scopes: [drive], excluded: ['google'] },
		{ scopes: [drive, sheets], excluded: ['google', 'sheets'] },
		{ scopes: [drive, sheets, gmail], excluded: ['google', 'sheets', 'gmail'] },
	])('권한 $scopes로 사용할 수 있는 타일만 제외한다', ({ scopes, excluded }) => {
		const connection = { ...oauthConnectionsResponse.data[0], scopes }
		expect(getExcludedCatalogIdsForOAuthConnections([connection]).sort()).toEqual([...excluded].sort())
	})
})
