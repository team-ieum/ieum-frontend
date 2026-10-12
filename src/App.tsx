import { createBrowserRouter, RouterProvider } from 'react-router'
import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import Modal from '@/components/common/Modal'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createAppQueryClient } from '@/app/createAppQueryClient'
import { appRoutes } from '@/app/routes'
import { disposeExecutionTracking } from '@/services/workflowExecutionManager'

const queryClient = createAppQueryClient()
const router = createBrowserRouter(appRoutes)

function App() {
	useEffect(() => () => disposeExecutionTracking(), [])

	return (
		<QueryClientProvider client={queryClient}>
			{/* OS reduced-motion 설정에서 transform·layout 애니메이션을 제거하고 opacity 전환만 남긴다. */}
			<MotionConfig reducedMotion='user'>
				<RouterProvider router={router} />
				<Modal />
			</MotionConfig>
			{import.meta.env.DEV && import.meta.env.VITE_MEASUREMENT_MODE !== 'true' && (
				<ReactQueryDevtools initialIsOpen={false} />
			)}
		</QueryClientProvider>
	)
}

export default App
