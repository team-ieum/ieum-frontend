import { describe, expect, it } from 'vitest'
import { WORKFLOW_SERVICES } from '@/constants/workflow/workflowList'

describe('WORKFLOW_SERVICES', () => {
	// 연동 카탈로그는 같은 브랜드를 연결 방식(봇·웹훅)이나 앱마다 여러 타일로 두므로, 브랜드 기준 필터에 행이 겹치면 안 된다.
	it('연동 카탈로그에 같은 브랜드 타일이 여러 개여도 필터 서비스는 브랜드마다 한 번만 카탈로그 순서로 담는다', () => {
		const ids = WORKFLOW_SERVICES.map(service => service.id)

		expect(new Set(ids).size).toBe(ids.length)
		expect(ids.filter(id => id === 'discord')).toHaveLength(1)
		expect(ids.slice(0, 2)).toEqual(['slack', 'notion'])
		// 카탈로그에서는 Google Calendar(google)가 Gmail보다 앞이라, META 순서(gmail 먼저)를 쓰면 여기서 갈린다.
		expect(ids.indexOf('google')).toBeLessThan(ids.indexOf('gmail'))
	})
})
