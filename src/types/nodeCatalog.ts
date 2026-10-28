import type { ApiResponse } from '@/types/api'
import type { WorkflowNodeKind } from '@/types/workflowCommon'

export type NodeCatalogKind = 'trigger' | 'action' | 'search'

type NodeCatalogFieldType =
	| 'string'
	| 'text'
	| 'integer'
	| 'number'
	| 'boolean'
	| 'datetime'
	| 'cron'
	| 'json'
	| 'dict'
	| 'object'

type NodeCatalogChoice = {
	id: string
	name: string
}

/** 카탈로그 칸 정의. `required`·`ref`·`list`·`dynamic`은 기본값(false·true·false·false)이면 응답에서 빠진다. */
type NodeCatalogField = {
	key: string
	title: string
	type: NodeCatalogFieldType
	description?: string
	required?: boolean
	ref?: boolean
	list?: boolean
	dynamic?: boolean
	/** placeholder로만 쓰고 저장하지 않는다. */
	default?: unknown
	choices?: NodeCatalogChoice[]
	/** `{app}.{resource}` 형식의 options 공급원. */
	optionsSource?: string
	optionsInputs?: string[]
	children?: NodeCatalogField[]
}

type NodeCatalogInputField = NodeCatalogField & {
	/** 노드에서 값을 읽고 쓸 경로(예: `config.channel`). */
	path: string
}

export type NodeCatalogEntry = {
	/** 노드 `event`로 저장하는 불투명 키. 형식을 파싱하지 않는다. */
	id: string
	kind: NodeCatalogKind
	provider: string
	app: string
	appTitle: string
	toolKey?: string
	nodeType: WorkflowNodeKind
	title: string
	description?: string
	/** 새 노드 뼈대. 새 노드의 config는 이 값을 복사해 만든다. */
	fixed: {
		type: WorkflowNodeKind
		event: string
		config: Record<string, unknown>
	}
	inputFields: NodeCatalogInputField[]
	outputFields: NodeCatalogField[]
	outputDynamic?: boolean
	outputsFrom?: string
}

export type NodeCatalogResponse = ApiResponse<{ entries: NodeCatalogEntry[] }>
