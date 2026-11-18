import { useRef, useState } from 'react'
import { useIsPresent } from 'framer-motion'
import { Link2Off } from 'lucide-react'
import { isCommonOAuthDisconnectProvider, type CommonOAuthDisconnectProvider } from '@/constants/integration/integrationProviders'
import { INTEGRATION_SERVICES_BUTTON_ID } from '@/constants/integration/statusLabels'
import type { ReturnDialogFocus } from '@/components/common/DialogFocusTrap'
import { useOAuthDisconnectPreview } from '@/hooks/integration/useOAuthDisconnectPreview'
import type { IntegrationService } from '@/types/integration'
import IntegrationDisconnectModal from './IntegrationDisconnectModal'

type OAuthDisconnectDialogProps = {
	service: IntegrationService
	provider: CommonOAuthDisconnectProvider
	onClose: () => void
}

const OAuthDisconnectDialog = ({ service, provider, onClose }: OAuthDisconnectDialogProps) => {
	const disconnected = useRef(false)
	const preview = useOAuthDisconnectPreview({
		provider,
		connectionId: service.id,
		onCancel: onClose,
		onDisconnected: () => {
			disconnected.current = true
			onClose()
		},
	})
	// 해제된 카드의 버튼은 목록 갱신 때 사라진다. 취소한 경우에만 연 버튼으로 돌아간다.
	const getReturnFocus: ReturnDialogFocus = opener =>
		!disconnected.current && opener.isConnected ? opener : (document.getElementById(INTEGRATION_SERVICES_BUTTON_ID) ?? false)
	return (
		<IntegrationDisconnectModal serviceName={service.name} provider={provider} getReturnFocus={getReturnFocus} {...preview} />
	)
}

/** 목록과 상세에서 같은 대상의 전체 영향을 확인한 뒤 해제하도록 한다. */
const OAuthDisconnectAction = ({ service }: { service: IntegrationService }) => {
	const [open, setOpen] = useState(false)
	const isPresent = useIsPresent()
	const provider = service.oauthProvider
	if (!isPresent || service.origin !== 'oauth' || !provider || !isCommonOAuthDisconnectProvider(provider)) return null

	return (
		<>
			<button
				type='button'
				onClick={() => setOpen(true)}
				className='inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-brand-sm border border-danger-300 bg-neutral-white px-3 typo-body3_semibold text-danger-700 hover:bg-danger-50 focus-visible:outline-2 focus-visible:outline-main-blue'
			>
				<Link2Off size={15} aria-hidden='true' />
				연동 해제
			</button>
			{open && (
				<OAuthDisconnectDialog key={service.id} service={service} provider={provider} onClose={() => setOpen(false)} />
			)}
		</>
	)
}

export default OAuthDisconnectAction
