import { describe, expect, it } from 'vitest'
import {
	createIntegrationViewVariants,
	getIntegrationViewDirection,
	getIntegrationViewKey,
	INTEGRATION_VIEW_TRANSITION,
	INTEGRATION_VIEW_TRANSITION_MODE,
} from '@/components/integration/integrationViewMotion'
import type { IntegrationView } from '@/types/integration'

const list: IntegrationView = { kind: 'list' }
const detailOne: IntegrationView = { kind: 'detail', id: 'service-1' }
const detailTwo: IntegrationView = { kind: 'detail', id: 'service-2' }

describe('통합 설정 목록·상세 전환', () => {
	it('상태별 key와 목록·상세 방향을 만든다', () => {
		expect(getIntegrationViewKey(list)).toBe('list')
		expect(getIntegrationViewKey(detailOne)).toBe('detail:service-1')
		expect(getIntegrationViewDirection(null, list.kind)).toBe(0)
		expect(getIntegrationViewDirection(list.kind, detailOne.kind)).toBe(1)
		expect(getIntegrationViewDirection(detailOne.kind, list.kind)).toBe(-1)
		expect(getIntegrationViewDirection(detailOne.kind, detailTwo.kind)).toBe(0)
	})

	it('6px 좌우 이동과 160ms 순차 전환을 고정한다', () => {
		const variants = createIntegrationViewVariants(false)

		expect(INTEGRATION_VIEW_TRANSITION_MODE).toBe('wait')
		expect(INTEGRATION_VIEW_TRANSITION).toEqual({ duration: 0.16, ease: 'easeOut' })
		expect(variants.initial(1)).toEqual({ opacity: 0, x: 6 })
		expect(variants.exit(1)).toEqual({ opacity: 0, x: -6 })
		expect(variants.initial(-1)).toEqual({ opacity: 0, x: -6 })
		expect(variants.exit(-1)).toEqual({ opacity: 0, x: 6 })
		expect(variants.initial(0)).toEqual({ opacity: 0, x: 0 })
		expect(variants.exit(0)).toEqual({ opacity: 0, x: 0 })
	})

	it('reduced-motion에서는 이동만 제거하고 opacity 전환을 유지한다', () => {
		const variants = createIntegrationViewVariants(true)

		expect(variants.initial(1)).toEqual({ opacity: 0, x: 0 })
		expect(variants.animate).toEqual({ opacity: 1, x: 0 })
		expect(variants.exit(-1)).toEqual({ opacity: 0, x: 0 })
	})
})
