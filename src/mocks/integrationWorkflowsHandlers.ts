import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import { googleIntegrationWorkflowsResponse } from '@/mocks/fixtures/integrations'

/** 연동 서비스를 쓰는 워크플로우 목록 mock. GOOGLE은 fixture 목록, 그 밖의 서비스는 빈 목록이다. */
export const createIntegrationWorkflowsHandlers = ({ delayMs }: { delayMs?: number } = {}): HttpHandler[] => [
	http.get('*/api/v1/integrations/:serviceType/workflows', async ({ params }) => {
		if (delayMs) await delay(delayMs)
		if (params.serviceType === 'google') return HttpResponse.json(googleIntegrationWorkflowsResponse)
		return HttpResponse.json({
			...googleIntegrationWorkflowsResponse,
			data: { content: [], size: 20, hasNext: false, nextCursor: null },
		})
	}),
]
