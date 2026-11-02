import type { ApiResponse } from '@/types/api'

export type NodeOption = {
	/** 노드 config에 저장할 값. */
	id: string
	name: string
}

/** `nextCursor`가 null이거나 없으면 마지막 페이지다. */
type NodeOptionsPage = {
	items: NodeOption[]
	nextCursor?: string | null
}

export type NodeOptionsResponse = ApiResponse<NodeOptionsPage>

export type NodeOptionsRequest = {
	/** 카탈로그 칸의 `optionsSource`(`{app}.{resource}`). */
	source: string
	/** `optionsInputs` key별 부모 칸 값. */
	inputs: Record<string, string>
	cursor?: string
}
