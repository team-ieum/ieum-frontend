/**
 * 서버가 준 GitHub App 설치 주소를 링크로 쓸 수 있는 값으로 바꾼다.
 * `https://github.com`의 주소가 아니면(`javascript:` 등) 링크로 그리지 않도록 `null`을 돌려준다.
 */
export const toGithubAppInstallUrl = (value: unknown): string | null => {
	if (typeof value !== 'string') return null
	try {
		const url = new URL(value)
		return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : null
	} catch {
		return null
	}
}
