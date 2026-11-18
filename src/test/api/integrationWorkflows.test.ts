import { afterEach, describe, expect, it, vi } from 'vitest'
import { getIntegrationServiceWorkflows } from '@/api/integrationWorkflows'
import type { IntegrationServiceType, IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'
import { api } from '@/utils/AxiosInstance'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('getIntegrationServiceWorkflows', () => {
	it.each<[IntegrationServiceType, string]>([
		['GOOGLE', 'google'],
		['NOTION', 'notion'],
		['GITHUB', 'github'],
		['SLACK', 'SLACK'],
		['DISCORD', 'DISCORD'],
	])('%s 조회는 경로에 %s를 쓰고 페이지 정보와 응답 본문을 유지한다', async (serviceType, pathServiceType) => {
		const params = { cursor: 'cursor-2', size: 100 }
		const response = {
			success: true,
			data: { content: [], size: 100, hasNext: false, nextCursor: null },
			message: 'OK',
			code: 'OK',
		} satisfies IntegrationServiceWorkflowsResponse
		const get = vi.spyOn(api, 'get').mockResolvedValue({ data: response })

		await expect(getIntegrationServiceWorkflows(serviceType, params)).resolves.toEqual(response)
		expect(get).toHaveBeenCalledWith(`/api/v1/integrations/${pathServiceType}/workflows`, { params })
	})
})
