import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { nodeTestSampleQueryOptions } from '@/hooks/workflow/queries/nodeTestSampleQueryOptions'
import { NODE_SAMPLE_PATH } from '@/mocks/nodeTestHandlers'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { ApiError, isApiError } from '@/utils/ApiError'

describe('nodeTestSampleQueryOptions', () => {
	it('샘플이 없는 404 TEST_SAMPLE_NOT_FOUND는 아직 테스트하지 않은 상태(null)로 바꾼다', async () => {
		const queryClient = createTestQueryClient()

		await expect(queryClient.fetchQuery(nodeTestSampleQueryOptions('workflow-1', 'node-1'))).resolves.toBeNull()
	})

	it('최신 샘플을 그대로 돌려준다', async () => {
		const sample = { status: 'SUCCESS', output: { ok: true }, testedAt: '2026-11-02T10:00:00' }
		server.use(
			http.get(NODE_SAMPLE_PATH, () => HttpResponse.json({ success: true, data: sample, message: 'OK', code: 'OK' }))
		)
		const queryClient = createTestQueryClient()

		await expect(queryClient.fetchQuery(nodeTestSampleQueryOptions('workflow-1', 'node-1'))).resolves.toEqual(sample)
	})

	it('그 밖의 오류는 실패로 남긴다', async () => {
		server.use(
			http.get(NODE_SAMPLE_PATH, () =>
				HttpResponse.json({ success: false, data: null, message: '없음', code: 'WORKFLOW_NOT_FOUND' }, { status: 404 })
			)
		)
		const queryClient = createTestQueryClient()

		const error = await queryClient.fetchQuery(nodeTestSampleQueryOptions('workflow-1', 'node-1')).catch(e => e)

		expect(isApiError(error) && error.code).toBe('WORKFLOW_NOT_FOUND')
	})

	it('code로 답한 오류는 재시도하지 않고 네트워크 오류만 재시도한다', () => {
		const { retry } = nodeTestSampleQueryOptions('workflow-1', 'node-1')
		if (typeof retry !== 'function') throw new Error('retry는 함수여야 합니다.')

		expect(retry(0, new ApiError('INTERNAL_SERVER_ERROR', '서버 오류'))).toBe(false)
		expect(retry(0, new Error('Network Error'))).toBe(true)
		expect(retry(3, new Error('Network Error'))).toBe(false)
	})
})
