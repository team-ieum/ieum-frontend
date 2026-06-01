import type { AiProvider } from '@/types/aiCredentials'
import { MethodBadge } from './MethodBadge'
import { StatusChip } from './StatusChip'
import { ApiKeySection } from './ApiKeySection'
import { OAuthSection } from './OAuthSection'

const isProviderConnected = (p: AiProvider) => Object.values(p.state).some(s => s?.status === 'connected')

type ProviderCardProps = {
	provider: AiProvider
	onRegisterApiKey: (key: string) => void
	onDeleteApiKey: () => void
	onConnectOAuth: () => void
	onDisconnectOAuth: () => void
	isPending?: boolean
}

export const ProviderCard = ({
	provider,
	onRegisterApiKey,
	onDeleteApiKey,
	onConnectOAuth,
	onDisconnectOAuth,
	isPending,
}: ProviderCardProps) => {
	const connected = isProviderConnected(provider)
	const hasBoth = provider.methods.length > 1

	return (
		<article className='overflow-hidden rounded-2xl bg-white shadow-[0_2.76px_4.14px_-1.38px_rgba(16,24,40,0.03),0_8.28px_11.03px_-2.76px_rgba(16,24,40,0.08)]'>
			{/* Header */}
			<header className='flex items-center gap-4 px-6 pb-4 pt-5'>
				<div className='flex min-w-0 flex-1 flex-col gap-1'>
					<div className='flex items-center gap-2.5'>
						<h3 className='typo-title3_bold text-neutral-900'>{provider.name}</h3>
						<div className='flex gap-1.5'>
							{provider.methods.map(m => (
								<MethodBadge key={m} method={m} />
							))}
						</div>
					</div>
					<span className='typo-body3_regular text-neutral-500'>{provider.desc}</span>
				</div>
				<StatusChip connected={connected} />
			</header>

			{/* Body */}
			<div className='flex flex-col gap-[18px] px-6 py-5'>
				{provider.methods.includes('apikey') && (
					<ApiKeySection
						provider={provider}
						onRegister={onRegisterApiKey}
						onDelete={onDeleteApiKey}
						isPending={isPending}
					/>
				)}

				{hasBoth && (
					<div className='flex items-center gap-3'>
						<span className='h-px flex-1 bg-neutral-200' />
						<span className='typo-caption1_medium text-neutral-500'>또는</span>
						<span className='h-px flex-1 bg-neutral-200' />
					</div>
				)}

				{provider.methods.includes('oauth') && (
					<OAuthSection provider={provider} onConnect={onConnectOAuth} onDisconnect={onDisconnectOAuth} />
				)}
			</div>
		</article>
	)
}
