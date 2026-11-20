import { useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FocusTrap } from 'focus-trap-react'
import { Info, X } from 'lucide-react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import { OAUTH_DISCONNECT_NOTICE } from '@/constants/integration/oauthDisconnect'
import type { IntegrationService } from '@/types/integration'
import type { AsyncResourceState } from '@/types/asyncResource'
import type { OAuthDisconnectImpact, OAuthDisconnectProvider } from '@/types/oauthDisconnect'
import { formatAffectedWorkflowsNotice } from '@/utils/integration/formatAffectedWorkflowsNotice'

import IntegrationDisconnectAccount from './IntegrationDisconnectAccount'
import IntegrationDisconnectWorkflows from './IntegrationDisconnectWorkflows'

type IntegrationDisconnectModalProps = {
	provider: OAuthDisconnectProvider
	service: Pick<IntegrationService, 'brand' | 'name' | 'account'>
	impact?: OAuthDisconnectImpact
	resource: AsyncResourceState
	/** 이번에 연 확인창에서 전체 목록 조회가 완료된 경우에만 해제를 확인할 수 있다. */
	canConfirm: boolean
	isSubmitting: boolean
	isConfirmDisabled?: boolean
	deleteError?: string
	getReturnFocusTarget?: () => HTMLElement | false
	onCancel: () => void
	onConfirm: () => void
}

/** 해제 요청이 끝날 때까지 확인창을 열어 두어 실패 시 같은 버튼에서 재시도할 수 있게 한다. */
const IntegrationDisconnectModal = ({
	provider,
	service,
	impact,
	resource,
	canConfirm,
	isSubmitting,
	isConfirmDisabled = false,
	deleteError,
	getReturnFocusTarget,
	onCancel,
	onConfirm,
}: IntegrationDisconnectModalProps) => {
	const titleId = useId()
	const serviceId = useId()
	const accountId = useId()
	const noticeId = useId()
	const impactId = useId()
	const descriptionIds = [service.account?.trim() && accountId, impact && impactId, noticeId].filter(Boolean).join(' ')
	const cancelRef = useRef<HTMLButtonElement>(null)
	const showIndividualNotice = impact !== undefined && impact.totalCount <= 2
	const isCheckingImpact = resource.isLoading || resource.isRefetching
	const hasImpactError = resource.isLoadingError || resource.isRefetchError
	// 해제 실패와 목록 재조회가 겹쳐도 포커스된 버튼을 남기고 재시도만 막는다.
	const isConfirmVisible = canConfirm || isSubmitting || deleteError !== undefined
	const isConfirmBlocked = !canConfirm || isSubmitting || isConfirmDisabled
	// 요청 중에도 버튼을 탭 순서에 남기기 위해 aria-disabled를 쓰고, 닫기와 재제출은 핸들러에서 막는다.
	const handleCancel = () => {
		if (!isSubmitting) onCancel()
	}
	// 트랩은 열릴 때의 옵션을 유지하므로 document의 Escape도 최신 제출 상태를 확인한다.
	const handleCancelRef = useRef(handleCancel)
	useLayoutEffect(() => {
		handleCancelRef.current = handleCancel
	})

	const handleConfirm = () => {
		if (!isConfirmBlocked) onConfirm()
	}

	return createPortal(
		<FocusTrap
			focusTrapOptions={{
				initialFocus: () => cancelRef.current ?? undefined,
				escapeDeactivates: () => {
					handleCancelRef.current()
					return false
				},
				allowOutsideClick: true,
				// 취소하면 상세의 해제 버튼으로 돌아가고, 성공하면 목록이 포커스를 넘겨받는다.
				setReturnFocus: getReturnFocusTarget,
			}}
		>
			<div
				className='fixed inset-0 z-50 flex items-center justify-center p-3'
				onMouseDown={event => {
					// 제출 중에는 배경이나 안내 문구를 눌러도 키보드 포커스를 확인창에 유지한다.
					if (isSubmitting) event.preventDefault()
				}}
			>
				<div aria-hidden='true' className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={handleCancel} />
				<section
					role='alertdialog'
					aria-modal='true'
					aria-labelledby={`${serviceId} ${titleId}`}
					aria-describedby={descriptionIds}
					onKeyDown={event => {
						if (event.key === 'Escape') {
							// 확인창에서 누른 Escape가 바깥 화면의 단축키까지 실행하지 않게 한다.
							event.stopPropagation()
							handleCancel()
						}
					}}
					className='relative z-10 h-120 max-h-[calc(100dvh-1.5rem)] w-full max-w-133.5 overflow-auto overscroll-contain rounded-[calc(var(--radius-brand-md)+var(--radius-brand-sm))] border border-neutral-200 bg-neutral-white shadow-2xl'
				>
					<button
						type='button'
						aria-label='닫기'
						aria-disabled={isSubmitting}
						onClick={handleCancel}
						className='absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-brand-sm text-neutral-600 transition-colors hover:bg-neutral-100 motion-reduce:transition-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-main-blue'
					>
						<X size={16} aria-hidden='true' />
					</button>
					<div className='grid h-full min-h-84 grid-cols-[9.625rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] max-[600px]:min-h-100 max-[600px]:grid-cols-1 max-[600px]:grid-rows-[4.375rem_minmax(0,1fr)]'>
						<IntegrationDisconnectAccount service={service} serviceId={serviceId} accountId={accountId} />
						<div className='flex min-h-0 min-w-0 flex-col px-5.75 pt-7 max-[600px]:px-4.25 max-[600px]:pt-4'>
							<h2
								id={titleId}
								className='shrink-0 pr-7 typo-heading3_bold tracking-tight text-neutral-800 max-[600px]:pr-0 max-[600px]:typo-title1_bold'
							>
								연결을 해제할까요?
							</h2>
							<div
								role='region'
								aria-label='연동 해제 안내'
								tabIndex={impact && impact.totalCount > 0 ? 0 : undefined}
								aria-busy={isCheckingImpact}
								className='min-h-0 flex-1 overflow-y-auto overscroll-contain break-keep pe-1 wrap-anywhere typo-body2_regular text-neutral-600 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-main-blue'
							>
								{impact && (
									<div id={impactId}>
										<IntegrationDisconnectWorkflows
											impact={impact}
											showIndividualNotice={showIndividualNotice}
										/>
									</div>
								)}
								{hasImpactError ? (
									<div role='alert' className='mt-2'>
										<p>{formatAffectedWorkflowsNotice(null)}</p>
										<button
											type='button'
											onClick={resource.retry}
											className='typo-button1_semibold text-main-blue focus-visible:outline-2 focus-visible:outline-main-blue'
										>
											다시 조회
										</button>
									</div>
								) : resource.isRefetching ? (
									<p role='status' className='mt-2'>
										워크플로우를 다시 확인하고 있어요.
									</p>
								) : resource.isLoading ? (
									<div role='status' aria-label='영향받는 워크플로우 불러오는 중' className='mt-2'>
										<SkeletonPulse className='h-4 w-2/3 rounded-brand-sm bg-neutral-200' />
									</div>
								) : null}
							</div>
							{deleteError && (
								<p
									role='alert'
									tabIndex={0}
									className='mt-2 max-h-[20dvh] shrink-0 overflow-y-auto wrap-anywhere typo-body2_regular text-danger-700 focus-visible:outline-2 focus-visible:outline-main-blue'
								>
									{deleteError}
								</p>
							)}
							{isConfirmDisabled && (
								<p role='status' className='mt-2 typo-body2_regular'>
									연결을 해제하고 있어요.
								</p>
							)}
							<div id={noticeId} className='flex shrink-0 flex-col'>
								{impact && !showIndividualNotice && impact.automaticCount > 0 && (
									<p className='pt-2 break-keep typo-body3_regular text-main-deep-blue'>
										전체 {impact.totalCount}개 중 <strong>{impact.automaticCount}개</strong>는 해제 후에도
										자동 실행을 시도해요.
									</p>
								)}
								<div className='mt-2.5 flex min-h-13.75 shrink-0 items-start gap-2 border-t border-neutral-200 pt-3 break-keep wrap-anywhere typo-body3_regular text-neutral-600 max-[600px]:mt-2 max-[600px]:min-h-15.75 max-[600px]:pt-2.5 max-[355px]:min-h-17.5'>
									<Info size={15} aria-hidden='true' className='mt-0.5 shrink-0' />
									<p>
										{OAUTH_DISCONNECT_NOTICE[provider]}
										{provider === 'GITHUB' && (
											<>
												{' '}
												<br />
												GitHub 설정의 <strong className='typo-body3_semibold'>Applications</strong>에서
												제거할 수 있어요.
											</>
										)}
									</p>
								</div>
							</div>
							<div className='flex shrink-0 justify-end gap-2 pt-3 pb-4.5 max-[600px]:pt-2 max-[600px]:pb-3.5'>
								<button
									ref={cancelRef}
									type='button'
									aria-disabled={isSubmitting}
									onClick={handleCancel}
									className='h-10 rounded-brand-sm border border-neutral-300 bg-neutral-white px-4 typo-button1_semibold text-neutral-700 transition-colors hover:bg-neutral-50 motion-reduce:transition-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-main-blue'
								>
									취소
								</button>
								{isConfirmVisible && (
									<button
										type='button'
										aria-disabled={isConfirmBlocked}
										aria-busy={isSubmitting}
										onClick={handleConfirm}
										className='h-10 rounded-brand-sm bg-danger-800 px-4 typo-button1_semibold text-neutral-white transition-colors hover:bg-danger-900 motion-reduce:transition-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-main-blue'
									>
										{isSubmitting ? '해제 중…' : '연결 해제'}
									</button>
								)}
							</div>
						</div>
					</div>
				</section>
			</div>
		</FocusTrap>,
		document.body
	)
}

export default IntegrationDisconnectModal
