/* eslint-disable react-refresh/only-export-components */
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router' // React Router v7 기준
import type { ReactElement, ReactNode } from 'react'

// 1. 기존 RenderOptions에 initialRoute 옵션을 추가하여 확장합니다.
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
	initialRoute?: string
}

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false, // 테스트 속도를 위해 재시도 끄기
			},
		},
	})

// 2. customRender 함수에서 initialRoute를 받아옵니다. (기본값은 '/')
const customRender = (ui: ReactElement, { initialRoute = '/', ...options }: CustomRenderOptions = {}) => {
	const testQueryClient = createTestQueryClient()

	// 3. Provider 배열에 MemoryRouter를 추가합니다.
	const AllTheProviders = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={testQueryClient}>
			<MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
		</QueryClientProvider>
	)

	return render(ui, { wrapper: AllTheProviders, ...options })
}

// testing-library의 모든 것을 export 하고, render만 덮어씌움
export * from '@testing-library/react'
export { customRender as render }
