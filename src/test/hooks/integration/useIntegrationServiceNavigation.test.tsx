import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useIntegrationServiceNavigation } from '@/hooks/integration/useIntegrationServiceNavigation'
import type { IntegrationService } from '@/types/integration'

const service: IntegrationService = {
	id: 'service-1',
	name: 'Service 1',
	brand: 'slack',
	status: 'connected',
}

const createWrapper = (initialEntry: string) =>
	function RouterWrapper({ children }: PropsWithChildren) {
		return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
	}

describe('useIntegrationServiceNavigation', () => {
	it('상세 이동은 다른 query를 보존하고 history back으로 이전 목록 entry를 복원한다', async () => {
		const { result } = renderHook(
			() => ({
				navigation: useIntegrationServiceNavigation({
					connected: [service],
					canNormalizeDetail: true,
					hasDetailResolutionError: false,
				}),
				location: useLocation(),
				navigate: useNavigate(),
			}),
			{ wrapper: createWrapper('/inter-setting?source=test') }
		)

		act(() => result.current.navigation.goDetail(service.id))
		await waitFor(() => expect(result.current.navigation.detailResolution).toBe('ready'))
		expect(new URLSearchParams(result.current.location.search).get('source')).toBe('test')
		expect(new URLSearchParams(result.current.location.search).get('serviceId')).toBe(service.id)

		act(() => result.current.navigate(-1))
		await waitFor(() => expect(result.current.navigation.view).toEqual({ kind: 'list' }))
		expect(new URLSearchParams(result.current.location.search).has('serviceId')).toBe(false)
	})

	it('미확정 ID는 loading 또는 error 중 보존하고 성공적으로 확정된 뒤 replace 정규화한다', async () => {
		const { result, rerender } = renderHook(
			({ canNormalizeDetail, hasDetailResolutionError }) => ({
				navigation: useIntegrationServiceNavigation({
					connected: [],
					canNormalizeDetail,
					hasDetailResolutionError,
				}),
				location: useLocation(),
			}),
			{
				wrapper: createWrapper('/inter-setting?source=test&serviceId=missing'),
				initialProps: { canNormalizeDetail: false, hasDetailResolutionError: false },
			}
		)

		expect(result.current.navigation.detailResolution).toBe('loading')
		expect(new URLSearchParams(result.current.location.search).get('serviceId')).toBe('missing')

		rerender({ canNormalizeDetail: false, hasDetailResolutionError: true })
		expect(result.current.navigation.detailResolution).toBe('error')
		expect(new URLSearchParams(result.current.location.search).get('serviceId')).toBe('missing')

		rerender({ canNormalizeDetail: true, hasDetailResolutionError: false })
		await waitFor(() => expect(new URLSearchParams(result.current.location.search).has('serviceId')).toBe(false))
		expect(result.current.navigation.view).toEqual({ kind: 'list' })
		expect(new URLSearchParams(result.current.location.search).get('source')).toBe('test')
	})

	it('한 source에서 서비스를 찾으면 다른 source 오류와 무관하게 ready로 판정한다', () => {
		const { result } = renderHook(
			() =>
				useIntegrationServiceNavigation({
					connected: [service],
					canNormalizeDetail: false,
					hasDetailResolutionError: true,
				}),
			{ wrapper: createWrapper(`/inter-setting?serviceId=${service.id}`) }
		)

		expect(result.current.currentService).toEqual(service)
		expect(result.current.detailResolution).toBe('ready')
	})

	it('비정규 serviceId는 확정 전 보존하고 다른 query를 유지한 채 제거한다', async () => {
		const { result, rerender } = renderHook(
			({ canNormalizeDetail }) => ({
				navigation: useIntegrationServiceNavigation({
					connected: [],
					canNormalizeDetail,
					hasDetailResolutionError: false,
				}),
				location: useLocation(),
			}),
			{
				wrapper: createWrapper('/inter-setting?source=test&serviceId=one&serviceId=two'),
				initialProps: { canNormalizeDetail: false },
			}
		)

		expect(result.current.navigation.hasServiceIdParam).toBe(true)
		rerender({ canNormalizeDetail: true })
		await waitFor(() => expect(result.current.navigation.hasServiceIdParam).toBe(false))
		expect(new URLSearchParams(result.current.location.search).toString()).toBe('source=test')
	})
})
