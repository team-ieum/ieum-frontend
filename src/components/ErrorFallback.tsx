import type { FallbackProps } from 'react-error-boundary'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	const debugMessage = import.meta.env.DEV && error instanceof Error ? error.message : null

	return (
		<div className='flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg border border-red-200'>
			<h2 className='text-lg font-bold text-red-700 mb-2'>문제가 발생했습니다 🥲</h2>
			<p className='text-sm text-red-600 mb-4'>일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.</p>
			{debugMessage ? <pre className='mb-4 whitespace-pre-wrap text-xs text-red-500'>{debugMessage}</pre> : null}
			<button
				type='button'
				onClick={resetErrorBoundary}
				className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors'
			>
				다시 시도하기
			</button>
		</div>
	)
}
