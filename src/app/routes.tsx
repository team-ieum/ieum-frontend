import type { RouteObject } from 'react-router'
import { Layout } from '@/components/layout/Layout'
import ProtectedRoute from '@/components/routing/ProtectedRoute'
import ApiPathRedirectPage from '@/pages/ApiPathRedirectPage'
import AuthPage from '@/pages/AuthPage'
import IntegrationOAuthCallbackPage from '@/pages/IntegrationOAuthCallbackPage'
import InterSettingPage from '@/pages/InterSettingPage'
import LandingPage from '@/pages/LandingPage'
import MainPage from '@/pages/MainPage'
import NotFoundPage from '@/pages/NotFoundPage'
import RouteErrorPage from '@/pages/RouteErrorPage'
import UserPage from '@/pages/UserPage'
import WorkFlowPage from '@/pages/WorkFlowPage'
import WorkflowListPage from '@/pages/WorkflowListPage'

export const appRoutes: RouteObject[] = [
	{
		errorElement: <RouteErrorPage />,
		children: [
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
				element: <ProtectedRoute />,
				children: [
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
				],
			},
			{
				path: '*',
				element: <NotFoundPage />,
			},
		],
	},
]
