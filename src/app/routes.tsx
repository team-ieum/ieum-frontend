import { Navigate, type RouteObject } from 'react-router'
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
						// 새 워크플로우는 생성 API로 id를 받은 뒤 편집 화면을 연다. 이전 주소로 들어오면 목록으로 보낸다.
						path: 'workflow/new',
						element: <Navigate to='/workflow' replace />,
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
