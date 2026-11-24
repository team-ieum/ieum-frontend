import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@/utils/ApiError'
import { deleteOAuthConnection as requestOAuthDisconnect } from '@/api/oauthConnections'
import { queryKeys } from '@/constants/queryKeys'
import type { OAuthConnectionTarget } from '@/types/oauthConnections'

export const deleteOAuthConnectionMutationKey = (provider?: string) =>
	[...queryKeys.oauthConnections.all(), 'disconnect', provider] as const

// 다른 화면에서 먼저 연결을 해제했더라도 같은 성공 경로로 목록을 갱신한다.
const deleteOAuthConnection = async (provider: string, providerAccountId?: string) => {
	try {
		await requestOAuthDisconnect(provider, providerAccountId)
	} catch (error) {
		if (!isApiError(error) || error.code !== 'ACCOUNT_NOT_CONNECTED') throw error
	}
}

export const useDeleteOAuthConnectionMutation = (provider?: string) => {
	const queryClient = useQueryClient()

	return useMutation({
		// 오프라인에서 확인한 해제를 예약했다가 연결 복구 시 실행하지 않는다.
		networkMode: 'always',
		retry: false,
		mutationFn: ({ provider, providerAccountId }: OAuthConnectionTarget) =>
			deleteOAuthConnection(provider, providerAccountId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.oauthConnections.list(), exact: true })
		},
		mutationKey: deleteOAuthConnectionMutationKey(provider),
		scope: provider ? { id: `oauth-disconnect-${provider}` } : undefined,
	})
}
