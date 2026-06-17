declare module 'sockjs-client' {
	import type { IStompSocket } from '@stomp/stompjs'

	type SockJSProtocols = string | string[]

	interface SockJSOptions {
		server?: string
		sessionId?: number | (() => string)
		transports?: string | string[]
		timeout?: number
	}

	export default class SockJS implements IStompSocket {
		constructor(url: string, protocols?: SockJSProtocols, options?: SockJSOptions)

		onclose: ((event: CloseEvent) => void) | null
		onerror: ((event: Event) => void) | null
		onmessage: ((event: MessageEvent) => void) | null
		onopen: ((event: Event) => void) | null
		readyState: number

		close(): void
		send(data: string): void
	}
}
