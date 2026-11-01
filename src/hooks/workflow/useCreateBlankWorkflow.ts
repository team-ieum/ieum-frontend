import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useCreateWorkflowMutation } from '@/hooks/workflow/mutations/useCreateWorkflowMutation'
import { useModalStore } from '@/stores/useModalStore'
import { isApiError } from '@/utils/ApiError'

/**
 * 노드 없는 새 워크플로우를 만들어 그 편집 화면으로 이동하는 명령을 제공한다.
 * 실패하면 오류 모달을 띄우고 이동하지 않는다. 요청이 끝나기 전에 다시 부르면 중복 생성하지 않도록 무시한다.
 */
export const useCreateBlankWorkflow = () => {
	const navigate = useNavigate()
	const openModal = useModalStore(state => state.open)
	const createMutation = useCreateWorkflowMutation()
	// isPending은 다음 렌더에야 바뀌어 같은 틱의 두 번째 클릭을 막지 못하므로 ref로 진행 여부를 잡는다.
	const isCreatingRef = useRef(false)

	/** `onCreated`는 이동한 편집 화면 경로로, 생성에 성공했을 때만 불린다. */
	const createBlankWorkflow = useCallback(
		async (onCreated?: (path: string) => void) => {
			if (isCreatingRef.current) return
			isCreatingRef.current = true
			try {
				// 트리거는 서버가 노드에서 계산하므로 최상위 triggerType은 보내지 않는다.
				const res = await createMutation.mutateAsync({ name: '새 워크플로우', nodes: [], edges: [] })
				const path = `/workflow/${res.data.id}`
				navigate(path)
				onCreated?.(path)
			} catch (err) {
				openModal('오류', isApiError(err) ? err.message : '워크플로우 생성에 실패했어요. 다시 시도해주세요.')
			} finally {
				isCreatingRef.current = false
			}
		},
		[createMutation, navigate, openModal]
	)

	return { createBlankWorkflow, isCreating: createMutation.isPending }
}
