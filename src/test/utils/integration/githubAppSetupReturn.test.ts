import { describe, expect, it } from 'vitest'
import { GITHUB_APP_SETUP_RETURN_MESSAGES } from '@/constants/integration/oauthReturnMessages'
import {
	getGithubAppSetupReturnMessage,
	isGithubAppSetupReturnSearchParams,
	removeGithubAppSetupReturnSearchParams,
} from '@/utils/integration/githubAppSetupReturn'

describe('githubAppSetupReturn', () => {
	it.each([
		['installation_id=1', true],
		['setup_action=update', true],
		['connected=github', false],
		['', false],
	])('%s 쿼리의 설치 복귀 여부는 %s다', (query, expected) => {
		expect(isGithubAppSetupReturnSearchParams(new URLSearchParams(query))).toBe(expected)
	})

	it('설치 쿼리만 지우고 나머지 쿼리는 남긴다', () => {
		const params = new URLSearchParams('serviceId=oauth-1&installation_id=1&setup_action=install')

		expect(removeGithubAppSetupReturnSearchParams(params).toString()).toBe('serviceId=oauth-1')
		expect(params.has('installation_id')).toBe(true)
	})

	it.each(['', 'setup_action=unknown', 'setup_action=constructor', 'setup_action=__proto__'])(
		'%s처럼 모르는 값이면 설치 완료로 안내한다',
		query => {
			expect(getGithubAppSetupReturnMessage(new URLSearchParams(query))).toEqual(GITHUB_APP_SETUP_RETURN_MESSAGES.install)
		}
	)
})
