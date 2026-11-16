import { describe, expect, it } from 'vitest'
import type { CredentialItem } from '@/types/credential'
import { selectWorkflowChatCredential } from '@/utils/workflow/selectWorkflowChatCredential'

const createCredential = (id: string, createdAt: string): CredentialItem => ({
	id,
	provider: 'CLAUDE',
	credentialType: 'API_KEY',
	displayName: id,
	keyHint: '',
	lastValidatedAt: createdAt,
	createdAt,
	valid: true,
})

const OLDER = createCredential('older', '2026-10-01T00:00:00Z')
const LATEST = createCredential('latest', '2026-11-10T00:00:00Z')
const MIDDLE = createCredential('middle', '2026-11-01T00:00:00Z')

describe('selectWorkflowChatCredential', () => {
	it('고른 자격 증명이 목록에 있으면 그것을 고른다', () => {
		expect(selectWorkflowChatCredential([OLDER, LATEST, MIDDLE], 'older')).toBe(OLDER)
	})

	it.each([
		{ condition: '고르지 않았으면', selectedId: null },
		{ condition: '고른 자격 증명이 지워졌으면', selectedId: 'deleted' },
	])('$condition 가장 최근에 추가한 자격 증명을 고른다', ({ selectedId }) => {
		expect(selectWorkflowChatCredential([OLDER, LATEST, MIDDLE], selectedId)).toBe(LATEST)
	})

	it('추가한 시각을 읽을 수 없는 자격 증명은 가장 오래된 것으로 본다', () => {
		const unknown = createCredential('unknown', '')

		expect(selectWorkflowChatCredential([unknown, OLDER], null)).toBe(OLDER)
	})

	it('자격 증명이 없으면 null을 돌려준다', () => {
		expect(selectWorkflowChatCredential([], null)).toBeNull()
	})
})
