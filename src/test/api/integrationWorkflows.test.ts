import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAllIntegrationServiceWorkflows, getIntegrationServiceWorkflows } from '@/api/integrationWorkflows'
import type {
	IntegrationServiceType,
	IntegrationServiceWorkflowDto,
	IntegrationServiceWorkflowsResponse,
} from '@/types/integrationWorkflows'
import { api } from '@/utils/AxiosInstance'

afterEach(() => {
	vi.restoreAllMocks()
})

const createWorkflow = (id: string): IntegrationServiceWorkflowDto => ({
	id,
	name: `워크플로우 ${id}`,
	description: '',
	active: true,
	triggerType: 'SCHEDULE',
	usedNodeCount: 1,
	updatedAt: '2026-11-01T00:00:00Z',
})

const createPage = (content: IntegrationServiceWorkflowDto[], nextCursor: string | null, hasNext = nextCursor !== null) => ({
	data: {
		success: true,
		data: { content, size: 100, hasNext, nextCursor },
		message: 'OK',
		code: 'OK',
	} satisfies IntegrationServiceWorkflowsResponse,
})

describe('getAllIntegrationServiceWorkflows', () => {
	it('마지막 페이지까지 100개씩 요청해 순서대로 워크플로우를 반환한다', async () => {
		const workflows = ['1', '2', '3'].map(createWorkflow)
		const get = vi
			.spyOn(api, 'get')
			.mockResolvedValueOnce(createPage([workflows[0]], 'cursor-2'))
			.mockResolvedValueOnce(createPage([workflows[1]], 'cursor-3'))
			.mockResolvedValueOnce(createPage([workflows[2]], null))

		await expect(getAllIntegrationServiceWorkflows('GOOGLE')).resolves.toEqual(workflows)
		expect(get.mock.calls).toEqual([
			['/api/v1/integrations/google/workflows', { params: { size: 100 } }],
			['/api/v1/integrations/google/workflows', { params: { cursor: 'cursor-2', size: 100 } }],
			['/api/v1/integrations/google/workflows', { params: { cursor: 'cursor-3', size: 100 } }],
		])
		for (const [, config] of get.mock.calls) expect(config).not.toHaveProperty('signal')
	})

	it('이전 페이지와 같은 ID가 다시 나와도 결과에 한 번만 포함한다', async () => {
		const first = createWorkflow('first')
		const second = createWorkflow('second')
		vi.spyOn(api, 'get')
			.mockResolvedValueOnce(createPage([first], 'cursor-2'))
			.mockResolvedValueOnce(createPage([first, second], null))

		await expect(getAllIntegrationServiceWorkflows('NOTION')).resolves.toEqual([first, second])
	})

	it('다음 페이지 요청이 실패하면 부분 목록을 반환하지 않는다', async () => {
		const error = new Error('다음 페이지 조회 실패')
		vi.spyOn(api, 'get')
			.mockResolvedValueOnce(createPage([createWorkflow('first')], 'cursor-2'))
			.mockRejectedValueOnce(error)

		await expect(getAllIntegrationServiceWorkflows('GITHUB')).rejects.toBe(error)
	})

	it.each([
		['없으면', null],
		['반복되면', 'cursor-2'],
	])('다음 페이지가 있다고 했는데 cursor가 %s 조회를 중단한다', async (_, nextCursor) => {
		const get = vi
			.spyOn(api, 'get')
			.mockRejectedValue(new Error('잘못된 cursor로 요청함'))
			.mockResolvedValueOnce(createPage([createWorkflow('first')], 'cursor-2'))
			.mockResolvedValueOnce(createPage([createWorkflow('second')], nextCursor, true))

		await expect(getAllIntegrationServiceWorkflows('GOOGLE')).rejects.toThrow()
		expect(get).toHaveBeenCalledTimes(2)
	})

	it('AbortSignal을 제공하면 모든 페이지 요청에 같은 신호를 전달한다', async () => {
		const { signal } = new AbortController()
		const get = vi
			.spyOn(api, 'get')
			.mockResolvedValueOnce(createPage([], 'cursor-2'))
			.mockResolvedValueOnce(createPage([], null))

		await expect(getAllIntegrationServiceWorkflows('NOTION', signal)).resolves.toEqual([])
		expect(get).toHaveBeenCalledTimes(2)
		for (const [, config] of get.mock.calls) expect(config?.signal).toBe(signal)
	})
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
