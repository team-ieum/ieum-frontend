import { http, HttpResponse, type HttpHandler } from 'msw'

export const MOCK_GITHUB_APP_INSTALL_URL = 'https://github.com/apps/ieum-service/installations/new'

/** GitHub App 설치 주소 조회 mock. 처음 설치와 레포 추가·변경이 같은 주소다. */
export const createGithubAppHandlers = (installUrl = MOCK_GITHUB_APP_INSTALL_URL): HttpHandler[] => [
	http.get('*/api/v1/github/oauth2/install', () =>
		HttpResponse.json({ success: true, data: { installUrl }, message: 'OK', code: 'OK' })
	),
]
