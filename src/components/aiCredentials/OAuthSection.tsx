import { ArrowLeftRight, ArrowRight, Link, Unlink, User } from 'lucide-react'
import type { AiProvider, OAuthState } from '@/types/aiCredentials'
import { SectionLabel } from './SectionLabel'

type OAuthEmptyProps = {
	provider: AiProvider
	onConnect: () => void
}

const OAuthEmpty = ({ provider, onConnect }: OAuthEmptyProps) => (
	<button
		type='button'
		onClick={onConnect}
		className='typo-button1_semibold inline-flex h-10 items-center gap-2.5 rounded-lg bg-neutral-100 px-4 text-neutral-900 transition-colors hover:bg-neutral-200'
	>
		<Link size={16} className='text-neutral-500' />
		{provider.name} OAuth로 계정 연결
		<ArrowRight size={14} className='text-neutral-400' />
	</button>
)

type OAuthConnectedProps = {
	state: OAuthState
	onDisconnect: () => void
	onChange: () => void
}

const OAuthConnected = ({ state, onDisconnect, onChange }: OAuthConnectedProps) => (
	<div className='flex items-center gap-3 rounded-lg bg-[#E8F5EE] px-3 py-2.5'>
		<span className='grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/90 text-[11px] font-bold text-main-deep-blue'>
			{state.account?.charAt(0).toUpperCase()}
		</span>
		<span className='typo-body2_semibold flex-1 min-w-0 truncate text-neutral-900'>{state.account}</span>
		<button
			type='button'
			onClick={onChange}
			className='typo-caption1_semibold inline-flex h-7 items-center gap-1 rounded-md border border-[#bfe2d2] bg-white px-2.5 text-neutral-600 shadow-xs hover:bg-neutral-50'
		>
			<ArrowLeftRight size={13} />
			변경
		</button>
		<button
			type='button'
			onClick={onDisconnect}
			className='typo-caption1_semibold inline-flex h-7 items-center gap-1 rounded-md border border-[#bfe2d2] bg-white px-2.5 text-danger-600 shadow-xs hover:bg-danger-50'
		>
			<Unlink size={13} />
			연결 해제
		</button>
	</div>
)

type OAuthSectionProps = {
	provider: AiProvider
	onConnect: () => void
	onDisconnect: () => void
}

export const OAuthSection = ({ provider, onConnect, onDisconnect }: OAuthSectionProps) => {
	const oauth = provider.state.oauth
	const isConnected = oauth?.status === 'connected'

	return (
		<div>
			<SectionLabel icon={<User size={14} />} hint='조직 계정으로 인증하면 키 관리가 필요 없습니다.'>
				OAuth 계정
			</SectionLabel>
			{isConnected && oauth ? (
				<OAuthConnected state={oauth} onDisconnect={onDisconnect} onChange={onConnect} />
			) : (
				<OAuthEmpty provider={provider} onConnect={onConnect} />
			)}
		</div>
	)
}
