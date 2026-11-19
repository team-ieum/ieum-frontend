import { useIsMutating, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLayoutEffect, useRef } from 'react'
import {
	disconnectIntegrationOAuthMutationKey,
	useDisconnectIntegrationOAuthMutation,
} from '@/hooks/integration/mutations/useDisconnectIntegrationOAuthMutation'
import { oauthDisconnectImpactQueryOptions } from '@/hooks/integration/queries/oauthDisconnectImpactQueryOptions'
import type { AsyncResourceState } from '@/types/asyncResource'
import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'
import { isApiError } from '@/utils/ApiError'

type UseOAuthDisconnectPreviewOptions = {
	provider: OAuthDisconnectProvider
	connectionId: string
	onDisconnected: () => void
	onCancel: () => void
}

type UseOAuthDisconnectPreviewResult = {
	affectedNotice: string | undefined
	resource: AsyncResourceState
	canConfirm: boolean
	isSubmitting: boolean
	isConfirmDisabled: boolean
	deleteError: string | undefined
	handleConfirm: () => void
	handleCancel: () => void
}

type ActivePreview = Pick<UseOAuthDisconnectPreviewOptions, 'provider' | 'connectionId'> & { isSubmitted: boolean }

/** 확인창을 열 때마다 영향 목록을 조회하고, 조회가 끝난 상태에서만 해제를 실행한다. */
export const useOAuthDisconnectPreview = ({
	provider,
	connectionId,
	onDisconnected,
	onCancel,
}: UseOAuthDisconnectPreviewOptions): UseOAuthDisconnectPreviewResult => {
	const query = useQuery(oauthDisconnectImpactQueryOptions(provider, connectionId))
	const queryClient = useQueryClient()
	const pendingDeleteFilters = { mutationKey: disconnectIntegrationOAuthMutationKey(provider), exact: true }
	const pendingDeleteCount = useIsMutating(pendingDeleteFilters)
	const { mutateAsync, isPending, error } = useDisconnectIntegrationOAuthMutation(provider)
	const activePreviewRef = useRef<ActivePreview | null>(null)

	useLayoutEffect(() => {
		activePreviewRef.current = { provider, connectionId, isSubmitted: false }
		return () => {
			activePreviewRef.current = null
		}
	}, [connectionId, provider])

	const affectedNotice = query.data
	const isIdle = query.fetchStatus === 'idle'
	// 갱신 중에도 이전 안내를 표시하되, 이번에 연 확인창의 조회가 끝나야 해제할 수 있다.
	const canConfirm = query.isSuccess && query.isFetchedAfterMount && isIdle

	const handleRetry = () => {
		if (!query.isError || !isIdle) return
		void query.refetch({ cancelRefetch: false })
	}

	const handleCancel = () => {
		const preview = activePreviewRef.current
		if (preview?.provider === provider && preview.connectionId === connectionId && !preview.isSubmitted) onCancel()
	}

	const handleConfirm = async () => {
		const preview = activePreviewRef.current
		if (
			!canConfirm ||
			!preview ||
			preview.provider !== provider ||
			preview.connectionId !== connectionId ||
			preview.isSubmitted
		) {
			return
		}
		// 확인창을 닫았다 다시 열어도 같은 공급자의 진행 중 요청을 반복하지 않는다.
		if (queryClient.isMutating(pendingDeleteFilters) > 0) return

		preview.isSubmitted = true
		try {
			await mutateAsync()
		} catch {
			preview.isSubmitted = false
			return
		}
		if (activePreviewRef.current === preview) onDisconnected()
	}

	return {
		affectedNotice,
		canConfirm,
		resource: {
			isLoading: affectedNotice === undefined && !isIdle,
			isRefetching: affectedNotice !== undefined && !isIdle,
			isLoadingError: query.isLoadingError && isIdle,
			isRefetchError: query.isRefetchError && isIdle,
			retry: handleRetry,
		},
		isSubmitting: isPending,
		isConfirmDisabled: !isPending && pendingDeleteCount > 0,
		deleteError: error ? (isApiError(error) ? error.message : '연결을 해제하지 못했습니다. 다시 시도해주세요.') : undefined,
		handleConfirm,
		handleCancel,
	}
}
