import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FocusTrap } from 'focus-trap-react'
import { OAUTH_DISCONNECT_NOTICE, type OAuthDisconnectProvider } from '@/constants/integration/oauthDisconnect'
import type { DisconnectImpact } from '@/utils/integration/getDisconnectImpact'
import { cn } from '@/utils/cn'

export type ReturnDialogFocus = (opener: HTMLElement | SVGElement) => HTMLElement | SVGElement | false

type IntegrationDisconnectModalProps = {
	provider: OAuthDisconnectProvider
	serviceName: string
	impact?: DisconnectImpact
	loadFailed: boolean
	isSubmitting: boolean
	confirmDisabled?: boolean
	getReturnFocus?: ReturnDialogFocus
	deleteError?: string
	onRetry: () => void
	onCancel: () => void
	onConfirm: () => void
}

const IntegrationDisconnectModal = ({
	provider,
	serviceName,
	impact,
	loadFailed,
	isSubmitting,
	confirmDisabled = false,
	getReturnFocus,
	deleteError,
	onRetry,
	onCancel,
	onConfirm,
}: IntegrationDisconnectModalProps) => {
	const titleId = useId()
	const noticeId = useId()
	const cancelRef = useRef<HTMLButtonElement>(null)
	const ready = !!impact && !loadFailed
	const cancel = () => {
		if (!isSubmitting) onCancel()
	}

	return createPortal(
		<FocusTrap
			focusTrapOptions={{
				initialFocus: () => cancelRef.current ?? false,
				setReturnFocus: getReturnFocus,
				escapeDeactivates: false,
			}}
		>
			<div className='fixed inset-0 z-50 grid place-items-center bg-black/50 p-3 sm:p-4'>
				<section
					role='alertdialog'
					onKeyDown={event => {
						if (event.key === 'Escape') {
							event.stopPropagation()
							cancel()
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
						tabIndex={impact?.workflows.length ? 0 : undefined}
						className='min-h-0 space-y-3 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-main-blue'
					>
						<p id={noticeId} className='typo-body3_regular text-neutral-600'>
							{OAUTH_DISCONNECT_NOTICE[provider]}
						</p>
						{loadFailed ? (
							<div role='alert'>
								<p>영향받는 워크플로우를 모두 확인하지 못했습니다.</p>
								<button
									type='button'
									onClick={onRetry}
									className='min-h-11 typo-button1_semibold text-main-blue focus-visible:outline-2 focus-visible:outline-main-blue'
								>
									다시 조회
								</button>
							</div>
						) : !impact ? (
							<p role='status' className='typo-body3_regular'>
								영향받는 워크플로우를 확인하고 있습니다…
							</p>
						) : impact.workflows.length === 0 ? (
							<p>연동을 해제하시겠습니까?</p>
						) : (
							<>
								<p>아래 워크플로우 {impact.workflows.length}개는 연동을 해제하면 정상적으로 동작하지 않습니다.</p>
								{impact.automaticCount > 0 && (
									<p className='typo-body3_semibold text-danger-700'>
										자동 실행 중인 {impact.automaticCount}개는 해제 후에도 활성 상태로 남아 실행할 때마다
										실패합니다.
									</p>
								)}
								<ul
									aria-label='영향받는 워크플로우'
									className='list-none divide-y divide-neutral-100 rounded-brand-md border border-neutral-200 p-0'
								>
									{impact.workflows.map(workflow => (
										<li key={workflow.id} className='flex items-center justify-between gap-3 px-3 py-2'>
											<span
												className={cn(
													'min-w-0 [overflow-wrap:anywhere]',
													workflow.isActive && 'font-semibold'
												)}
											>
												{workflow.name}
											</span>
											<span
												className={cn(
													'shrink-0 typo-caption1_medium',
													workflow.willFailAutomatically && 'text-danger-700'
												)}
											>
												<span>{workflow.isActive ? '활성' : '비활성'}</span>
												{workflow.willFailAutomatically && (
													<strong className='ml-2'>자동 실행 실패</strong>
												)}
											</span>
										</li>
									))}
								</ul>
							</>
						)}
					</div>
					{deleteError && (
						<p
							role='alert'
							tabIndex={0}
							className='m-0 max-h-[20dvh] shrink-0 overflow-y-auto [overflow-wrap:anywhere] typo-body3_medium text-danger-700'
						>
							{deleteError}
						</p>
					)}
					{confirmDisabled && (
						<p role='status' className='m-0 shrink-0 typo-body3_medium'>
							이 연결의 해제 요청이 진행 중입니다.
						</p>
					)}
					<div className='flex shrink-0 flex-wrap justify-end gap-2'>
						<button
							ref={cancelRef}
							type='button'
							aria-disabled={isSubmitting}
							onClick={cancel}
							className='min-h-11 rounded-brand-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue border border-neutral-200 px-4 py-2 typo-button1_semibold'
						>
							취소
						</button>
						{ready && (
							<button
								type='button'
								disabled={isSubmitting || confirmDisabled}
								onClick={onConfirm}
								className='min-h-11 rounded-brand-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue bg-danger-600 px-4 py-2 typo-button1_semibold text-neutral-white disabled:opacity-60'
							>
								{isSubmitting ? '해제 중…' : '연동 해제'}
							</button>
						)}
					</div>
				</section>
			</div>
		</FocusTrap>,
		document.body
	)
}

export default IntegrationDisconnectModal
