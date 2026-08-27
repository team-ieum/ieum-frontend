import { createBrowserRouter, RouterProvider } from 'react-router'
import Modal from '@/components/common/Modal'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createAppQueryClient } from '@/app/createAppQueryClient'
import { appRoutes } from '@/app/routes'

const queryClient = createAppQueryClient()
const router = createBrowserRouter(appRoutes)

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<Modal />
			{import.meta.env.DEV && import.meta.env.VITE_MEASUREMENT_MODE !== 'true' && (
				<ReactQueryDevtools initialIsOpen={false} />
			)}
		</QueryClientProvider>
	)
}

export default App
