import type { ApiResponse } from '@/types/api'
import type { CredentialItem, ProviderInfo } from '@/types/credential'

export const providersResponse = {
	success: true,
	data: {
		providers: [
			{
				provider: 'GEMINI',
				displayName: 'Google Gemini',
				credentialTypes: ['API_KEY'],
				models: [
					{
						id: 'gemini-2.5-flash',
						displayName: 'Gemini 2.5 Flash',
						capabilities: ['text', 'tools'],
						maxOutputTokens: 65536,
						contextWindow: 1048576,
					},
				],
			},
		],
	},
	message: 'success',
	code: 'SUCCESS',
} satisfies ApiResponse<{ providers: ProviderInfo[] }>

export const emptyProvidersResponse = {
	...providersResponse,
	data: { providers: [] },
} satisfies ApiResponse<{ providers: ProviderInfo[] }>

export const credentialsResponse = {
	success: true,
	data: [
		{
			id: '77777777-7777-4777-8777-777777777777',
			provider: 'GEMINI',
			credentialType: 'API_KEY',
			displayName: '기본 Gemini API Key',
			keyHint: 'AIza...test',
			lastValidatedAt: '2026-08-26T02:00:00Z',
			createdAt: '2026-08-20T01:00:00Z',
			valid: true,
		},
	],
	message: 'success',
	code: 'SUCCESS',
} satisfies ApiResponse<CredentialItem[]>

export const emptyCredentialsResponse = {
	...credentialsResponse,
	data: [],
} satisfies ApiResponse<CredentialItem[]>
