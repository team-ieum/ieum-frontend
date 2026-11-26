import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { getIntegrationServiceWorkflows } from '@/api/integrationWorkflows'
import { server } from '@/mocks/server'
import type { IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'

const PROVIDERS = ['NOTION', 'GITHUB'] as const

describe('getIntegrationServiceWorkflows', () => {
	it.each(PROVIDERS)('%s 워크플로우 한 페이지를 소문자 경로로 요청하고 서버 응답을 반환한다', async provider => {
		const observeRequest = vi.fn()
		const body = {
			success: true,
			data: { content: [], size: 60, hasNext: true, nextCursor: 'next-page' },
			message: 'OK',
			code: 'OK',
		} satisfies IntegrationServiceWorkflowsResponse
		server.use(
			http.get('*/api/v1/integrations/:serviceType/workflows', ({ params, request }) => {
				const query = new URL(request.url).searchParams
				observeRequest(params.serviceType, query.get('size'), query.get('cursor'))
				return HttpResponse.json(body)
			})
		)

		await expect(getIntegrationServiceWorkflows(provider, { size: 60, cursor: 'current-page' })).resolves.toEqual(body)
		expect(observeRequest).toHaveBeenCalledExactlyOnceWith(provider.toLowerCase(), '60', 'current-page')
	})
})
