import type { GoogleMyScopesData, GoogleScopesData } from '@/types/googleOAuth'
import type { IntegrationBrand, IntegrationService } from '@/types/integration'
import { GOOGLE_OAUTH_CONNECTED_ID, GOOGLE_SCOPE_GROUP_META } from '@/constants/integration/googleScopeGroups'

const mapScopeGroupKey = (groupKey: string): { name: string; brand: IntegrationBrand; desc: string } => {
	const meta = GOOGLE_SCOPE_GROUP_META[groupKey.toUpperCase()]
	if (meta) return meta

	return {
		name: groupKey,
		brand: 'google',
		desc: 'Google OAuth 연동',
	}
}

export const mapGoogleScopesToAvailableServices = (data: GoogleScopesData): IntegrationService[] =>
	Object.entries(data.scopes).map(([groupKey, scopeUrls]) => {
		const meta = mapScopeGroupKey(groupKey)
		return {
			id: `google-scope-${groupKey.toLowerCase()}`,
			name: meta.name,
			brand: meta.brand,
			status: 'available',
			desc: meta.desc,
			scopes: scopeUrls,
		}
	})

export const mapGoogleMyScopesToConnectedService = (data: GoogleMyScopesData): IntegrationService | null => {
	if (!data.connected) return null

	return {
		id: GOOGLE_OAUTH_CONNECTED_ID,
		name: 'Google',
		brand: 'google',
		status: 'connected',
		account: `${data.scopes.length}개 권한 승인됨`,
		scopes: data.scopes,
		workflowCount: 0,
	}
}
