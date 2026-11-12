import { describe, expect, it } from 'vitest'
import {
	buildInterSettingOAuthReturnUrl,
	detectOAuthProvider,
	getOAuthReturnMessage,
	isOAuthReturnSearchParams,
	removeOAuthReturnSearchParams,
} from '@/utils/integration/integrationOAuthReturn'

describe('통합 OAuth 복귀 query 정리', () => {
	it('OAuth 소유 key만 제거하고 serviceId와 다른 query를 보존한다', () => {
		const searchParams = new URLSearchParams('serviceId=service-1&source=test&success=true&provider=github&message=connected')

		expect(removeOAuthReturnSearchParams(searchParams).toString()).toBe('serviceId=service-1&source=test')
	})

	it('connected query를 OAuth 복귀로 인식하고 제거한다', () => {
		const searchParams = new URLSearchParams('connected=slack&source=test')

		expect(isOAuthReturnSearchParams(searchParams)).toBe(true)
		expect(removeOAuthReturnSearchParams(searchParams).toString()).toBe('source=test')
	})
})

describe('통합 OAuth 복귀 공급자 판별', () => {
	it.each([
		['connected=slack', 'slack'],
		['error=slack_denied', 'slack'],
		['error=slack_unknown_case', 'slack'],
		['provider=github&success=true', 'github'],
		['error=access_denied', null],
	])('%s이면 공급자를 %s로 판별한다', (query, expected) => {
		expect(detectOAuthProvider('/inter-setting', new URLSearchParams(query))).toBe(expected)
	})
})

describe('통합 OAuth 복귀 안내 문구', () => {
	it('connected=slack이면 Slack 워크스페이스 연결 완료를 안내한다', () => {
		const searchParams = new URLSearchParams('connected=slack')

		expect(getOAuthReturnMessage(searchParams, detectOAuthProvider('/inter-setting', searchParams))).toEqual({
			title: '연동 완료',
			message: 'Slack 워크스페이스가 연결되었습니다.',
		})
	})

	it.each([
		['slack_state_expired', '5분이 지났거나 이미 쓴 요청이에요. 다시 시도해 주세요.'],
		['slack_state_mismatch', '설치를 시작한 브라우저에서 다시 시도해 주세요.'],
		['slack_denied', '설치를 취소했어요.'],
		['slack_exchange', 'Slack 연결에 실패했어요. 다시 시도해 주세요.'],
		['slack_org_install', 'Enterprise 조직 단위 설치는 지원하지 않아요.'],
		['slack_other_team', '다른 워크스페이스가 이미 연결돼 있어요. 먼저 연결을 해제해 주세요.'],
	])('error=%s이면 코드별 안내 문구를 보여 준다', (code, message) => {
		const searchParams = new URLSearchParams({ error: code })

		expect(getOAuthReturnMessage(searchParams, 'slack')).toEqual({ title: '연동 실패', message })
	})

	it('매핑에 없는 slack 오류 코드는 Slack 공통 실패 문구를 보여 준다', () => {
		const searchParams = new URLSearchParams('error=slack_new_reason')

		expect(getOAuthReturnMessage(searchParams, 'slack')?.message).toBe('Slack 연결에 실패했어요. 다시 시도해 주세요.')
	})

	// 오류 코드 매핑을 일반 객체로 조회하면 상속 키가 객체·함수를 돌려줘 모달 렌더가 깨진다.
	it.each(['__proto__', 'constructor', 'toString'])('error=%s처럼 상속 키 이름이 와도 코드 문자열을 그대로 보여 준다', code => {
		const searchParams = new URLSearchParams({ error: code })

		expect(getOAuthReturnMessage(searchParams, null)).toEqual({ title: '연동 실패', message: code })
	})

	it('공급자 공통 문구가 없는 오류 코드는 코드를 그대로 보여 준다', () => {
		const searchParams = new URLSearchParams('error=access_denied&provider=github')

		expect(getOAuthReturnMessage(searchParams, 'github')).toEqual({ title: '연동 실패', message: 'access_denied' })
	})
})

describe('통합 OAuth 복귀 URL', () => {
	it('connected query를 연동 화면 주소에 그대로 넘긴다', () => {
		const searchParams = new URLSearchParams('connected=slack')

		expect(buildInterSettingOAuthReturnUrl(searchParams, 'slack')).toBe('/inter-setting?connected=slack&provider=slack')
	})
})
