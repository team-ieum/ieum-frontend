import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { OAUTH_DISCONNECT_BY_PROVIDER } from '@/constants/integration/integrationProviders'
import { integrationServiceWorkflowsQueryOptions } from '@/hooks/integration/queries/integrationServiceWorkflowsQueryOptions'
import { useDeleteOAuthConnectionMutation } from '@/hooks/oauthConnections/mutations/useDeleteOAuthConnectionMutation'
import { useDeleteWebhookCredentialMutation } from '@/hooks/webhookCredentials/mutations/useDeleteWebhookCredentialMutation'
import { useModalStore } from '@/stores/useModalStore'
import type { IntegrationService } from '@/types/integration'
import { isApiError } from '@/utils/ApiError'
import { canDisconnectIntegrationService } from '@/utils/integration/canDisconnectIntegrationService'
import { formatAffectedWorkflowsNotice } from '@/utils/integration/formatAffectedWorkflowsNotice'
import { getIntegrationServiceType } from '@/utils/integration/getIntegrationServiceType'

type UseIntegrationDisconnectOptions = {
	service: IntegrationService | undefined
	onDisconnected: () => void
}

const getOAuthDisconnectConfig = (service: IntegrationService) =>
	service.oauthProvider ? OAUTH_DISCONNECT_BY_PROVIDER[service.oauthProvider] : undefined

const buildDisconnectMessage = (service: IntegrationService, affectedNotice: string | null): string => {
	const base = `${service.name} 연결을 해제할까요? 이 서비스를 사용하는 워크플로우가 동작하지 않을 수 있습니다.`
	return [base, affectedNotice, getOAuthDisconnectConfig(service)?.notice].filter(Boolean).join(' ')
}

/**
 * 연결된 서비스 해제 command를 제공한다.
 * 위험 동작 확인 modal을 거쳐 웹훅 자격증명을 삭제하거나 OAuth 연결을 해제하고, 성공하면 `onDisconnected`를 호출한다.
 * 공급자 설정이 `listsAffectedWorkflows`를 켜면(Google) 확인 modal을 열기 전에 이 연결을 쓰는 워크플로우를 조회해
 * 문구에 넣는다. 조회 중에는 `isCheckingAffectedWorkflows`가 true다.
 * 해제할 수 없는 서비스(`canDisconnect`가 false)이거나 조회·요청이 진행 중이면 `disconnect`는 아무것도 하지 않는다.
 * 응답 전에 화면을 떠나거나 다른 서비스 상세로 바꾸면 늦은 응답으로 확인 modal, 목록 이동, 오류 modal을 실행하지 않는다.
 */
export const useIntegrationDisconnect = ({ service, onDisconnected }: UseIntegrationDisconnectOptions) => {
	const queryClient = useQueryClient()
	const { mutateAsync: deleteWebhookCredential, isPending: isDeletingWebhook } = useDeleteWebhookCredentialMutation()
	const { mutateAsync: deleteOAuthConnection, isPending: isDeletingOAuth } = useDeleteOAuthConnectionMutation()
	const openConfirm = useModalStore(state => state.openConfirm)
	const openModal = useModalStore(state => state.open)
	const [isCheckingAffectedWorkflows, setIsCheckingAffectedWorkflows] = useState(false)
	const isDisconnecting = isDeletingWebhook || isDeletingOAuth
	const canDisconnect = service !== undefined && canDisconnectIntegrationService(service)
	const serviceId = service?.id
	// 응답이 왔을 때 요청한 서비스를 아직 보고 있는지 판정한다. 화면을 떠나면 undefined가 된다.
	// 다른 서비스 상세나 다른 화면에서 onDisconnected(목록 이동)·오류 modal이 실행되지 않게 막는다.
	const currentServiceIdRef = useRef<string | undefined>(undefined)

	useEffect(() => {
		currentServiceIdRef.current = serviceId
		return () => {
			currentServiceIdRef.current = undefined
		}
	}, [serviceId])

	/** 이 연결을 쓰는 워크플로우 안내. 조회하지 않는 공급자면 `null`, 조회에 실패하면 확인하지 못했다는 문구다. */
	const loadAffectedWorkflowsNotice = useCallback(
		async (target: IntegrationService): Promise<string | null> => {
			if (!getOAuthDisconnectConfig(target)?.listsAffectedWorkflows) return null
			const serviceType = getIntegrationServiceType(target.brand)
			if (!serviceType) return formatAffectedWorkflowsNotice(null)
			try {
				// 상세 아래 '연동 워크플로우' 목록과 같은 key라 그 목록도 함께 최신으로 바뀐다.
				// 확인 modal이 늦게 뜨지 않도록 전역 retry(3회)는 끈다.
				const data = await queryClient.fetchInfiniteQuery({
					...integrationServiceWorkflowsQueryOptions(serviceType),
					retry: false,
				})
				const lastPage = data.pages.at(-1)
				return formatAffectedWorkflowsNotice({
					names: data.pages.flatMap(page => page.data.content.map(workflow => workflow.name)),
					hasMore: lastPage?.data.hasNext ?? false,
				})
			} catch {
				return formatAffectedWorkflowsNotice(null)
			}
		},
		[queryClient]
	)

	const disconnect = useCallback(() => {
		if (!service || !canDisconnect || isDisconnecting || isCheckingAffectedWorkflows) return
		const { id, origin, oauthProvider } = service

		const runDisconnect = async () => {
			try {
				if (origin === 'oauth' && oauthProvider) await deleteOAuthConnection(oauthProvider)
				else await deleteWebhookCredential(id)
				if (currentServiceIdRef.current === id) onDisconnected()
			} catch (error) {
				if (currentServiceIdRef.current !== id) return
				openModal('연결 해제 실패', isApiError(error) ? error.message : '연결을 해제하지 못했습니다. 다시 시도해주세요.')
			}
		}

		const openDisconnectConfirm = (affectedNotice: string | null) =>
			openConfirm({
				title: '연결 해제',
				message: buildDisconnectMessage(service, affectedNotice),
				confirmText: '연결 해제',
				variant: 'danger',
				onConfirm: () => void runDisconnect(),
			})

		if (!getOAuthDisconnectConfig(service)?.listsAffectedWorkflows) {
			openDisconnectConfirm(null)
			return
		}

		setIsCheckingAffectedWorkflows(true)
		void loadAffectedWorkflowsNotice(service).then(notice => {
			setIsCheckingAffectedWorkflows(false)
			if (currentServiceIdRef.current === id) openDisconnectConfirm(notice)
		})
	}, [
		canDisconnect,
		deleteOAuthConnection,
		deleteWebhookCredential,
		isCheckingAffectedWorkflows,
		isDisconnecting,
		loadAffectedWorkflowsNotice,
		onDisconnected,
		openConfirm,
		openModal,
		service,
	])

	return { disconnect, isDisconnecting, isCheckingAffectedWorkflows, canDisconnect }
}
