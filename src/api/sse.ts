import { parseDataLines } from '@/utils/sseClient'

// 브라우저 native EventSource는 커스텀 헤더(Authorization)를 못 붙이므로
// fetch + ReadableStream으로 SSE를 직접 파싱한다.

type SseHandlers = {
	onEvent: (data: string) => void
	onOpen?: () => void
	onError?: (error: unknown) => void
	onDone?: () => void
}

export class SseHttpError extends Error {
	readonly status: number
	constructor(status: number) {
		super(`SSE 연결 실패 (status: ${status})`)
		this.name = 'SseHttpError'
		this.status = status
	}
}

type SseOptions = {
	url: string
	token: string
	signal?: AbortSignal
} & SseHandlers

export const subscribeSSE = async ({ url, token, signal, onEvent, onOpen, onError, onDone }: SseOptions): Promise<void> => {
	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'text/event-stream',
			},
			signal,
		})

		if (!response.ok) throw new SseHttpError(response.status)
		if (!response.body) throw new Error('SSE 응답 스트림이 없어요.')
		if (signal?.aborted) return
		onOpen?.()

		reader = response.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''

		for (;;) {
			const { done, value } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })

			// SSE 프레임 경계는 빈 줄(\n\n). CRLF도 방어.
			let boundary = buffer.search(/\r?\n\r?\n/)
			while (boundary !== -1) {
				const frame = buffer.slice(0, boundary)
				buffer = buffer.slice(boundary).replace(/^\r?\n\r?\n/, '')

				const data = parseDataLines(frame)
				if (data !== null) onEvent(data)

				boundary = buffer.search(/\r?\n\r?\n/)
			}
		}

		// 스트림 종료 시 프레임 구분자(\n\n) 없이 남은 마지막 데이터도 처리한다.
		buffer += decoder.decode()
		const tail = parseDataLines(buffer)
		if (tail !== null) onEvent(tail)

		onDone?.()
	} catch (error) {
		if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) return
		onError?.(error)
	} finally {
		if (reader) {
			try {
				await reader.cancel()
			} catch {
				// Network abort may already have cancelled the underlying response body.
			} finally {
				reader.releaseLock()
			}
		}
	}
}
