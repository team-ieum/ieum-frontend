import { useMutation, useQueryClient } from '@tanstack/react-query'
import { issueWebhookToken } from '@/api/webhookToken'
import {
	webhookTokenAddressQueryOptions,
	webhookTokenStatusQueryOptions,
} from '@/hooks/workflow/queries/webhookTokenQueryOptions'

/** 수신 주소를 발급(재발급)하고, 한 번만 오는 평문 주소와 발급 상태를 캐시에 바로 넣는다. */
export const useIssueWebhookTokenMutation = (workflowId: string) => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () => issueWebhookToken(workflowId),
		onSuccess: async response => {
			const issued = response.data
			const statusKey = webhookTokenStatusQueryOptions(workflowId).queryKey
			// 발급 전에 시작한 상태 조회가 늦게 끝나 '미발급'이나 이전 발급 시각으로 덮지 않게 먼저 멈춘다.
			await queryClient.cancelQueries({ queryKey: statusKey })
			queryClient.setQueryData(webhookTokenAddressQueryOptions(workflowId).queryKey, issued)
			queryClient.setQueryData(statusKey, {
				issued: true,
				issuedAt: issued.issuedAt,
			})
		},
	})
}
