import type { GithubAppInstallLink } from '@/types/integration'
import { useGithubAppInstallUrlQuery } from './queries/useGithubAppInstallUrlQuery'

/** GitHub App 설치 화면 링크를 준비한다. `enabled`가 false면 주소를 요청하지 않는다. */
export const useGithubAppInstallLink = (enabled: boolean): GithubAppInstallLink => {
	const query = useGithubAppInstallUrlQuery(enabled)
	const href = query.data ?? null

	return {
		href,
		// 오프라인으로 요청이 멈춘(paused) 동안에도 주소가 없으면 기다리는 중으로 보여 자리를 비우지 않는다.
		isLoading: enabled && query.isPending,
		hasError: query.isError || (query.isSuccess && href === null),
		retry: () => void query.refetch(),
	}
}
