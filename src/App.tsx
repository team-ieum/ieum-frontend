import { createBrowserRouter, RouterProvider } from 'react-router'
import { Layout } from './components/layout/Layout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import LandingPage from './pages/LandingPage'
import MainPage from './pages/MainPage'
import AuthPage from './pages/AuthPage'

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
		path: '/main',
		element: <Layout />,
		children: [
			{
				index: true,
				element: <MainPage />,
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
