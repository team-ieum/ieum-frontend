import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import type { WebhookTokenDto, WebhookTokenStatusDto } from '@/types/webhookToken'

export const WEBHOOK_TOKEN_PATH = '*/api/v1/workflows/:workflowId/webhook-token'

type WebhookTokenHandlersOptions = {
	delayMs?: number
	/**
	 * 발급한 주소를 메모리에 남겨 발급 상태 조회로 돌려준다(measurement용).
	 * 단위 테스트 서버는 테스트 사이에 상태가 새지 않도록 끄고, 필요한 응답은 테스트에서 `server.use`로 정한다.
	 */
	remembersTokens?: boolean
}

const ok = <T>(data: T) => HttpResponse.json({ success: true, data, message: 'OK', code: 'OK' })

/** 수신 주소 발급(POST)과 발급 상태(GET) mock. 기본 상태는 미발급이다. */
export const createWebhookTokenHandlers = ({
	delayMs,
	remembersTokens = false,
}: WebhookTokenHandlersOptions = {}): HttpHandler[] => {
	const issuedAtByWorkflow = new Map<string, string>()
	let sequence = 0

	return [
		http.get(WEBHOOK_TOKEN_PATH, async ({ params }) => {
			if (delayMs) await delay(delayMs)
			const issuedAt = issuedAtByWorkflow.get(String(params.workflowId)) ?? null
			return ok<WebhookTokenStatusDto>({ issued: issuedAt !== null, issuedAt })
		}),
		http.post(WEBHOOK_TOKEN_PATH, async ({ params }) => {
			if (delayMs) await delay(delayMs)
			sequence += 1
			const token = `mock-hook-token-${sequence}`
			const issuedAt = new Date().toISOString()
			if (remembersTokens) issuedAtByWorkflow.set(String(params.workflowId), issuedAt)
			return ok<WebhookTokenDto>({ token, path: `/api/v1/hooks/${token}`, issuedAt })
		}),
	]
}
