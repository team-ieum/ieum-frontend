import { queryOptions } from '@tanstack/react-query'
import { getGithubAppInstallUrl } from '@/api/integrationOAuth'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'
import { toGithubAppInstallUrl } from '@/utils/integration/toGithubAppInstallUrl'

/** 링크로 쓸 수 없는 주소를 받으면 `null`로 고른다. */
export const githubAppInstallUrlQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.githubApp.installUrl(),
		queryFn: getGithubAppInstallUrl,
		select: response => toGithubAppInstallUrl(response.data?.installUrl),
		staleTime: QUERY_STALE_TIME_MS.githubAppInstallUrl,
	})
