import { createBrowserRouter, RouterProvider } from 'react-router'
import { Layout } from '@/components/layout/Layout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import LandingPage from './pages/LandingPage'
import MainPage from '@/pages/MainPage'
import AuthPage from '@/pages/AuthPage'
import WorkFlowPage from '@/pages/WorkFlowPage'
import InterSettingPage from './pages/InterSettingPage'
import UserPage from './pages/UserPage'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 3,
		},
	},
})

const router = createBrowserRouter([
	{
		path: '/',
		element: <LandingPage />,
	},
	{
		path: '/auth',
		element: <AuthPage />,
	},
	{
		element: <Layout />,
		children: [
			{
				path: '/main',
				element: <MainPage />,
			},
			{
				path: '/workflow',
				element: <WorkFlowPage />,
			},
			{
				path: '/inter-setting',
				element: <InterSettingPage />,
			},
			{
				path: '/user',
				element: <UserPage />,
			},
		],
	},
])

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	)
}

export default App
