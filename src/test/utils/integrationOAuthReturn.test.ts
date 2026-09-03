import { describe, expect, it } from 'vitest'
import { removeOAuthReturnSearchParams } from '@/utils/integration/integrationOAuthReturn'

describe('통합 OAuth 복귀 query 정리', () => {
	it('OAuth 소유 key만 제거하고 serviceId와 다른 query를 보존한다', () => {
		const searchParams = new URLSearchParams('serviceId=service-1&source=test&success=true&provider=github&message=connected')

		expect(removeOAuthReturnSearchParams(searchParams).toString()).toBe('serviceId=service-1&source=test')
	})
})
