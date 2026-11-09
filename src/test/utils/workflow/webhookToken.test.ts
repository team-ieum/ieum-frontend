import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatWebhookIssuedAt, toWebhookUrl } from '@/utils/workflow/webhookToken'

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

	describe('formatWebhookIssuedAt', () => {
		it('서버 시각을 화면 시간대의 월·일·시각으로 보여 준다', () => {
			const issuedAt = '2026-11-09T05:07:00Z'
			const local = new Date(issuedAt)
			const time = `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`

			expect(formatWebhookIssuedAt(issuedAt)).toBe(`${local.getMonth() + 1}월 ${local.getDate()}일 ${time}`)
		})

		it('읽을 수 없는 값은 그대로 둔다', () => {
			expect(formatWebhookIssuedAt('알 수 없음')).toBe('알 수 없음')
		})
	})
})
