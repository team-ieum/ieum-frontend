import { api } from '@/utils/AxiosInstance'
import type { IssueWebhookTokenResponse, WebhookTokenStatusResponse } from '@/types/webhookToken'

const getWebhookTokenPath = (workflowId: string) => `/api/v1/workflows/${encodeURIComponent(workflowId)}/webhook-token`

/** 워크플로우의 수신 주소를 발급한다. 이미 있으면 재발급되어 이전 주소는 바로 끊긴다. */
export const issueWebhookToken = async (workflowId: string): Promise<IssueWebhookTokenResponse> => {
	const response = await api.post(getWebhookTokenPath(workflowId))
	return response.data
}

export const getWebhookTokenStatus = async (workflowId: string): Promise<WebhookTokenStatusResponse> => {
	const response = await api.get(getWebhookTokenPath(workflowId))
	return response.data
}
