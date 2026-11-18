import { useIsMutating, useQuery, useQueryClient, type MutationFilters } from '@tanstack/react-query'
import { useLayoutEffect, useRef } from 'react'
import type { CommonOAuthDisconnectProvider } from '@/constants/integration/integrationProviders'
import { oauthDisconnectImpactQueryOptions } from '@/hooks/integration/queries/oauthDisconnectImpactQueryOptions'
import {
	DELETE_OAUTH_CONNECTION_MUTATION_KEY,
	useDeleteOAuthConnectionMutation,
} from '@/hooks/oauthConnections/mutations/useDeleteOAuthConnectionMutation'
import { isApiError } from '@/utils/ApiError'
import type { DisconnectImpact } from '@/utils/integration/getDisconnectImpact'

type UseOAuthDisconnectPreviewOptions = {
	provider: CommonOAuthDisconnectProvider
	connectionId: string
	onDisconnected: () => void
	onCancel: () => void
}

type UseOAuthDisconnectPreviewResult = {
	impact: DisconnectImpact | undefined
	loadFailed: boolean
	isSubmitting: boolean
	confirmDisabled: boolean
	deleteError: string | undefined
	onRetry: () => void
	onConfirm: () => void
	onCancel: () => void
}

type ActivePreview = Pick<UseOAuthDisconnectPreviewOptions, 'provider' | 'connectionId'> & { submitted: boolean }

/** 확인창을 열 때마다 영향 목록을 조회하고, 조회가 끝난 상태에서만 해제를 실행한다. */
export const useOAuthDisconnectPreview = ({
	provider,
	connectionId,
	onDisconnected,
	onCancel,
}: UseOAuthDisconnectPreviewOptions): UseOAuthDisconnectPreviewResult => {
	const query = useQuery(oauthDisconnectImpactQueryOptions(provider, connectionId))
	const queryClient = useQueryClient()
	const pendingDeleteFilters: MutationFilters = {
		mutationKey: DELETE_OAUTH_CONNECTION_MUTATION_KEY,
		exact: true,
		predicate: ({ state: { variables } }) => typeof variables === 'string' && variables.toUpperCase() === provider,
	}
	const pendingDeleteCount = useIsMutating(pendingDeleteFilters)
	const { mutateAsync, isPending, error } = useDeleteOAuthConnectionMutation()
	const activePreviewRef = useRef<ActivePreview | null>(null)

	useLayoutEffect(() => {
		activePreviewRef.current = { provider, connectionId, submitted: false }
		return () => {
			activePreviewRef.current = null
		}
	}, [connectionId, provider])

	// 닫았다 바로 다시 열어 캐시가 남아 있더라도 이번 조회의 결과로만 확인 버튼을 활성화한다.
	const isIdle = query.fetchStatus === 'idle'
	const impact = query.isSuccess && query.isFetchedAfterMount && isIdle ? query.data : undefined
	const loadFailed = query.isError && isIdle

	const handleRetry = () => {
		if (!loadFailed) return
		void query.refetch({ cancelRefetch: false })
	}

	const handleCancel = () => {
		const preview = activePreviewRef.current
		if (preview?.provider === provider && preview.connectionId === connectionId && !preview.submitted) onCancel()
	}

	const handleConfirm = async () => {
		const preview = activePreviewRef.current
		if (!impact || !preview || preview.provider !== provider || preview.connectionId !== connectionId || preview.submitted) {
			return
		}
		// 목록과 상세 사이를 이동해 확인창을 다시 열어도 같은 공급자의 진행 중 요청을 반복하지 않는다.
		if (queryClient.isMutating(pendingDeleteFilters) > 0) return

		preview.submitted = true
		try {
			await mutateAsync(provider)
		} catch {
			preview.submitted = false
			return
		}
		if (activePreviewRef.current === preview) onDisconnected()
	}

	return {
		impact,
		loadFailed,
		isSubmitting: isPending,
		confirmDisabled: !isPending && pendingDeleteCount > 0,
		deleteError: error ? (isApiError(error) ? error.message : '연결을 해제하지 못했습니다. 다시 시도해주세요.') : undefined,
		onRetry: handleRetry,
		onConfirm: handleConfirm,
		onCancel: handleCancel,
	}
}
