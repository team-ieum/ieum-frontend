import { afterEach, describe, expect, it, vi } from 'vitest'
import { toWebhookUrl } from '@/utils/workflow/webhookToken'

describe('webhookToken', () => {
	afterEach(() => vi.unstubAllEnvs())

	describe('toWebhookUrl', () => {
		it('VITE_API_URL 호스트에 수신 경로를 붙이고 끝의 /는 한 번만 쓴다', () => {
			vi.stubEnv('VITE_API_URL', 'https://api.example.com/')

			expect(toWebhookUrl('/api/v1/hooks/abc', 'https://app.example.com')).toBe('https://api.example.com/api/v1/hooks/abc')
		})

		it('VITE_API_URL이 비어 있으면 화면 origin을 쓴다', () => {
			vi.stubEnv('VITE_API_URL', '')

			expect(toWebhookUrl('/api/v1/hooks/abc', 'https://app.example.com')).toBe('https://app.example.com/api/v1/hooks/abc')
		})
	})
})
