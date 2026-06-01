import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { WEBHOOK_CONNECT_CONFIG, type WebhookConnectServiceId } from '@/constants/integration/webhookCredentialConnect'
import { getBrandConfig } from '@/constants/integration/brandConfig'
import type { WebhookCredentialFormValues } from '@/hooks/integration/useWebhookCredentialConnect'
import { cn } from '@/utils/cn'

type WebhookCredentialConnectModalProps = {
	serviceId: WebhookConnectServiceId
	onClose: () => void
	onSubmit: (values: WebhookCredentialFormValues) => void | Promise<void>
	isPending: boolean
}

const WebhookCredentialConnectModal = ({ serviceId, onClose, onSubmit, isPending }: WebhookCredentialConnectModalProps) => {
	const config = WEBHOOK_CONNECT_CONFIG[serviceId]
	const brand = getBrandConfig(config.brand)

	const [displayName, setDisplayName] = useState('')
	const [webhookUrl, setWebhookUrl] = useState('')
	const [defaultChannel, setDefaultChannel] = useState('')

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault()
		void onSubmit({ displayName, webhookUrl, defaultChannel })
	}

	return createPortal(
		<AnimatePresence>
			<motion.div
				className='fixed inset-0 z-50 flex items-center justify-center p-4'
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
			>
				<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} aria-hidden />

				<motion.div
					role='dialog'
					aria-modal
					aria-labelledby='webhook-connect-title'
					className='relative z-10 w-full max-w-md rounded-brand-lg bg-neutral-white shadow-xl'
					initial={{ opacity: 0, scale: 0.96 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.96 }}
				>
					<div className='flex items-start gap-3 border-b border-neutral-100 px-6 py-5'>
						<span className='grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-50'>{brand.icon}</span>
						<div className='min-w-0 flex-1 pr-6'>
							<h2 id='webhook-connect-title' className='typo-body1_bold m-0 text-neutral-900'>
								{config.title}
							</h2>
							<p className='typo-caption1_regular m-0 mt-1 text-neutral-500'>
								Incoming Webhook URL로 메시지를 보냅니다. OAuth가 아닙니다.
							</p>
						</div>
						<button
							type='button'
							onClick={onClose}
							className='absolute right-4 top-4 text-neutral-400 hover:text-neutral-700'
							aria-label='닫기'
						>
							<X size={18} />
						</button>
					</div>

					<form onSubmit={handleSubmit} className='space-y-4 px-6 py-5'>
						<Field
							label={config.fields.displayName.label}
							hint={config.fields.displayName.hint}
							value={displayName}
							onChange={setDisplayName}
							placeholder={config.fields.displayName.placeholder}
							required
						/>
						<Field
							label={config.fields.webhookUrl.label}
							hint={config.fields.webhookUrl.hint}
							value={webhookUrl}
							onChange={setWebhookUrl}
							placeholder={config.fields.webhookUrl.placeholder}
							required
							mono
						/>
						<Field
							label={config.fields.defaultChannel.label}
							hint={config.fields.defaultChannel.hint}
							value={defaultChannel}
							onChange={setDefaultChannel}
							placeholder={config.fields.defaultChannel.placeholder}
						/>

						<div className='flex gap-2 pt-2'>
							<button
								type='button'
								onClick={onClose}
								className='typo-button1_semibold h-10 flex-1 rounded-brand-md border border-neutral-200 bg-neutral-white text-neutral-700 hover:bg-neutral-50'
							>
								취소
							</button>
							<button
								type='submit'
								disabled={isPending}
								className={cn(
									'typo-button1_semibold h-10 flex-1 rounded-brand-md text-neutral-white',
									isPending ? 'cursor-not-allowed bg-neutral-300' : 'bg-main-blue hover:bg-main-deep-blue'
								)}
							>
								{isPending ? '연결 중…' : '연결하기'}
							</button>
						</div>
					</form>
				</motion.div>
			</motion.div>
		</AnimatePresence>,
		document.body
	)
}

type FieldProps = {
	label: string
	hint: string
	value: string
	onChange: (value: string) => void
	placeholder: string
	required?: boolean
	mono?: boolean
}

const Field = ({ label, hint, value, onChange, placeholder, required, mono }: FieldProps) => (
	<div>
		<label className='typo-caption1_semibold mb-1 block text-neutral-800'>
			{label}
			{required ? <span className='text-red-500'> *</span> : null}
		</label>
		<input
			type='text'
			value={value}
			onChange={e => onChange(e.target.value)}
			placeholder={placeholder}
			required={required}
			className={cn(
				'h-10 w-full rounded-brand-sm border border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-main-blue focus:bg-white focus:ring-1 focus:ring-main-blue/20',
				mono && 'font-mono text-[12px]'
			)}
		/>
		<p className='typo-caption1_regular m-0 mt-1 text-neutral-500'>{hint}</p>
	</div>
)

export default WebhookCredentialConnectModal
