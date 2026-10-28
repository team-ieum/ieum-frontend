import { queryOptions } from '@tanstack/react-query'
import { getNodeCatalog } from '@/api/nodeCatalog'
import { queryKeys } from '@/constants/queryKeys'

export const nodeCatalogQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.nodeCatalog.all(),
		queryFn: getNodeCatalog,
		// 서버가 캐시 없이 매번 agent를 거치고(타임아웃 10초) 배포 전에는 바뀌지 않으므로 세션 동안 한 번만 받는다.
		staleTime: Infinity,
		gcTime: Infinity,
		// 실패 응답이 최대 10초씩 걸려 기본 3회 재시도는 대기가 너무 길다. 이후 재시도는 팔레트의 다시 시도 버튼으로 한다.
		retry: 1,
	})
