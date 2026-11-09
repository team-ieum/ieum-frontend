import type { ApiResponse } from '@/types/api'

/** 새로 발급한 수신 주소. 평문 `token`은 이 응답에서만 오고 서버는 해시만 남긴다. */
export type WebhookTokenDto = {
	token: string
	/** `/api/v1/hooks/{token}`. 호스트는 FE가 붙인다. */
	path: string
	issuedAt: string
}

/** 수신 주소 발급 여부. 토큰 값은 오지 않는다. */
export type WebhookTokenStatusDto = {
	issued: boolean
	issuedAt: string | null
}

export type IssueWebhookTokenResponse = ApiResponse<WebhookTokenDto>

export type WebhookTokenStatusResponse = ApiResponse<WebhookTokenStatusDto>
