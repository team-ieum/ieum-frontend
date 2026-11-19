import { useEffect, useRef, useState, type RefObject } from 'react'
import { useIsPresent } from 'framer-motion'
import { Link2Off } from 'lucide-react'
import { isOAuthDisconnectProvider } from '@/constants/integration/oauthDisconnect'
import { useOAuthDisconnectPreview } from '@/hooks/integration/useOAuthDisconnectPreview'
import type { IntegrationService } from '@/types/integration'
import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'
import IntegrationDisconnectModal from './IntegrationDisconnectModal'

type OAuthDisconnectDialogProps = {
	service: IntegrationService
	provider: OAuthDisconnectProvider
	openerRef: RefObject<HTMLButtonElement | null>
	onClose: () => void
}

const OAuthDisconnectDialog = ({ service, provider, openerRef, onClose }: OAuthDisconnectDialogProps) => {
	const isDisconnectedRef = useRef(false)
	const preview = useOAuthDisconnectPreview({
		provider,
		connectionId: service.id,
		onCancel: onClose,
		onDisconnected: () => {
			isDisconnectedRef.current = true
			onClose()
		},
	})

	useEffect(() => {
		const opener = openerRef.current
		const availableServices = document.getElementById('integration-available')
		return () => {
			// 해제 성공 후에는 열었던 카드가 사라지므로, trap이 해제되면 다시 연결할 수 있는 영역에 포커스를 둔다.
			const hasLostOpener = !opener?.isConnected && document.activeElement === document.body
			if (availableServices?.isConnected && (isDisconnectedRef.current || hasLostOpener)) availableServices.focus()
		}
	}, [openerRef])

	return (
		<IntegrationDisconnectModal
			serviceName={service.name}
			provider={provider}
			impact={preview.impact}
			resource={preview.resource}
			canConfirm={preview.canConfirm}
			isSubmitting={preview.isSubmitting}
			isConfirmDisabled={preview.isConfirmDisabled}
			deleteError={preview.deleteError}
			onCancel={preview.handleCancel}
			onConfirm={preview.handleConfirm}
		/>
	)
}

type OAuthDisconnectActionProps = {
	service: IntegrationService
}

/** 연결 목록에서 Notion·GitHub의 전체 영향을 확인한 뒤 해제한다. */
const OAuthDisconnectAction = ({ service }: OAuthDisconnectActionProps) => {
	const [isOpen, setIsOpen] = useState(false)
	const openerRef = useRef<HTMLButtonElement>(null)
	const isPresent = useIsPresent()
	const provider = service.oauthProvider
	if (!isPresent || service.origin !== 'oauth' || !provider || !isOAuthDisconnectProvider(provider)) return null

	return (
		<>
			<button
				ref={openerRef}
				type='button'
				aria-haspopup='dialog'
				onClick={() => setIsOpen(true)}
				className='mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-brand-sm border border-danger-300 bg-neutral-white px-3 typo-body3_semibold text-danger-800 hover:bg-danger-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
			>
				<Link2Off size={15} aria-hidden='true' />
				연동 해제
			</button>
			{isOpen && (
				<OAuthDisconnectDialog
					key={service.id}
					service={service}
					provider={provider}
					openerRef={openerRef}
					onClose={() => setIsOpen(false)}
				/>
			)}
		</>
	)
}

export default OAuthDisconnectAction
