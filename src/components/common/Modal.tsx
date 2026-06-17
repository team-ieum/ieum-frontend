import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useModalStore } from '@/stores/useModalStore'
import { cn } from '@/utils/cn'

const Modal = () => {
	const { isOpen, title, message, confirmText, cancelText, variant, onConfirm, close } = useModalStore()
	const isConfirm = onConfirm !== undefined

	const handleConfirm = () => {
		onConfirm?.()
		close()
	}

	return createPortal(
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className='fixed inset-0 z-50 flex items-center justify-center'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.18, ease: 'easeOut' }}
				>
					<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={close} />

					<motion.div
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
								className={cn(
									'typo-body1_bold mb-3',
									variant === 'danger' ? 'text-danger-700' : 'text-main-deep-blue'
								)}
							>
								{title}
							</h2>
						)}
						<p className='typo-body2_regular text-neutral-600'>{message}</p>

						{isConfirm ? (
							<div className='mt-6 flex gap-2'>
								<button
									type='button'
									onClick={close}
									className='flex-1 rounded-brand-md border border-neutral-200 bg-neutral-white py-2.5 typo-body2_bold text-neutral-600 transition hover:bg-neutral-50'
								>
									{cancelText}
								</button>
								<button
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
								type='button'
								onClick={close}
								className='mt-6 w-full rounded-brand-md bg-main-blue py-2.5 typo-body2_bold text-neutral-white transition hover:brightness-105'
							>
								확인
							</button>
						)}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	)
}

export default Modal
