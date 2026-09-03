import IntegrationConnectedDetail from '../components/integration/IntegrationConnectedDetail'
import IntegrationDetailAsyncState from '../components/integration/IntegrationDetailAsyncState'
import IntegrationListBody from '../components/integration/IntegrationListBody'
import IntegrationSettingLayout from '../components/integration/IntegrationSettingLayout'
import {
	createIntegrationViewVariants,
	getIntegrationViewDirection,
	getIntegrationViewKey,
	INTEGRATION_VIEW_TRANSITION,
	INTEGRATION_VIEW_TRANSITION_MODE,
} from '../components/integration/integrationViewMotion'
import { INTEGRATION_PAGE_X } from '../constants/integration/layout'
import { useIntegrationSetting } from '../hooks/integration/useIntegrationSetting'
import type { IntegrationTabId, IntegrationView } from '../types/integration'
import { cn } from '../utils/cn'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MotionProps } from 'framer-motion'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AiCredentialsSection } from '@/components/aiCredentials/AiCredentialsSection'
import WebhookCredentialConnectModalContainer from '@/components/integration/WebhookCredentialConnectModalContainer'
import { useDeleteWebhookCredentialMutation } from '@/hooks/webhookCredentials/mutations/useDeleteWebhookCredentialMutation'
import { useModalStore } from '@/stores/useModalStore'

type IntegrationViewAnimationDefinition = Parameters<NonNullable<MotionProps['onAnimationComplete']>>[0]

const useIntegrationViewTransition = (view: IntegrationView) => {
	const viewKey = getIntegrationViewKey(view)
	const [transitionSnapshot, setTransitionSnapshot] = useState(() => ({
		key: viewKey,
		kind: view.kind,
		direction: getIntegrationViewDirection(null, view.kind),
	}))

	if (transitionSnapshot.key !== viewKey) {
		const transitionDirection = getIntegrationViewDirection(transitionSnapshot.kind, view.kind)
		setTransitionSnapshot({ key: viewKey, kind: view.kind, direction: transitionDirection })
		return { transitionDirection, viewKey }
	}

	return { transitionDirection: transitionSnapshot.direction, viewKey }
}

const InterSettingPage = () => {
	const {
		view,
		detailResolution,
		activeTab,
		connected,
		available,
		currentService,
		connectedCount,
		availableCount,
		canResolveAvailable,
		webhookResource,
		oauthResource,
		isListView,
		aiCredentialsSectionRef,
		goDetail,
		goList,
		handleTabChange,
		onConnect,
		webhookConnectServiceId,
		closeWebhookConnect,
	} = useIntegrationSetting()
	const reduceMotion = useReducedMotion()
	const { transitionDirection, viewKey } = useIntegrationViewTransition(view)
	const manageButtonRefs = useRef(new Map<string, HTMLButtonElement>())
	const sectionButtonRefs = useRef(new Map<IntegrationTabId, HTMLButtonElement>())
	const detailHeadingRef = useRef<HTMLHeadingElement>(null)
	const lastManagedServiceIdRef = useRef<string | null>(null)
	const selectedSectionRef = useRef<IntegrationTabId | null>(null)
	const completedViewKeyRef = useRef(viewKey)
	const focusedDetailViewKeyRef = useRef<string | null>(null)

	const viewVariants = createIntegrationViewVariants(reduceMotion)

	const registerManageButton = useCallback((id: string, element: HTMLButtonElement | null) => {
		if (element) manageButtonRefs.current.set(id, element)
		else manageButtonRefs.current.delete(id)
	}, [])

	const registerSectionButton = useCallback((tab: IntegrationTabId, element: HTMLButtonElement | null) => {
		if (element) sectionButtonRefs.current.set(tab, element)
		else sectionButtonRefs.current.delete(tab)
	}, [])

	const handleManage = useCallback(
		(id: string) => {
			lastManagedServiceIdRef.current = id
			selectedSectionRef.current = null
			goDetail(id)
		},
		[goDetail]
	)

	const handleBack = useCallback(() => {
		selectedSectionRef.current = null
		goList()
	}, [goList])

	const handleSectionChange = useCallback(
		(tab: IntegrationTabId) => {
			selectedSectionRef.current = tab
			handleTabChange(tab)
		},
		[handleTabChange]
	)

	const handleViewAnimationComplete = useCallback(
		(definition: IntegrationViewAnimationDefinition) => {
			if (definition !== 'animate') return
			if (completedViewKeyRef.current === viewKey) return
			completedViewKeyRef.current = viewKey

			if (view.kind === 'detail') {
				if (detailResolution === 'ready') {
					detailHeadingRef.current?.focus()
					focusedDetailViewKeyRef.current = viewKey
				}
				return
			}

			if (transitionDirection !== -1) return
			const selectedSection = selectedSectionRef.current
			if (selectedSection) {
				sectionButtonRefs.current.get(selectedSection)?.focus()
				selectedSectionRef.current = null
				return
			}

			const lastManagedServiceId = lastManagedServiceIdRef.current
			if (!lastManagedServiceId) return
			const manageButton = manageButtonRefs.current.get(lastManagedServiceId)
			;(manageButton ?? sectionButtonRefs.current.get('services'))?.focus()
		},
		[detailResolution, transitionDirection, view, viewKey]
	)

	useEffect(() => {
		if (
			view.kind !== 'detail' ||
			detailResolution !== 'ready' ||
			completedViewKeyRef.current !== viewKey ||
			focusedDetailViewKeyRef.current === viewKey
		) {
			return
		}

		const frame = window.requestAnimationFrame(() => {
			detailHeadingRef.current?.focus()
			focusedDetailViewKeyRef.current = viewKey
		})
		return () => window.cancelAnimationFrame(frame)
	}, [detailResolution, view.kind, viewKey])

	const { mutate: deleteWebhookCredential, isPending: isDisconnecting } = useDeleteWebhookCredentialMutation()
	const openConfirm = useModalStore(state => state.openConfirm)

	const handleDisconnect = () => {
		if (!currentService || isDisconnecting) return
		const serviceId = currentService.id
		openConfirm({
			title: '연결 해제',
			message: `${currentService.name} 연결을 해제할까요? 이 서비스를 사용하는 워크플로우가 동작하지 않을 수 있습니다.`,
			confirmText: '연결 해제',
			variant: 'danger',
			onConfirm: () => deleteWebhookCredential(serviceId, { onSuccess: goList }),
		})
	}

	return (
		<IntegrationSettingLayout
			active={activeTab}
			onChange={handleSectionChange}
			view={view}
			connectedCount={connectedCount}
			availableCount={availableCount}
			isCountPending={!canResolveAvailable}
			onSectionButtonRef={registerSectionButton}
		>
			<div className='grid flex-1 bg-neutral-50'>
				<AnimatePresence initial={false} mode={INTEGRATION_VIEW_TRANSITION_MODE} custom={transitionDirection}>
					<motion.div
						key={viewKey}
						data-integration-view={viewKey}
						custom={transitionDirection}
						variants={viewVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						transition={INTEGRATION_VIEW_TRANSITION}
						onAnimationComplete={handleViewAnimationComplete}
						className='col-start-1 row-start-1 w-full'
					>
						{isListView ? (
							<>
								<IntegrationListBody
									connected={connected}
									available={available}
									onManage={handleManage}
									onManageButtonRef={registerManageButton}
									onConnect={onConnect}
									canResolveAvailable={canResolveAvailable}
									webhookResource={webhookResource}
									oauthResource={oauthResource}
								/>
								<section
									ref={aiCredentialsSectionRef}
									id='ai-credentials'
									className='scroll-mt-[calc(var(--layout-header-height)+4.75rem)]'
									aria-label='AI 자격 증명'
								>
									<AiCredentialsSection />
								</section>
							</>
						) : currentService ? (
							<div className={cn('w-full py-6 pb-9', INTEGRATION_PAGE_X)}>
								<IntegrationConnectedDetail
									service={currentService}
									onBack={handleBack}
									onDisconnect={handleDisconnect}
									isDisconnecting={isDisconnecting}
									headingRef={detailHeadingRef}
								/>
							</div>
						) : (
							<div className={cn('w-full py-10', INTEGRATION_PAGE_X)}>
								<IntegrationDetailAsyncState
									resolution={detailResolution === 'error' ? 'error' : 'loading'}
									webhookResource={webhookResource}
									oauthResource={oauthResource}
								/>
							</div>
						)}
					</motion.div>
				</AnimatePresence>
			</div>
			{webhookConnectServiceId ? (
				<WebhookCredentialConnectModalContainer serviceId={webhookConnectServiceId} onClose={closeWebhookConnect} />
			) : null}
		</IntegrationSettingLayout>
	)
}

export default InterSettingPage
