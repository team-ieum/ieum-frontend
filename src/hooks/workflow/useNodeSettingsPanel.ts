import { useQuery } from '@tanstack/react-query'
import { providersQueryOptions } from '@/hooks/aiCredentials/queries/aiCredentialsQueryOptions'
import { useNodeCatalogQuery } from '@/hooks/workflow/queries/useNodeCatalogQuery'
import { useNodeAiOutputFields } from '@/hooks/workflow/useNodeAiOutputFields'
import { useNodeAiTools } from '@/hooks/workflow/useNodeAiTools'
import { useNodeReferenceCandidates } from '@/hooks/workflow/useNodeReferenceCandidates'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import { findNodeReferenceIssues, findNodesReferencingMissingOutputs } from '@/utils/workflow/findNodeReferenceIssues'
import { collectNodeReferences } from '@/utils/workflow/nodeReference'
import { getMissingRequiredFields } from '@/utils/workflow/nodeFieldValue'
import { AI_MODELS_SOURCE, getDefaultModelName, getOptionsInputsState, type NodeFieldOptions } from '@/utils/workflow/nodeOptions'
import { getAtPath } from '@/utils/workflow/objectPath'
import { getFieldName, updateNodeField } from '@/utils/workflow/updateNodeField'

/**
 * 설정 패널 본문 상태.
 * - `loading`: 카탈로그를 처음 받는 중
 * - `error`: 받은 카탈로그 없이 조회에 실패함
 * - `outsideCatalog`: 노드 event에 맞는 카탈로그 항목이 없어 읽기 전용으로 보여 줌
 * - `ready`: 칸을 편집할 수 있음
 */
type NodeSettingsPanelStatus = 'loading' | 'error' | 'outsideCatalog' | 'ready'

type UseNodeSettingsPanelOptions = {
	/** 비어 있으면(저장 전 문서) 참조 후보용 테스트 샘플을 조회하지 않는다. */
	workflowId: string
	node: WorkflowNodeDto
	/** 편집 문서의 노드·엣지. 참조할 수 있는 조상 노드와 깨진 참조를 계산한다. */
	nodes: WorkflowNodeDto[]
	edges: WorkflowEdgeDto[]
	/** 칸을 바꾼 새 노드를 넘긴다. 편집 문서에 반영하는 일은 호출자가 맡는다. */
	onNodeChange: (node: WorkflowNodeDto) => void
}

/**
 * 노드 설정 패널이 그릴 칸 목록과 칸 변경 콜백을 만든다.
 * 노드는 `event`가 같은 카탈로그 항목으로만 열고, 칸 값을 바꾸면 `_names`·연쇄 자식 칸을 함께 정리한 새 노드를 넘긴다.
 * AI 노드는 도구 카드(`aiTools`)도 함께 만들며, 필수 칸 개수에는 도구 안 필수 칸도 센다.
 * 출력 칸을 선언할 수 있는 AI 노드는 출력 칸 편집기(`outputFields`)와 고쳐야 할 출력 칸 수를 함께 만든다.
 * 칸에 넣을 출력 참조 후보(`references`)와, 이 노드 config·아래 노드의 깨진 참조도 함께 계산한다.
 */
export const useNodeSettingsPanel = ({ workflowId, node, nodes, edges, onNodeChange }: UseNodeSettingsPanelOptions) => {
	const catalogQuery = useNodeCatalogQuery()
	const entry = catalogQuery.data?.data.entries.find(item => item.id === node.event)
	const modelField = entry?.inputFields.find(field => field.optionsSource === AI_MODELS_SOURCE)
	const providersQuery = useQuery({ ...providersQueryOptions(), enabled: Boolean(modelField) })

	// 받은 카탈로그가 있으면 이후 재조회가 실패해도 그 카탈로그로 계속 편집하게 한다.
	const status: NodeSettingsPanelStatus = !catalogQuery.data
		? catalogQuery.isError
			? 'error'
			: 'loading'
		: entry
			? 'ready'
			: 'outsideCatalog'

	const getFieldOptions = (field: NodeCatalogInputField): NodeFieldOptions | undefined => {
		if (!entry || !field.optionsSource) return undefined
		const inputsState = getOptionsInputsState(entry, node, field)
		if (field !== modelField) return { source: field.optionsSource, inputsState }
		// 제공자가 비었거나 참조식이어도 비운 model은 기본 모델로 실행되므로 이름만 빼고 안내한다.
		const defaultModel =
			inputsState.status === 'ready'
				? getDefaultModelName(providersQuery.data?.data.providers, inputsState.inputs.llmProvider)
				: undefined
		const defaultModelLabel = defaultModel ? `기본 모델(${defaultModel})` : '기본 모델'
		return {
			source: field.optionsSource,
			inputsState,
			emptyHint: `비우면 ${defaultModelLabel}로 실행해요`,
			clearLabel: defaultModelLabel,
		}
	}

	const entries = catalogQuery.data?.data.entries ?? []
	const aiTools = useNodeAiTools({ node, entries, onNodeChange })
	const outputFields = useNodeAiOutputFields({ node, entry, onNodeChange })
	const { groups, context, ownTarget } = useNodeReferenceCandidates({ workflowId, node, nodes, edges, entries })
	const referenceIssueCount = findNodeReferenceIssues(collectNodeReferences(node.config), context).length
	const brokenReferrers = findNodesReferencingMissingOutputs(node.id, ownTarget.paths, nodes).map(item => ({
		nodeId: item.id,
		label: item.label,
	}))

	// 도구 칸과 출력 칸은 각각 도구 카드 영역(`aiTools`)과 출력 칸 편집기(`outputFields`)가 따로 그린다.
	const fields = (entry?.inputFields ?? [])
		.filter(field => field !== aiTools?.toolsField && field !== outputFields?.field)
		.map(field => ({
			field,
			value: getAtPath(node, field.path),
			name: getFieldName(node, field),
			options: getFieldOptions(field),
		}))

	const changeField = (field: NodeCatalogInputField, value: unknown, name?: string) => {
		if (entry) onNodeChange(updateNodeField(node, entry, field, value, name))
	}

	return {
		status,
		entry,
		entryTitle: entry?.title,
		fields,
		aiTools,
		outputFields,
		outputFieldIssueCount: outputFields?.validation.issueCount ?? 0,
		missingRequiredCount: entry ? getMissingRequiredFields(entry, node).length + (aiTools?.missingRequiredCount ?? 0) : 0,
		references: { groups, context },
		referenceIssueCount,
		brokenReferrers,
		changeField,
		retry: () => void catalogQuery.refetch(),
		isRetrying: catalogQuery.isFetching,
	}
}
