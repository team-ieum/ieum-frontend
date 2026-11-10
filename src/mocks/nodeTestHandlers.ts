import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import type { NodeTestRequest, NodeTestResult } from '@/types/nodeTest'

export const NODE_TEST_PATH = '*/api/v1/workflows/:workflowId/nodes/:nodeId/test'
export const NODE_SAMPLE_PATH = '*/api/v1/workflows/:workflowId/nodes/:nodeId/sample'

/** 오프셋 없는 옛 서버 형식의 시각 문자열을 만든다. 지금 서버는 `…Z`(UTC)로 보내지만 화면은 두 형식을 같이 읽는다. */
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
	/** `remembersSamples`일 때 `webhook.catch` 수신 대기 뒤 요청을 받은 것처럼 샘플을 남기기까지의 시간 */
	webhookReceiveDelayMs?: number
}

const WEBHOOK_CATCH_EVENT = 'webhook.catch'
const LISTEN_DURATION_MS = 5 * 60_000

/**
 * 노드 테스트(POST test)와 최신 샘플(GET sample) mock.
 * 테스트는 SUCCESS로 응답하고, `webhook.catch`만 서버처럼 실행하지 않고 `LISTENING`으로 응답한다.
 */
export const createNodeTestHandlers = ({
	delayMs,
	remembersSamples = false,
	webhookReceiveDelayMs = 8_000,
}: NodeTestHandlersOptions = {}): HttpHandler[] => {
	const samples = new Map<string, NodeTestResult>()

	return [
		http.post(NODE_TEST_PATH, async ({ request, params }) => {
			const body = (await request.json().catch(() => ({}))) as NodeTestRequest
			if (delayMs) await delay(delayMs)
			const sampleKey = `${params.workflowId}:${params.nodeId}`
			if (body.node?.event === WEBHOOK_CATCH_EVENT) {
				if (remembersSamples) {
					setTimeout(() => {
						samples.set(sampleKey, {
							status: 'SUCCESS',
							output: { body: { orderId: 'ORD-1', amount: 12000 }, query: {} },
							testedAt: toLocalDateTime(new Date()),
						})
					}, webhookReceiveDelayMs)
				}
				const listening: NodeTestResult = {
					status: 'LISTENING',
					expiresAt: toLocalDateTime(new Date(Date.now() + LISTEN_DURATION_MS)),
				}
				return HttpResponse.json({ success: true, data: listening, message: 'OK', code: 'OK' })
			}
			const result: NodeTestResult = {
				status: 'SUCCESS',
				output: { ok: true, event: body.node?.event ?? 'unknown' },
				testedAt: toLocalDateTime(new Date()),
			}
			if (remembersSamples) samples.set(sampleKey, result)
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
