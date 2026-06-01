import type { AuthMethod } from '@/types/aiCredentials'

type MethodBadgeProps = {
	method: AuthMethod
}

export const MethodBadge = ({ method }: MethodBadgeProps) => {
	const label = method === 'apikey' ? 'API Key' : 'OAuth'
	return (
		<span className='typo-caption1_medium inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-neutral-500'>
			{label}
		</span>
	)
}
