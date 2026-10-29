import { useNodeCatalogQuery } from '@/hooks/workflow/queries/useNodeCatalogQuery'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { getMissingRequiredFields } from '@/utils/workflow/nodeFieldValue'
import { getAtPath } from '@/utils/workflow/objectPath'
import { getFieldName, updateNodeField } from '@/utils/workflow/updateNodeField'

/**
 * 설정 패널 본문 상태.
 * - `loading`: 카탈로그를 처음 받는 중
 * - `error`: 카탈로그 조회에 실패함
 * - `outsideCatalog`: 노드 event에 맞는 카탈로그 항목이 없어 읽기 전용으로 보여 줌
 * - `ready`: 칸을 편집할 수 있음
 */
type NodeSettingsPanelStatus = 'loading' | 'error' | 'outsideCatalog' | 'ready'

type UseNodeSettingsPanelOptions = {
	node: WorkflowNodeDto
	/** 칸을 바꾼 새 노드를 넘긴다. 편집 문서에 반영하는 일은 호출자가 맡는다. */
	onNodeChange: (node: WorkflowNodeDto) => void
}

/**
 * 노드 설정 패널이 그릴 칸 목록과 칸 변경 콜백을 만든다.
 * 노드는 `event`가 같은 카탈로그 항목으로만 열고, 칸 값을 바꾸면 `_names`·연쇄 자식 칸을 함께 정리한 새 노드를 넘긴다.
 */
export const useNodeSettingsPanel = ({ node, onNodeChange }: UseNodeSettingsPanelOptions) => {
	const catalogQuery = useNodeCatalogQuery()
	const entry = catalogQuery.data?.data.entries.find(item => item.id === node.event)

	const status: NodeSettingsPanelStatus = catalogQuery.isPending
		? 'loading'
		: catalogQuery.isError
			? 'error'
			: entry
				? 'ready'
				: 'outsideCatalog'

	const fields = (entry?.inputFields ?? []).map(field => ({
		field,
		value: getAtPath(node, field.path),
		name: getFieldName(node, field),
	}))

	const changeField = (field: NodeCatalogInputField, value: unknown) => {
		if (entry) onNodeChange(updateNodeField(node, entry, field, value))
	}

	return {
		status,
		entryTitle: entry?.title,
		fields,
		missingRequiredCount: entry ? getMissingRequiredFields(entry, node).length : 0,
		changeField,
		retry: () => void catalogQuery.refetch(),
		isRetrying: catalogQuery.isFetching,
	}
}
