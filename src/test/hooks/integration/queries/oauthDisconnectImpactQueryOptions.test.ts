import { afterEach, describe, expect, it, vi } from 'vitest'
import * as oauthDisconnect from '@/api/oauthDisconnect'
import { oauthDisconnectImpactQueryOptions } from '@/hooks/integration/queries/oauthDisconnectImpactQueryOptions'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import type { IntegrationServiceWorkflowDto, IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'
import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'

afterEach(() => vi.restoreAllMocks())

const createWorkflow = (id: string): IntegrationServiceWorkflowDto => ({
	id,
	name: `워크플로우 ${id}`,
	description: '',
	active: true,
	triggerType: 'SCHEDULE',
	usedNodeCount: 1,
	updatedAt: '2026-11-01T00:00:00Z',
})

const createPage = (
	content: IntegrationServiceWorkflowDto[],
	nextCursor: string | null,
	hasNext = nextCursor !== null
): IntegrationServiceWorkflowsResponse => ({
	success: true,
	data: { content, size: 100, hasNext, nextCursor },
	message: 'OK',
	code: 'OK',
})

const fetchImpact = (provider: OAuthDisconnectProvider) =>
	createTestQueryClient().fetchQuery(oauthDisconnectImpactQueryOptions(provider, 'connection-id'))

describe('oauthDisconnectImpactQueryOptions', () => {
	it('마지막 페이지까지 100개씩 조회하고 같은 ID는 처음 위치에 한 번만 반환한다', async () => {
		const [first, second, third] = ['first', 'second', 'third'].map(createWorkflow)
		const pageRequest = vi
			.spyOn(oauthDisconnect, 'getOAuthDisconnectWorkflowsPage')
			.mockResolvedValueOnce(createPage([first], 'cursor-2'))
			.mockResolvedValueOnce(createPage([first, second], 'cursor-3'))
			.mockResolvedValueOnce(createPage([third], null))

		await expect(fetchImpact('GITHUB')).resolves.toEqual([first, second, third])

		const signal = pageRequest.mock.calls[0][2]
		expect(signal).toBeInstanceOf(AbortSignal)
		expect(pageRequest.mock.calls).toEqual([
			['GITHUB', { size: 100 }, signal],
			['GITHUB', { size: 100, cursor: 'cursor-2' }, signal],
			['GITHUB', { size: 100, cursor: 'cursor-3' }, signal],
		])
	})

	it('다음 페이지 요청이 실패하면 부분 목록을 반환하지 않는다', async () => {
		const error = new Error('다음 페이지 조회 실패')
		vi.spyOn(oauthDisconnect, 'getOAuthDisconnectWorkflowsPage')
			.mockResolvedValueOnce(createPage([createWorkflow('first')], 'cursor-2'))
			.mockRejectedValueOnce(error)

		await expect(fetchImpact('GITHUB')).rejects.toBe(error)
	})

	it.each([
		['없으면', null],
		['반복되면', 'cursor-2'],
	])('다음 페이지가 있다고 했는데 cursor가 %s 조회를 중단한다', async (_, nextCursor) => {
		const pageRequest = vi
			.spyOn(oauthDisconnect, 'getOAuthDisconnectWorkflowsPage')
			.mockRejectedValue(new Error('잘못된 cursor로 요청함'))
			.mockResolvedValueOnce(createPage([createWorkflow('first')], 'cursor-2'))
			.mockResolvedValueOnce(createPage([createWorkflow('second')], nextCursor, true))

		await expect(fetchImpact('NOTION')).rejects.toThrow()
		expect(pageRequest).toHaveBeenCalledTimes(2)
	})
})
