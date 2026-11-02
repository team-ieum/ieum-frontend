import { useInfiniteQuery } from '@tanstack/react-query'
import { nodeOptionsQueryOptions } from '@/hooks/workflow/queries/nodeOptionsQueryOptions'
import { useSettingsDropdown } from '@/hooks/workflow/useSettingsDropdown'
import type { NodeOption } from '@/types/nodeOptions'
import { getNodeOptionsErrorNotice, type NodeOptionsInputsState } from '@/utils/workflow/nodeOptions'

/** 목록 맨 위 비우기 행의 index. 불러온 항목은 그 뒤(index 1부터)에 이어지므로 호출자도 이 순서로 행을 그린다. */
const CLEAR_ROW_INDEX = 0

type UseNodeOptionsComboboxOptions = {
	source: string
	inputsState: NodeOptionsInputsState
	/** 칸에 값이 있는지. 부모 칸이 막혀 있어도 값이 있으면 비우기 행으로 지울 수 있게 연다. */
	hasValue: boolean
	onSelect: (option: NodeOption) => void
	/** 비우기 행을 고르면 부른다. */
	onClear: () => void
}

/**
 * 목록 공급원 칸 드롭다운의 열림 상태와 options 목록 조회를 관리한다.
 * 행 index는 비우기 행(`CLEAR_ROW_INDEX`)을 포함한다. 목록은 열려 있고 부모 칸이 준비됐을 때만 부르며,
 * 부모 칸이 막힌 채 열면 비우기 행만 남는다.
 */
export const useNodeOptionsCombobox = ({ source, inputsState, hasValue, onSelect, onClear }: UseNodeOptionsComboboxOptions) => {
	const isReady = inputsState.status === 'ready'
	// 패널 밖에서 들어온 값은 부모 칸이 막혀 있어도 남아 있을 수 있어, 비울 수 있게 열어 둔다.
	const dropdown = useSettingsDropdown(isReady || hasValue)
	const query = useInfiniteQuery({
		...nodeOptionsQueryOptions(source, isReady ? inputsState.inputs : {}),
		enabled: dropdown.isOpen && isReady,
	})
	const items = query.data?.pages.flatMap(page => page.data.items) ?? []

	const choose = (rowIndex: number) => {
		if (rowIndex === CLEAR_ROW_INDEX) {
			onClear()
			return
		}
		const option = items[rowIndex - 1]
		if (option) onSelect(option)
	}

	return {
		dropdown,
		items,
		isBlocked: !isReady,
		isLoading: query.isPending && query.fetchStatus === 'fetching',
		errorNotice: query.isError ? getNodeOptionsErrorNotice(query.error) : null,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
		fetchNextPage: () => void query.fetchNextPage(),
		retry: () => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch()),
		choose,
	}
}
