import type { Ref } from 'react'
import { Link2Off } from 'lucide-react'

type IntegrationDisconnectButtonProps = {
	onClick: () => void
	disabled: boolean
	isDisconnecting?: boolean
	isCheckingDisconnect?: boolean
	buttonRef?: Ref<HTMLButtonElement>
}

const IntegrationDisconnectButton = ({
	onClick,
	disabled,
	isDisconnecting = false,
	isCheckingDisconnect = false,
	buttonRef,
}: IntegrationDisconnectButtonProps) => (
	<button
		ref={buttonRef}
		aria-haspopup='dialog'
		type='button'
		onClick={onClick}
		disabled={disabled}
		className='inline-flex h-9 items-center gap-1.5 rounded-brand-sm border border-danger-300 bg-danger-50 px-4 typo-body3_semibold text-danger-700 transition-colors hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-60'
	>
		<Link2Off size={15} aria-hidden='true' />
		{isDisconnecting ? '해제 중…' : isCheckingDisconnect ? '확인 중…' : '연결 해제'}
	</button>
)

export default IntegrationDisconnectButton
