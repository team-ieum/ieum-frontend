import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import DialogFocusTrap from '@/components/common/DialogFocusTrap'
import { useModalStore } from '@/stores/useModalStore'
import { cn } from '@/utils/cn'

const Modal = () => {
	const { isOpen, title, message, confirmText, cancelText, variant, onConfirm, close } = useModalStore()
	const isConfirm = onConfirm !== undefined
	const titleId = useId()
	const messageId = useId()
	const cancelButtonRef = useRef<HTMLButtonElement>(null)
	const primaryButtonRef = useRef<HTMLButtonElement>(null)
	// 위험한 확인은 실수로 Enter를 눌러도 실행되지 않도록 취소에서 시작한다.
	const initialFocusRef = isConfirm && variant === 'danger' ? cancelButtonRef : primaryButtonRef

	const handleConfirm = () => {
		onConfirm?.()
		close()
	}

	return createPortal(
		<AnimatePresence>
			{isOpen && (
				<DialogFocusTrap onEscape={close} initialFocusRef={initialFocusRef}>
					<motion.div
						className='fixed inset-0 z-50 flex items-center justify-center'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18, ease: 'easeOut' }}
					>
						<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={close} aria-hidden />

						<motion.div
							role={isConfirm ? 'alertdialog' : 'dialog'}
							aria-modal
							aria-labelledby={title ? titleId : undefined}
							aria-label={title ? undefined : isConfirm ? '확인' : '알림'}
							aria-describedby={messageId}
							className='relative z-10 w-full max-w-sm rounded-brand-lg bg-neutral-white px-8 py-7 shadow-xl'
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							transition={{ duration: 0.18, ease: 'easeOut' }}
						>
							<button
								type='button'
								onClick={close}
								className='absolute right-4 top-4 text-neutral-400 transition hover:text-neutral-700'
								aria-label='닫기'
							>
								<X size={18} />
							</button>

							{title && (
								<h2
									id={titleId}
									className={cn(
										'typo-body1_bold mb-3',
										variant === 'danger' ? 'text-danger-700' : 'text-main-deep-blue'
									)}
								>
									{title}
								</h2>
							)}
							<p id={messageId} className='typo-body2_regular text-neutral-600'>
								{message}
							</p>

							{isConfirm ? (
								<div className='mt-6 flex gap-2'>
									<button
										ref={cancelButtonRef}
										type='button'
										onClick={close}
										className='flex-1 rounded-brand-md border border-neutral-200 bg-neutral-white py-2.5 typo-body2_bold text-neutral-600 transition hover:bg-neutral-50'
									>
										{cancelText}
									</button>
									<button
										ref={primaryButtonRef}
										type='button'
										onClick={handleConfirm}
										className={cn(
											'flex-1 rounded-brand-md py-2.5 typo-body2_bold text-neutral-white transition hover:brightness-105',
											variant === 'danger' ? 'bg-danger-700' : 'bg-main-blue'
										)}
									>
										{confirmText}
									</button>
								</div>
							) : (
								<button
									ref={primaryButtonRef}
									type='button'
									onClick={close}
									className='mt-6 w-full rounded-brand-md bg-main-blue py-2.5 typo-body2_bold text-neutral-white transition hover:brightness-105'
								>
									확인
								</button>
							)}
						</motion.div>
					</motion.div>
				</DialogFocusTrap>
			)}
		</AnimatePresence>,
		document.body
	)
}

export default Modal
