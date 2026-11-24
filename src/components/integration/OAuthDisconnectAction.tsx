import { useRef, useState, type RefObject } from 'react'
import { useIsPresent } from 'framer-motion'
import { getOAuthDisconnectConfig } from '@/constants/integration/integrationProviders'
import { useOAuthDisconnectPreview } from '@/hooks/integration/useOAuthDisconnectPreview'
import type { IntegrationService } from '@/types/integration'
import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'
import IntegrationDisconnectButton from './IntegrationDisconnectButton'
import IntegrationDisconnectModal from './IntegrationDisconnectModal'

type OAuthDisconnectDialogProps = {
	service: IntegrationService
	provider: OAuthDisconnectProvider
	openerRef: RefObject<HTMLButtonElement | null>
	onClose: () => void
	onDisconnected: () => void
}

const OAuthDisconnectDialog = ({ service, provider, openerRef, onClose, onDisconnected }: OAuthDisconnectDialogProps) => {
	const wasCancelledRef = useRef(false)
	const preview = useOAuthDisconnectPreview({
		provider,
		connectionId: service.id,
		onCancel: () => {
			wasCancelledRef.current = true
			onClose()
		},
		onDisconnected,
	})

	const getReturnFocusTarget = () => {
		const opener = openerRef.current
		// 성공하면 상세가 사라지므로 목록이 열린 뒤 페이지에서 포커스를 복원한다.
		return wasCancelledRef.current && opener?.isConnected ? opener : false
	}

	return (
		<IntegrationDisconnectModal
			service={service}
			provider={provider}
			impact={preview.impact}
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
	onDisconnected: () => void
}

/** 상세에서 Notion·GitHub 해제의 영향을 확인하고 성공하면 목록으로 돌아간다. */
const OAuthDisconnectAction = ({ service, onDisconnected }: OAuthDisconnectActionProps) => {
	const [isOpen, setIsOpen] = useState(false)
	const openerRef = useRef<HTMLButtonElement>(null)
	const isPresent = useIsPresent()
	const provider = getOAuthDisconnectConfig(service.oauthProvider)?.previewProvider
	if (!isPresent || service.origin !== 'oauth' || !provider) return null

	return (
		<>
			<IntegrationDisconnectButton buttonRef={openerRef} onClick={() => setIsOpen(true)} />
			{isOpen && (
				<OAuthDisconnectDialog
					key={service.id}
					service={service}
					provider={provider}
					openerRef={openerRef}
					onClose={() => setIsOpen(false)}
					onDisconnected={onDisconnected}
				/>
			)}
		</>
	)
}

export default OAuthDisconnectAction
