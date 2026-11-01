import { infiniteQueryOptions } from '@tanstack/react-query'
import { getNodeOptions } from '@/api/nodeOptions'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'
import { isRetryableNodeOptionsError } from '@/utils/workflow/nodeOptions'

const MAX_RETRY_COUNT = 3

export const nodeOptionsQueryOptions = (source: string, inputs: Record<string, string>) =>
	infiniteQueryOptions({
		queryKey: queryKeys.nodeOptions.list(source, inputs),
		queryFn: ({ pageParam }) => getNodeOptions({ source, inputs, cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: lastPage => lastPage.data.nextCursor || undefined,
		staleTime: QUERY_STALE_TIME_MS.nodeOptions,
		// 앱 기본 재시도(3회)를 그대로 쓰면 연동 필요 같은 안내가 backoff 동안 skeleton에 가려진다.
		retry: (failureCount, error) => isRetryableNodeOptionsError(error) && failureCount < MAX_RETRY_COUNT,
	})
