import { http, HttpResponse } from 'msw'
import { isCommonOAuthDisconnectProvider } from '@/constants/integration/integrationProviders'

export const handlers = [
	http.get('/api/user', () => {
		return HttpResponse.json({
			id: 1,
			name: 'User',
			role: 'admin',
		})
	}),
	http.delete('*/api/v1/oauth/connections/:provider', ({ params }) => {
		if (typeof params.provider !== 'string' || !isCommonOAuthDisconnectProvider(params.provider)) {
			return HttpResponse.json(
				{ success: false, data: null, message: '해제할 수 없는 OAuth 공급자입니다.', code: 'INVALID_INPUT' },
				{ status: 400 }
			)
		}
		return HttpResponse.json({ success: true, data: null, message: 'OK', code: 'OK' })
	}),
]
