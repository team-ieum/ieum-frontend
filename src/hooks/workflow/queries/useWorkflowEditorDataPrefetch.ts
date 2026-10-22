import { usePrefetchQuery } from '@tanstack/react-query'
import { credentialsQueryOptions, providersQueryOptions } from '@/hooks/aiCredentials/queries/aiCredentialsQueryOptions'

/**
 * 편집 page가 쓰는 provider·credential 목록 query가 cache에 없으면 렌더 중에 요청을 시작한다.
 * 편집 page chunk를 기다리는 동안 두 목록을 병렬로 받을 때 쓴다.
 */
export const useWorkflowEditorDataPrefetch = () => {
	usePrefetchQuery(providersQueryOptions())
	usePrefetchQuery(credentialsQueryOptions())
}
