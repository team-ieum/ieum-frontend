import { createBrowserRouter, RouterProvider } from 'react-router'
import Modal from '@/components/common/Modal'
import { Layout } from '@/components/layout/Layout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import LandingPage from './pages/LandingPage'
import MainPage from '@/pages/MainPage'
import AuthPage from '@/pages/AuthPage'
import WorkFlowPage from '@/pages/WorkFlowPage'
import WorkflowListPage from '@/pages/WorkflowListPage'
import InterSettingPage from './pages/InterSettingPage'
import IntegrationOAuthCallbackPage from './pages/IntegrationOAuthCallbackPage'
import ApiPathRedirectPage from './pages/ApiPathRedirectPage'
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
		path: '/api/*',
		element: <ApiPathRedirectPage />,
	},
	{
		path: '/oauth/*',
		element: <IntegrationOAuthCallbackPage />,
	},
	{
		path: '/oauth2/*',
		element: <IntegrationOAuthCallbackPage />,
	},
	{
		element: <Layout />,
		children: [
			{
				path: 'main',
				element: <MainPage />,
			},
			{
				path: 'workflow',
				element: <WorkflowListPage />,
			},
			{
				path: 'workflow/new',
				element: <WorkFlowPage />,
			},
			{
				path: 'workflow/:workflowId',
				element: <WorkFlowPage />,
			},
			{
				path: 'inter-setting',
				element: <InterSettingPage />,
			},
			{
				path: 'user',
				element: <UserPage />,
			},
		],
	},
])

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<Modal />
			{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	)
}

export default App
