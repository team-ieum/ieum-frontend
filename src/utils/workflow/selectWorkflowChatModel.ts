import type { ProviderModel } from '@/types/credential'

/**
 * 채팅에 쓸 모델을 고른다. 사용자가 고른 모델이 이 제공자 목록에 있으면 그 모델을, 없으면 제공자 기본 모델을,
 * 기본 표시도 없으면 첫 모델을 돌려준다. 목록이 비면 null이다.
 */
export const selectWorkflowChatModel = (models: ProviderModel[], preferredModelId: string | null): ProviderModel | null =>
	models.find(model => model.id === preferredModelId) ?? models.find(model => model.default) ?? models[0] ?? null
