import { useState } from 'react'
import { Link2Off } from 'lucide-react'
import { isCommonOAuthDisconnectProvider, type CommonOAuthDisconnectProvider } from '@/constants/integration/integrationProviders'
import { useOAuthDisconnectPreview } from '@/hooks/integration/useOAuthDisconnectPreview'
import type { IntegrationService } from '@/types/integration'
import IntegrationDisconnectModal from './IntegrationDisconnectModal'

type OAuthDisconnectDialogProps = {
	service: IntegrationService
	provider: CommonOAuthDisconnectProvider
	onClose: () => void
}

const OAuthDisconnectDialog = ({ service, provider, onClose }: OAuthDisconnectDialogProps) => {
	const preview = useOAuthDisconnectPreview({ provider, connectionId: service.id, onDisconnected: onClose })
	return <IntegrationDisconnectModal serviceName={service.name} provider={provider} onCancel={onClose} {...preview} />
}

/** 목록과 상세에서 같은 대상의 전체 영향을 확인한 뒤 해제하도록 한다. */
const OAuthDisconnectAction = ({ service }: { service: IntegrationService }) => {
	const [open, setOpen] = useState(false)
	const provider = service.oauthProvider
	if (service.origin !== 'oauth' || !provider || !isCommonOAuthDisconnectProvider(provider)) return null

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
