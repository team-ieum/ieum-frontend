import type { RouteObject } from 'react-router'
import { Layout } from '@/components/layout/Layout'
import ProtectedRoute from '@/components/routing/ProtectedRoute'
import { WorkflowEditorRoute } from '@/components/routing/WorkflowEditorRoute'
import ApiPathRedirectPage from '@/pages/ApiPathRedirectPage'
import AuthPage from '@/pages/AuthPage'
import IntegrationOAuthCallbackPage from '@/pages/IntegrationOAuthCallbackPage'
import InterSettingPage from '@/pages/InterSettingPage'
import LandingPage from '@/pages/LandingPage'
import MainPage from '@/pages/MainPage'
import UserPage from '@/pages/UserPage'
import WorkflowListPage from '@/pages/WorkflowListPage'

export const appRoutes: RouteObject[] = [
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
						element: <WorkflowEditorRoute />,
					},
					{
						path: 'workflow/:workflowId',
						element: <WorkflowEditorRoute />,
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
]
