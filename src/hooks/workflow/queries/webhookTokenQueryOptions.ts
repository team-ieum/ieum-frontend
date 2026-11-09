import { queryOptions, skipToken } from '@tanstack/react-query'
import { getWebhookTokenStatus } from '@/api/webhookToken'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'
import type { WebhookTokenDto } from '@/types/webhookToken'

/** 워크플로우의 수신 주소 발급 여부. 토큰 값은 오지 않는다. */
export const webhookTokenStatusQueryOptions = (workflowId: string) =>
	queryOptions({
		queryKey: queryKeys.webhookTokens.status(workflowId),
		queryFn: async () => (await getWebhookTokenStatus(workflowId)).data,
		staleTime: QUERY_STALE_TIME_MS.webhookTokenStatus,
	})

/**
 * 이 화면에서 발급받은 평문 주소. 서버에서 다시 받을 수 없으므로 요청하지 않고 발급 mutation이 넣은 값만 읽는다.
 * 패널을 닫았다 열어도 다시 보이도록 캐시에서 지우지 않는다. 새로고침하거나 로그아웃(`queryClient.clear()`)하면 사라진다.
 */
export const webhookTokenAddressQueryOptions = (workflowId: string) =>
	queryOptions<WebhookTokenDto>({
		queryKey: queryKeys.webhookTokens.address(workflowId),
		queryFn: skipToken,
		staleTime: Infinity,
		gcTime: Infinity,
	})
