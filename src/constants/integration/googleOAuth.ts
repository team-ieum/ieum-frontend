export const GOOGLE_OAUTH_TILES = {
	google: { group: 'drive', requiredScopes: ['https://www.googleapis.com/auth/drive'] },
	gmail: { group: 'gmail', requiredScopes: ['https://www.googleapis.com/auth/gmail.modify'] },
	sheets: {
		group: 'sheets',
		requiredScopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
	},
} as const

type GoogleOAuthTileId = keyof typeof GOOGLE_OAUTH_TILES

export type GoogleOAuthScopeGroup = (typeof GOOGLE_OAUTH_TILES)[GoogleOAuthTileId]['group']

export const isGoogleOAuthTileId = (serviceId: string): serviceId is GoogleOAuthTileId =>
	Object.hasOwn(GOOGLE_OAUTH_TILES, serviceId)
