import { describe, expect, it } from 'vitest'
import {
	hasIntegrationServiceIdParam,
	isCanonicalIntegrationViewParams,
	parseIntegrationView,
	serializeIntegrationView,
} from '@/utils/integration/integrationViewParams'

describe('통합 설정 보기 URL 상태', () => {
	it('serviceId 하나만 상세 상태로 해석한다', () => {
		const searchParams = new URLSearchParams('source=test&serviceId=service-1')

		expect(parseIntegrationView(searchParams)).toEqual({ kind: 'detail', id: 'service-1' })
		expect(isCanonicalIntegrationViewParams(searchParams)).toBe(true)
	})

	it('비어 있거나 중복된 serviceId는 목록 상태로 해석한다', () => {
		const empty = new URLSearchParams('serviceId=')
		const duplicate = new URLSearchParams('serviceId=service-1&serviceId=service-2')

		expect(parseIntegrationView(empty)).toEqual({ kind: 'list' })
		expect(parseIntegrationView(duplicate)).toEqual({ kind: 'list' })
		expect(isCanonicalIntegrationViewParams(empty)).toBe(false)
		expect(isCanonicalIntegrationViewParams(duplicate)).toBe(false)
	})

	it('소유한 serviceId만 변경하고 다른 query를 보존한다', () => {
		const current = new URLSearchParams('source=test&success=true')
		const detail = serializeIntegrationView(current, { kind: 'detail', id: 'service-1' })
		const list = serializeIntegrationView(detail, { kind: 'list' })

		expect(detail.toString()).toBe('source=test&success=true&serviceId=service-1')
		expect(list.toString()).toBe('source=test&success=true')
		expect(hasIntegrationServiceIdParam(detail)).toBe(true)
		expect(hasIntegrationServiceIdParam(list)).toBe(false)
	})
})
