import type { FallbackProps } from 'react-error-boundary'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	const debugMessage = import.meta.env.DEV && error instanceof Error ? error.message : null

	return (
		<div className='flex flex-col items-center justify-center p-6 bg-danger-100 rounded-lg border border-danger-300'>
			<h2 className='typo-title3_bold text-danger-700 mb-2'>문제가 발생했습니다 🥲</h2>
			<p className='typo-body2_regular text-danger-700 mb-4'>일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.</p>
			{debugMessage ? (
				<pre className='mb-4 whitespace-pre-wrap typo-mono-caption1_regular text-danger-600'>{debugMessage}</pre>
			) : null}
			<button
				type='button'
				onClick={resetErrorBoundary}
				className='px-4 py-2 bg-danger-600 text-white rounded-md hover:bg-danger-700 transition-colors'
			>
				다시 시도하기
			</button>
		</div>
	)
}
