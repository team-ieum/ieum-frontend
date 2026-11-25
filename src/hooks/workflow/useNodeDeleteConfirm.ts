import { useEffect, useRef } from 'react'
import { useModalStore } from '@/stores/useModalStore'
import type { WorkflowNodeType } from '@/types/workflow'
import { getShouldConfirmNodeDelete, setShouldConfirmNodeDelete } from '@/utils/workflow/nodeDeleteConfirmStorage'

const getConfirmMessage = (nodes: WorkflowNodeType[]) => {
	const target = nodes.length === 1 ? `'${nodes[0].data.title}' 노드를` : `노드 ${nodes.length}개를`
	return `${target} 삭제할까요? 이어진 연결선도 함께 삭제돼요.`
}

/**
 * 캔버스에서 노드를 지우기 전에 확인 창으로 묻는 함수를 돌려준다. 확인하면 true, 닫거나 취소하면 false로 끝난다.
 * '다시 묻지 않기'를 체크하고 확인하면 그 설정을 브라우저에 저장하고, 이후에는 묻지 않고 바로 true로 끝난다.
 * 설정은 계정 설정 화면에서 다시 켤 수 있다. 이 훅을 쓰는 캔버스가 언마운트되면 그 캔버스가 연 확인 창은 취소로 닫는다.
 */
export const useNodeDeleteConfirm = () => {
	const openConfirm = useModalStore(state => state.openConfirm)
	// 지금 떠 있는 이 캔버스의 확인 창을 취소하는 콜백. 전역 모달의 onCancel과 같은지로 다른 화면이 연 창과 구분한다.
	const pendingRef = useRef<{ cancel: (() => void) | null }>({ cancel: null })

	// 캔버스가 다시 마운트되면(채팅 반영·저장) 기다리던 삭제는 이어지지 않는다. 남은 창에서 '삭제'를 눌러도 아무 일이 없고
	// '다시 묻지 않기'만 저장되지 않게 창을 닫는다.
	useEffect(() => {
		const pending = pendingRef.current
		return () => {
			const { isOpen, onCancel, close } = useModalStore.getState()
			if (isOpen && pending.cancel && onCancel === pending.cancel) close()
		}
	}, [])

	return (nodes: WorkflowNodeType[]): Promise<boolean> => {
		if (!getShouldConfirmNodeDelete()) return Promise.resolve(true)
		const pending = pendingRef.current
		return new Promise(resolve => {
			const handleCancel = () => {
				pending.cancel = null
				resolve(false)
			}
			pending.cancel = handleCancel
			openConfirm({
				title: '노드 삭제',
				message: getConfirmMessage(nodes),
				confirmText: '삭제',
				variant: 'danger',
				checkboxLabel: '다시 묻지 않기',
				onConfirm: ({ isChecked }) => {
					pending.cancel = null
					if (isChecked) setShouldConfirmNodeDelete(false)
					resolve(true)
				},
				onCancel: handleCancel,
			})
		})
	}
}
