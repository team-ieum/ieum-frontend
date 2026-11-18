import { http, HttpResponse } from 'msw'
import { isCommonOAuthDisconnectProvider } from '@/constants/integration/integrationProviders'
import type { IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'

// 일반 개발 서버에서는 실제 백엔드에 요청할 수 있도록 테스트 서버에만 등록한다.
export const integrationHandlers = [
	http.get('*/api/v1/integrations/:serviceType/workflows', ({ request }) => {
		const size = Number(new URL(request.url).searchParams.get('size') ?? 20)
		return HttpResponse.json<IntegrationServiceWorkflowsResponse>({
			success: true,
			data: { content: [], size, hasNext: false, nextCursor: null },
			message: 'OK',
			code: 'OK',
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
