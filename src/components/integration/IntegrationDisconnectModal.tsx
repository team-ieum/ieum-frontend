import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import DialogFocusTrap from '@/components/common/DialogFocusTrap'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import { OAUTH_DISCONNECT_NOTICE } from '@/constants/integration/oauthDisconnect'
import type { AsyncResourceState } from '@/types/asyncResource'
import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'
import { formatAffectedWorkflowsNotice } from '@/utils/integration/formatAffectedWorkflowsNotice'

type IntegrationDisconnectModalProps = {
	provider: OAuthDisconnectProvider
	serviceName: string
	affectedNotice?: string
	resource: AsyncResourceState
	/** 이번에 연 확인창에서 전체 목록 조회가 완료된 경우에만 해제를 확인할 수 있다. */
	canConfirm: boolean
	isSubmitting: boolean
	isConfirmDisabled?: boolean
	deleteError?: string
	onCancel: () => void
	onConfirm: () => void
}

/** 해제 요청이 끝날 때까지 확인창을 열어 두어 실패 시 같은 버튼에서 재시도할 수 있게 한다. */
const IntegrationDisconnectModal = ({
	provider,
	serviceName,
	affectedNotice,
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
	// 해제 실패와 목록 재조회가 겹쳐도 포커스된 버튼을 남기고 재시도만 막는다.
	const isConfirmVisible = canConfirm || isSubmitting || deleteError !== undefined
	const isConfirmBlocked = !canConfirm || isSubmitting || isConfirmDisabled
	// 요청 중에도 버튼을 탭 순서에 남기기 위해 aria-disabled를 쓰고, 닫기와 재제출은 핸들러에서 막는다.
	const handleCancel = () => {
		if (!isSubmitting) onCancel()
	}
	const handleConfirm = () => {
		if (!isConfirmBlocked) onConfirm()
	}

	return createPortal(
		<DialogFocusTrap onEscape={handleCancel} initialFocusRef={cancelRef}>
			<div className='fixed inset-0 z-50 flex items-center justify-center'>
				<div aria-hidden='true' className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={handleCancel} />
				<section
					role='alertdialog'
					aria-modal='true'
					aria-labelledby={titleId}
					aria-describedby={noticeId}
					onKeyDown={event => {
						if (event.key === 'Escape') {
							// 확인창에서 누른 Escape가 바깥 화면의 단축키까지 실행하지 않게 한다.
							event.stopPropagation()
							handleCancel()
						}
					}}
					className='relative z-10 flex max-h-dvh w-full max-w-sm flex-col rounded-brand-lg bg-neutral-white px-8 py-7 shadow-xl'
				>
					<button
						type='button'
						aria-label='닫기'
						aria-disabled={isSubmitting}
						onClick={handleCancel}
						className='absolute right-4 top-4 text-neutral-400 transition hover:text-neutral-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-main-blue'
					>
						<X size={18} aria-hidden='true' />
					</button>
					<h2 id={titleId} className='mb-3 shrink-0 typo-body1_bold text-danger-700'>
						연결 해제
					</h2>
					<div
						role='region'
						aria-label='연동 해제 안내'
						aria-busy={isCheckingImpact}
						className='min-h-0 overflow-y-auto overscroll-contain [overflow-wrap:anywhere] typo-body2_regular text-neutral-600'
					>
						<p id={noticeId}>
							{serviceName} 연결을 해제할까요? 이 서비스를 사용하는 워크플로우가 동작하지 않을 수 있습니다.{' '}
							{affectedNotice && `${affectedNotice} `}
							{OAUTH_DISCONNECT_NOTICE[provider]}
						</p>
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
							className='mt-2 max-h-[20dvh] shrink-0 overflow-y-auto [overflow-wrap:anywhere] typo-body2_regular text-danger-700 focus-visible:outline-2 focus-visible:outline-main-blue'
						>
							{deleteError}
						</p>
					)}
					{isConfirmDisabled && (
						<p role='status' className='mt-2 typo-body2_regular'>
							연결을 해제하고 있어요.
						</p>
					)}
					<div className='mt-6 flex shrink-0 gap-2'>
						<button
							ref={cancelRef}
							type='button'
							aria-disabled={isSubmitting}
							onClick={handleCancel}
							className='flex-1 rounded-brand-md border border-neutral-200 bg-neutral-white py-2.5 typo-body2_bold text-neutral-600 transition hover:bg-neutral-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-main-blue'
						>
							취소
						</button>
						{isConfirmVisible && (
							<button
								type='button'
								aria-disabled={isConfirmBlocked}
								aria-busy={isSubmitting}
								onClick={handleConfirm}
								className='flex-1 rounded-brand-md bg-danger-700 py-2.5 typo-body2_bold text-neutral-white transition hover:brightness-105 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-main-blue'
							>
								{isSubmitting ? '해제 중…' : '연결 해제'}
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
