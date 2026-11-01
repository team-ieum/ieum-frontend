import { createContext } from 'react'

type WorkflowNodeActions = {
	/** 노드 뒤에 붙일 다음 노드를 고르게 한다. `invoker`는 고르기를 마치면 포커스를 돌려받을 버튼이다. */
	onAddNext: (nodeId: string, invoker: HTMLButtonElement) => void
}

/**
 * 캔버스가 노드 카드에 넘기는 편집 동작. 콜백을 노드 `data`에 넣으면 문서·표시 data 비교에 함수가 섞여 컨텍스트로 넘긴다.
 * Provider가 없으면(단독 렌더 등) 노드 카드는 편집 버튼을 그리지 않는다.
 */
export const WorkflowNodeActionsContext = createContext<WorkflowNodeActions | null>(null)
