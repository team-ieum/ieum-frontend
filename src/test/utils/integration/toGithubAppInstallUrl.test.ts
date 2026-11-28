import { describe, expect, it } from 'vitest'
import { toGithubAppInstallUrl } from '@/utils/integration/toGithubAppInstallUrl'

describe('toGithubAppInstallUrl', () => {
	it('https github.com 주소는 그대로 링크로 쓴다', () => {
		expect(toGithubAppInstallUrl('https://github.com/apps/ieum-service/installations/new')).toBe(
			'https://github.com/apps/ieum-service/installations/new'
		)
	})

	it.each([
		['javascript 주소', 'javascript:alert(1)'],
		['http 주소', 'http://github.com/apps/ieum-service/installations/new'],
		['github.com이 아닌 호스트', 'https://github.com.evil.example/apps/x'],
		['상대 경로', '/apps/ieum-service/installations/new'],
		['빈 문자열', ''],
		['문자열이 아닌 값', undefined],
	])('%s는 링크로 쓰지 않는다', (_, value) => {
		expect(toGithubAppInstallUrl(value)).toBeNull()
	})
})
