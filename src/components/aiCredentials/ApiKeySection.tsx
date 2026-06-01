import { useState } from 'react'
import { Check, Eye, EyeOff, Key, RefreshCw, Trash2 } from 'lucide-react'
import type { AiProvider, ApiKeyState } from '@/types/aiCredentials'
import { cn } from '@/utils/cn'
import { SectionLabel } from './SectionLabel'

type ApiKeyEmptyProps = {
	provider: AiProvider
	onRegister: (key: string) => void
	isPending?: boolean
}

const ApiKeyEmpty = ({ provider, onRegister, isPending }: ApiKeyEmptyProps) => {
	const [value, setValue] = useState('')
	const [show, setShow] = useState(false)

	return (
		<div className='flex gap-2'>
			<label className='flex h-10 flex-1 cursor-text items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 focus-within:border-main-blue focus-within:bg-white focus-within:ring-1 focus-within:ring-main-blue/20'>
				<Key size={14} className='shrink-0 text-neutral-400' />
				<input
					type={show ? 'text' : 'password'}
					value={value}
					onChange={e => setValue(e.target.value)}
					placeholder={`${provider.name} API Key를 입력하세요 (sk-… 형식)`}
					className='flex-1 bg-transparent font-mono text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400'
				/>
				<button
					type='button'
					onClick={() => setShow(s => !s)}
					aria-label={show ? '키 가리기' : '키 보이기'}
					className='rounded p-1 text-neutral-400 hover:text-neutral-600'
				>
					{show ? <EyeOff size={16} /> : <Eye size={16} />}
				</button>
			</label>
			<button
				type='button'
				onClick={() => {
					if (value && !isPending) onRegister(value)
				}}
				disabled={!value || isPending}
				className={cn(
					'typo-button1_semibold h-10 rounded-lg px-4 transition-colors',
					value && !isPending
						? 'bg-main-blue text-white hover:bg-main-deep-blue'
						: 'cursor-not-allowed bg-neutral-100 text-neutral-400'
				)}
			>
				{isPending ? '등록 중…' : '등록'}
			</button>
		</div>
	)
}

type ApiKeyConnectedProps = {
	state: ApiKeyState
	onDelete: () => void
	onReplace: () => void
}

const ApiKeyConnected = ({ state, onDelete, onReplace }: ApiKeyConnectedProps) => (
	<div className='flex items-center gap-3 rounded-lg bg-[#E8F5EE] px-3 py-2.5'>
		<span className='grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/90'>
			<Check size={14} className='text-node-green' />
		</span>
		<span className='truncate font-mono text-[13px] font-medium text-neutral-900 flex-1 min-w-0'>{state.keyHint}</span>
		<button
			type='button'
			onClick={onReplace}
			className='typo-caption1_semibold inline-flex h-7 items-center gap-1 rounded-md border border-[#bfe2d2] bg-white px-2.5 text-neutral-600 shadow-xs hover:bg-neutral-50'
		>
			<RefreshCw size={13} />
			교체
		</button>
		<button
			type='button'
			onClick={onDelete}
			className='typo-caption1_semibold inline-flex h-7 items-center gap-1 rounded-md border border-[#bfe2d2] bg-white px-2.5 text-danger-600 shadow-xs hover:bg-danger-50'
		>
			<Trash2 size={13} />
			삭제
		</button>
	</div>
)

type ApiKeySectionProps = {
	provider: AiProvider
	onRegister: (key: string) => void
	onDelete: () => void
	isPending?: boolean
}

export const ApiKeySection = ({ provider, onRegister, onDelete, isPending }: ApiKeySectionProps) => {
	const [replacing, setReplacing] = useState(false)
	const apikey = provider.state.apikey
	const isConnected = apikey?.status === 'connected' && !replacing

	const handleReplace = () => setReplacing(true)
	const handleRegister = (key: string) => {
		onRegister(key)
		setReplacing(false)
	}

	return (
		<div>
			<SectionLabel icon={<Key size={14} />} hint='키는 암호화되어 저장되며, 일부만 표시됩니다.'>
				API Key
			</SectionLabel>
			{isConnected && apikey ? (
				<ApiKeyConnected state={apikey} onDelete={onDelete} onReplace={handleReplace} />
			) : (
				<ApiKeyEmpty provider={provider} onRegister={handleRegister} isPending={isPending} />
			)}
		</div>
	)
}
