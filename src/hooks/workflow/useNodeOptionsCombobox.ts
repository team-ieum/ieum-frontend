import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { nodeOptionsQueryOptions } from '@/hooks/workflow/queries/nodeOptionsQueryOptions'
import { useSettingsDropdown } from '@/hooks/workflow/useSettingsDropdown'
import type { NodeOption } from '@/types/nodeOptions'
import { getNodeOptionsErrorNotice, type NodeOptionsInputsState } from '@/utils/workflow/nodeOptions'

// 빈 페이지가 이만큼 이어지면 자동으로 더 읽지 않고 '더 불러오기'를 보여 준다(서버 cursor 반복 대비).
const MAX_AUTO_EMPTY_PAGES = 5

type UseNodeOptionsComboboxOptions = {
	source: string
	inputsState: NodeOptionsInputsState
	/** 칸에 값이 있는지. 부모 칸이 막혀 있어도 값이 있으면 비우기 행으로 지울 수 있게 연다. 비우기 행이 없는 칸은 false를 넘긴다. */
	hasValue: boolean
	onSelect: (option: NodeOption) => void
	/**
	 * 비우기 행을 고르면 부른다. 넘기면 목록 맨 위(index 0)에 비우기 행이 있고 불러온 항목은 index 1부터 이어지며,
	 * 넘기지 않으면 비우기 행 없이 index 0부터 항목이다. 호출자도 이 순서로 행을 그린다.
	 */
	onClear?: () => void
}

/**
 * 목록 공급원 칸 드롭다운의 열림 상태와 options 목록 조회를 관리한다.
 * 행 index는 비우기 행(`onClear`를 넘긴 경우)을 포함한다. 목록은 열려 있고 부모 칸이 준비됐을 때만 부른다.
 * 부모 칸이 막혀 있으면 `hasValue`일 때만 열리고, 그때는 비우기 행만 남는다.
 * 열려 있는 동안 끝 페이지가 비었고 다음 페이지가 있으면 자동으로 이어 읽는다.
 */
export const useNodeOptionsCombobox = ({ source, inputsState, hasValue, onSelect, onClear }: UseNodeOptionsComboboxOptions) => {
	const isReady = inputsState.status === 'ready'
	// 패널 밖에서 들어온 값은 부모 칸이 막혀 있어도 남아 있을 수 있어, 비울 수 있게 열어 둔다.
	const dropdown = useSettingsDropdown(isReady || hasValue)
	const query = useInfiniteQuery({
		...nodeOptionsQueryOptions(source, isReady ? inputsState.inputs : {}),
		enabled: dropdown.isOpen && isReady,
	})
	const pages = query.data?.pages ?? []
	const items = pages.flatMap(page => page.data.items)

	// 목록 공급원은 항목이 빈 페이지에도 다음 cursor를 줄 수 있다(예: 쓰기 가능한 캘린더만 거른 페이지).
	// 끝 페이지가 비었으면 사용자가 빈 목록에서 멈추지 않게 다음 페이지를 이어 읽는다.
	const lastFilledPage = pages.reduce((last, page, index) => (page.data.items.length > 0 ? index : last), -1)
	const trailingEmptyPages = pages.length - 1 - lastFilledPage
	const shouldReadNextPage =
		dropdown.isOpen &&
		query.hasNextPage &&
		!query.isFetching &&
		!query.isError &&
		trailingEmptyPages > 0 &&
		trailingEmptyPages < MAX_AUTO_EMPTY_PAGES
	const { fetchNextPage } = query
	const pageCount = pages.length
	// 다음 페이지가 도착해도 조건이 계속 참일 수 있어(가져오는 중 상태가 렌더되지 않음) 페이지 수로 다시 실행한다.
	useEffect(() => {
		if (shouldReadNextPage) void fetchNextPage()
	}, [shouldReadNextPage, pageCount, fetchNextPage])

	const choose = (rowIndex: number) => {
		if (onClear && rowIndex === 0) {
			onClear()
			return
		}
		const option = items[onClear ? rowIndex - 1 : rowIndex]
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
		fetchNextPage: () => void fetchNextPage(),
		retry: () => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch()),
		choose,
	}
}

export type NodeOptionsComboboxState = ReturnType<typeof useNodeOptionsCombobox>
