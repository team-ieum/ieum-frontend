import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import type { NodeTestRequest, NodeTestResult } from '@/types/nodeTest'

export const NODE_TEST_PATH = '*/api/v1/workflows/:workflowId/nodes/:nodeId/test'
export const NODE_SAMPLE_PATH = '*/api/v1/workflows/:workflowId/nodes/:nodeId/sample'

/** 서버처럼 오프셋 없는 LocalDateTime 문자열을 만든다. */
const toLocalDateTime = (date: Date) => {
	const pad = (value: number) => String(value).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const sampleNotFoundResponse = () =>
	HttpResponse.json(
		{ success: false, data: null, message: '테스트 샘플이 없습니다.', code: 'TEST_SAMPLE_NOT_FOUND' },
		{ status: 404 }
	)

type NodeTestHandlersOptions = {
	delayMs?: number
	/**
	 * 테스트 결과를 메모리에 남겨 sample 조회로 돌려준다(measurement용).
	 * 단위 테스트 서버는 테스트 사이에 상태가 새지 않도록 끄고, 필요한 응답은 테스트에서 `server.use`로 정한다.
	 */
	remembersSamples?: boolean
}

/** 노드 테스트(POST test)와 최신 샘플(GET sample) mock. 테스트는 항상 SUCCESS로 응답한다. */
export const createNodeTestHandlers = ({ delayMs, remembersSamples = false }: NodeTestHandlersOptions = {}): HttpHandler[] => {
	const samples = new Map<string, NodeTestResult>()

	return [
		http.post(NODE_TEST_PATH, async ({ request, params }) => {
			const body = (await request.json().catch(() => ({}))) as NodeTestRequest
			if (delayMs) await delay(delayMs)
			const result: NodeTestResult = {
				status: 'SUCCESS',
				output: { ok: true, event: body.node?.event ?? 'unknown' },
				testedAt: toLocalDateTime(new Date()),
			}
			if (remembersSamples) samples.set(`${params.workflowId}:${params.nodeId}`, result)
			return HttpResponse.json({ success: true, data: result, message: 'OK', code: 'OK' })
		}),
		http.get(NODE_SAMPLE_PATH, async ({ params }) => {
			if (delayMs) await delay(delayMs)
			const sample = samples.get(`${params.workflowId}:${params.nodeId}`)
			if (!sample) return sampleNotFoundResponse()
			return HttpResponse.json({ success: true, data: sample, message: 'OK', code: 'OK' })
		}),
	]
}
