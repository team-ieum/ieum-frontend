import type { ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ChunkLoadError } from '@/app/createPreloadableLazy'

type ChunkLoadErrorBoundaryProps = {
	children: ReactNode
	/** chunk 로드 실패 시 이 영역에 표시할 안내. 새로고침 callback을 받는다. */
	renderFallback: (reload: () => void) => ReactNode
}

// React.lazy는 렌더 중 실패한 import 결과를 유지해 boundary를 reset해도 같은 오류를 다시 던진다. 새 document에서 다시 받도록 새로고침한다.
const reloadDocument = () => window.location.reload()

/** lazy chunk 로드 실패를 이 영역 안에서 안내한다. chunk 로드 외 오류는 상위 오류 처리로 다시 던진다. */
export const ChunkLoadErrorBoundary = ({ children, renderFallback }: ChunkLoadErrorBoundaryProps) => (
	<ErrorBoundary
		fallbackRender={({ error }) => {
			if (!(error instanceof ChunkLoadError)) {
				throw error
			}
			return renderFallback(reloadDocument)
		}}
	>
		{children}
	</ErrorBoundary>
)
