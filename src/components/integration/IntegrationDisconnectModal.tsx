import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import DialogFocusTrap from '@/components/common/DialogFocusTrap'
import type { DisconnectImpact } from '@/utils/integration/getDisconnectImpact'
import { cn } from '@/utils/cn'

type IntegrationDisconnectModalProps = {
	serviceName: string
	impact?: DisconnectImpact
	loadFailed: boolean
	isSubmitting: boolean
	deleteError?: string
	onRetry: () => void
	onCancel: () => void
	onConfirm: () => void
}

const IntegrationDisconnectModal = ({
	serviceName,
	impact,
	loadFailed,
	isSubmitting,
	deleteError,
	onRetry,
	onCancel,
	onConfirm,
}: IntegrationDisconnectModalProps) => {
	const titleId = useId()
	const cancelRef = useRef<HTMLButtonElement>(null)
	const ready = !!impact && !loadFailed
	const cancel = () => {
		if (!isSubmitting) onCancel()
	}

	return createPortal(
		<DialogFocusTrap onEscape={cancel} initialFocusRef={cancelRef}>
			<div className='fixed inset-0 z-50 grid place-items-center bg-black/50 p-4'>
				<section
					role='alertdialog'
					aria-modal='true'
					aria-labelledby={titleId}
					className='w-full max-w-lg space-y-4 rounded-brand-lg bg-neutral-white p-6 shadow-xl'
				>
					<h2 id={titleId} className='m-0 typo-title2_bold text-neutral-900'>
						{serviceName} 연동 해제
					</h2>
					{loadFailed ? (
						<div role='alert'>
							<p>영향받는 워크플로우를 모두 확인하지 못했습니다.</p>
							<button type='button' onClick={onRetry} className='typo-button1_semibold text-main-blue'>
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
								className='max-h-60 list-none divide-y divide-neutral-100 overflow-y-auto rounded-brand-md border border-neutral-200 p-0'
							>
								{impact.workflows.map(workflow => (
									<li key={workflow.id} className='flex items-center justify-between gap-3 px-3 py-2'>
										<span className={cn('min-w-0 break-words', workflow.isActive && 'font-semibold')}>
											{workflow.name}
										</span>
										<span
											className={cn(
												'shrink-0 typo-caption1_medium',
												workflow.willFailAutomatically && 'text-danger-700'
											)}
										>
											<span>{workflow.isActive ? '활성' : '비활성'}</span>
											{workflow.willFailAutomatically && <strong className='ml-2'>자동 실행 실패</strong>}
										</span>
									</li>
								))}
							</ul>
						</>
					)}
					{deleteError && (
						<p role='alert' className='text-danger-700'>
							{deleteError}
						</p>
					)}
					<div className='flex justify-end gap-2'>
						<button
							ref={cancelRef}
							type='button'
							aria-disabled={isSubmitting}
							onClick={cancel}
							className='rounded-brand-sm border border-neutral-200 px-4 py-2 typo-button1_semibold'
						>
							취소
						</button>
						{ready && (
							<button
								type='button'
								disabled={isSubmitting}
								onClick={onConfirm}
								className='rounded-brand-sm bg-danger-600 px-4 py-2 typo-button1_semibold text-neutral-white disabled:opacity-60'
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
