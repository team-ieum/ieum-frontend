import { describe, expect, it, vi } from 'vitest'
import { isApiScenarioTargetRequest } from '@/mocks/apiScenarios'
import { seedMeasurementAuthState } from '@/measurement/measurementAuth'
import { isMeasurementApiRequest, onMeasurementUnhandledRequest } from '@/measurement/measurementRequestPolicy'
import { useAuthStore } from '@/stores/useAuthStore'

describe('measurement mode', () => {
	it('보호 route용 가짜 인증 상태를 저장소에만 주입한다', () => {
		seedMeasurementAuthState()

		expect(useAuthStore.getState()).toMatchObject({
			accessToken: 'measurement-only-fake-access-token',
			refreshToken: 'measurement-only-fake-refresh-token',
		})
		expect(localStorage.getItem('accessToken')).toBeNull()
		expect(localStorage.getItem('refreshToken')).toBeNull()
	})

	it('모든 API 누락은 차단하고 비 API 요청만 bypass한다', () => {
		const error = vi.fn()
		const warning = vi.fn()
		const print = { error, warning }
		const targets = [
			'/api/v1/workflows',
			'/api/v1/workflows/fixture-id',
			'/api/v1/workflows/dashboard/summary',
			'/api/v1/workflows/dashboard/executions',
			'/api/v1/workflows/dashboard/errors',
			'/api/v1/webhook-credentials',
			'/api/v1/oauth/connections',
			'/api/v1/providers',
			'/api/v1/credentials',
		].map(pathname => new Request(`https://api.example.com${pathname}`))
		const trailingSlashTargets = [
			new Request('https://api.example.com/api/v1/workflows/'),
			new Request('https://api.example.com/api/v1/workflows/fixture-id/'),
		]
		const mutation = new Request('https://api.example.com/api/v1/workflows/fixture-id', { method: 'PATCH' })
		const unconfiguredApi = new Request('https://api.example.com/api/v1/unconfigured')
		const transport = new Request('https://api.example.com/ws/info?t=1')

		expect(targets.every(isApiScenarioTargetRequest)).toBe(true)
		expect(trailingSlashTargets.every(isApiScenarioTargetRequest)).toBe(true)
		expect(isApiScenarioTargetRequest(mutation)).toBe(false)
		expect(isMeasurementApiRequest(mutation)).toBe(true)
		expect(isMeasurementApiRequest(unconfiguredApi)).toBe(true)
		expect(isMeasurementApiRequest(transport)).toBe(false)
		targets.forEach(target => onMeasurementUnhandledRequest(target, print))
		trailingSlashTargets.forEach(target => onMeasurementUnhandledRequest(target, print))
		onMeasurementUnhandledRequest(mutation, print)
		onMeasurementUnhandledRequest(unconfiguredApi, print)
		onMeasurementUnhandledRequest(transport, print)

		expect(error).toHaveBeenCalledTimes(targets.length + trailingSlashTargets.length + 2)
		expect(warning).not.toHaveBeenCalled()
	})
})
