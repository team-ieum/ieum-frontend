import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import DialogFocusTrap from '@/components/common/DialogFocusTrap'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import { OAUTH_DISCONNECT_NOTICE } from '@/constants/integration/oauthDisconnect'
import type { AsyncResourceState } from '@/types/asyncResource'
import type { DisconnectImpact, OAuthDisconnectProvider } from '@/types/oauthDisconnect'
import IntegrationDisconnectImpactList from './IntegrationDisconnectImpactList'

type IntegrationDisconnectModalProps = {
	provider: OAuthDisconnectProvider
	serviceName: string
	impact?: DisconnectImpact
	resource: AsyncResourceState
	/** 이번에 연 확인창에서 전체 목록 조회가 완료된 경우에만 해제를 확인할 수 있다. */
	canConfirm: boolean
	isSubmitting: boolean
	isConfirmDisabled?: boolean
	deleteError?: string
	onCancel: () => void
	onConfirm: () => void
}

const IntegrationDisconnectImpactSkeleton = () => (
	<div role='status' aria-label='영향받는 워크플로우 불러오는 중' aria-busy='true' className='min-h-28 space-y-3'>
		<SkeletonPulse className='h-4 w-2/3 rounded-brand-sm bg-neutral-200' />
		<div className='space-y-3 rounded-brand-md border border-neutral-200 px-3 py-2'>
			<SkeletonPulse className='h-4 w-1/2 rounded-brand-sm bg-neutral-200' />
			<SkeletonPulse className='h-4 w-2/3 rounded-brand-sm bg-neutral-200' />
		</div>
	</div>
)

/** 영향 목록을 다시 조회하거나 펼쳐 보고, 전체 조회가 성공한 뒤에만 해제를 확인한다. */
const IntegrationDisconnectModal = ({
	provider,
	serviceName,
	impact,
	resource,
	canConfirm,
	isSubmitting,
	isConfirmDisabled = false,
	deleteError,
	onCancel,
	onConfirm,
}: IntegrationDisconnectModalProps) => {
	const titleId = useId()
	const noticeId = useId()
	const cancelRef = useRef<HTMLButtonElement>(null)
	const isCheckingImpact = resource.isLoading || resource.isRefetching
	const hasImpactError = resource.isLoadingError || resource.isRefetchError
	const isConfirmBlocked = isSubmitting || isConfirmDisabled
	const handleCancel = () => {
		if (!isSubmitting) onCancel()
	}
	const handleConfirm = () => {
		if (!isConfirmBlocked) onConfirm()
	}

	return createPortal(
		<DialogFocusTrap onEscape={handleCancel} initialFocusRef={cancelRef}>
			<div className='fixed inset-0 z-50 grid place-items-center bg-neutral-900/50 p-3 sm:p-4'>
				<section
					role='alertdialog'
					onKeyDown={event => {
						if (event.key === 'Escape') {
							// 내부에서 처리한 Escape가 바깥 화면의 단축키까지 닫지 않게 한다.
							event.stopPropagation()
							handleCancel()
						}
					}}
					aria-modal='true'
					aria-labelledby={titleId}
					aria-describedby={noticeId}
					className='flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 max-w-lg flex-col gap-4 rounded-brand-lg bg-neutral-white p-4 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:p-6'
				>
					<h2 id={titleId} className='m-0 shrink-0 typo-title2_bold text-neutral-900'>
						{serviceName} 연동 해제
					</h2>
					<div
						role='region'
						aria-label='연동 해제 안내'
						aria-busy={isCheckingImpact}
						tabIndex={impact?.workflows.length ? 0 : undefined}
						className='min-h-0 space-y-3 overflow-y-auto overscroll-contain typo-body3_regular focus-visible:outline-2 focus-visible:outline-main-blue'
					>
						<p id={noticeId} className='text-neutral-600'>
							{OAUTH_DISCONNECT_NOTICE[provider]}
						</p>
						{hasImpactError ? (
							<div role='alert' className='flex min-h-28 flex-col items-start justify-center'>
								<p>영향받는 워크플로우를 모두 확인하지 못했습니다.</p>
								<button
									type='button'
									onClick={resource.retry}
									className='min-h-11 typo-button1_semibold text-main-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
								>
									다시 조회
								</button>
							</div>
						) : resource.isRefetching ? (
							<p role='status' className='typo-caption1_medium text-neutral-600'>
								영향받는 워크플로우를 업데이트하고 있습니다…
							</p>
						) : !impact ? (
							<IntegrationDisconnectImpactSkeleton />
						) : null}
						{impact && <IntegrationDisconnectImpactList impact={impact} />}
					</div>
					{deleteError && (
						<p
							role='alert'
							tabIndex={0}
							className='m-0 max-h-[20dvh] shrink-0 overflow-y-auto [overflow-wrap:anywhere] typo-body3_medium text-danger-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
						>
							{deleteError}
						</p>
					)}
					{isConfirmDisabled && (
						<p role='status' className='m-0 shrink-0 typo-body3_medium'>
							이 연결의 해제 요청이 진행 중입니다.
						</p>
					)}
					<div className='flex shrink-0 flex-wrap justify-end gap-2'>
						{/* 요청 중에는 두 버튼을 탭 순서에 남겨 포커스를 유지하고 핸들러에서 재제출과 취소를 막는다. */}
						<button
							ref={cancelRef}
							type='button'
							aria-disabled={isSubmitting}
							onClick={handleCancel}
							className='min-h-11 rounded-brand-sm border border-neutral-200 px-4 py-2 typo-button1_semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
						>
							취소
						</button>
						{(canConfirm || isSubmitting) && (
							<button
								type='button'
								aria-disabled={isConfirmBlocked}
								aria-busy={isSubmitting}
								onClick={handleConfirm}
								className='min-h-11 rounded-brand-sm bg-danger-800 px-4 py-2 typo-button1_semibold text-neutral-white aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
							>
								{isSubmitting ? '해제 중…' : '연동 해제'}
							</button>
						)}
					</div>
				</section>
			</div>
		</DialogFocusTrap>,
		document.body
	)
}

export default IntegrationDisconnectModal
