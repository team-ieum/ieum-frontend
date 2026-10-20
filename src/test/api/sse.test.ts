import { afterEach, describe, expect, it, vi } from 'vitest'
import { SseHttpError, subscribeSSE } from '@/api/sse'

const url = 'https://api.example.com/events'
const token = 'access-token'

describe('subscribeSSE', () => {
	afterEach(() => vi.unstubAllGlobals())

	it('GET 인증 헤더를 유지하고 open → 이벤트 → done 순서로 분할 프레임을 처리한다', async () => {
		const chunks = ['data: {"type":"NODE_', 'STARTED"}\r\n\r\ndata: {"type":"EXECUTION_COMPLETED"}']
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				chunks.forEach(chunk => controller.enqueue(new TextEncoder().encode(chunk)))
				controller.close()
			},
		})
		const fetcher = vi.fn().mockResolvedValue(new Response(body, { status: 200 }))
		vi.stubGlobal('fetch', fetcher)
		const order: string[] = []
		await subscribeSSE({
			url,
			token,
			onOpen: () => order.push('open'),
			onEvent: event => order.push(event),
			onDone: () => order.push('done'),
		})
		expect(fetcher).toHaveBeenCalledWith(
			url,
			expect.objectContaining({ method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' } })
		)
		expect(order).toEqual(['open', '{"type":"NODE_STARTED"}', '{"type":"EXECUTION_COMPLETED"}', 'done'])
		expect(body.locked).toBe(false)
	})

	it.each([401, 403, 503])('HTTP %s의 상태를 오류 콜백에 전달한다', async status => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })))
		const onError = vi.fn()
		const onOpen = vi.fn()
		const onDone = vi.fn()
		await subscribeSSE({ url, token, onEvent: vi.fn(), onOpen, onError, onDone })
		expect(onError).toHaveBeenCalledWith(expect.any(SseHttpError))
		expect(onError.mock.calls[0][0].status).toBe(status)
		expect(onOpen).not.toHaveBeenCalled()
		expect(onDone).not.toHaveBeenCalled()
	})

	it('명시적 취소를 연결 실패나 EOF로 보고하지 않는다', async () => {
		const controller = new AbortController()
		controller.abort()
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
		const onError = vi.fn()
		const onDone = vi.fn()
		await subscribeSSE({ url, token, signal: controller.signal, onEvent: vi.fn(), onError, onDone })
		expect(onError).not.toHaveBeenCalled()
		expect(onDone).not.toHaveBeenCalled()
	})
})
