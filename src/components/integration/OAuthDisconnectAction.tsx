import { useRef, useState, type RefObject } from 'react'
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

	const getReturnFocusTarget = () => {
		const opener = openerRef.current
		if (!isDisconnectedRef.current && opener?.isConnected) return opener
		// 해제 직후에는 재조회가 끝날 때까지 이전 카드가 남을 수 있다.
		return document.getElementById('integration-available') ?? false
	}

	return (
		<IntegrationDisconnectModal
			serviceName={service.name}
			provider={provider}
			affectedNotice={preview.affectedNotice}
			resource={preview.resource}
			canConfirm={preview.canConfirm}
			isSubmitting={preview.isSubmitting}
			isConfirmDisabled={preview.isConfirmDisabled}
			deleteError={preview.deleteError}
			getReturnFocusTarget={getReturnFocusTarget}
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
				연결 해제
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
