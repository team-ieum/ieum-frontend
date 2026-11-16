import type { CredentialItem } from '@/types/credential'

const getCreatedTime = (credential: CredentialItem) => {
	const time = Date.parse(credential.createdAt)
	return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

/**
 * 채팅에 쓸 AI 자격 증명을 고른다. 사용자가 고른 자격 증명이 목록에 있으면 그것을, 없으면 가장 최근에 추가한 것을
 * 돌려준다. 목록이 비면 null이다.
 */
export const selectWorkflowChatCredential = (
	credentials: CredentialItem[],
	selectedCredentialId: string | null
): CredentialItem | null => {
	const selected = credentials.find(credential => credential.id === selectedCredentialId)
	if (selected) return selected

	return credentials.reduce<CredentialItem | null>(
		(latest, credential) => (!latest || getCreatedTime(credential) > getCreatedTime(latest) ? credential : latest),
		null
	)
}
