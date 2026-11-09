import { useLayoutEffect, useRef, useState } from 'react'
import { useToggleWorkflowMutation } from '@/hooks/workflow/mutations/useToggleWorkflowMutation'
import type { WorkflowRevalidateResult } from '@/types/workflowValidation'
import { useModalStore } from '@/stores/useModalStore'
import { isApiError } from '@/utils/ApiError'

type UseWorkflowActivationOptions = {
	workflowId: string | undefined
	/** 서버에 저장된 활성 상태. 요청 중에는 바꾸려는 값을 먼저 보여 준다. */
	serverActive: boolean | undefined
	/** 켜기 전에 서버 검사를 다시 돌린다. 활성화 API는 서버에서 검사하지 않는다. */
	revalidate: () => Promise<WorkflowRevalidateResult>
}

type UseWorkflowActivationResult = {
	active: boolean | undefined
	handleToggleActive: () => Promise<void>
}

/**
 * 편집 화면의 활성화 토글을 관리한다.
 * 켤 때는 먼저 다시 검사하고, 문제가 있거나 검사할 수 없으면 확인 창을 띄운다. 막지는 않는다. 끌 때는 검사하지 않는다.
 * 다른 워크플로우로 옮긴 뒤 도착한 검사·토글 응답은 확인 창이나 오류 모달을 열지 않는다.
 */
export const useWorkflowActivation = ({
	workflowId,
	serverActive,
	revalidate,
}: UseWorkflowActivationOptions): UseWorkflowActivationResult => {
	const openModal = useModalStore(state => state.open)
	const openConfirm = useModalStore(state => state.openConfirm)
	const toggleMutation = useToggleWorkflowMutation(workflowId ?? '')
	const [localActive, setLocalActive] = useState<{ workflowId: string; requestId: number; value: boolean } | null>(null)
	if (localActive && localActive.workflowId !== workflowId) setLocalActive(null)
	const active = localActive && localActive.workflowId === workflowId ? localActive.value : serverActive
	const toggleRequestId = useRef(0)
	const currentWorkflowId = useRef(workflowId)
	// 켜기 전 검사가 끝나기 전에 다시 누르면 검사·확인 창이 겹치므로 무시한다.
	const isCheckingRef = useRef(false)

	useLayoutEffect(() => {
		toggleRequestId.current += 1
		currentWorkflowId.current = workflowId
		return () => {
			if (currentWorkflowId.current === workflowId) currentWorkflowId.current = undefined
		}
	}, [workflowId])

	const isCurrentRequest = (targetWorkflowId: string, requestId: number) =>
		currentWorkflowId.current === targetWorkflowId && toggleRequestId.current === requestId

	const commit = async (targetWorkflowId: string, next: boolean) => {
		const requestId = ++toggleRequestId.current
		setLocalActive({ workflowId: targetWorkflowId, requestId, value: next })
		try {
			await toggleMutation.mutateAsync(next)
		} catch (error) {
			if (isCurrentRequest(targetWorkflowId, requestId)) {
				openModal('오류', isApiError(error) ? error.message : '상태 변경에 실패했어요. 다시 시도해주세요.')
			}
		} finally {
			setLocalActive(current =>
				current?.workflowId === targetWorkflowId && current.requestId === requestId ? null : current
			)
		}
	}

	const handleToggleActive = async () => {
		if (!workflowId || isCheckingRef.current) return
		if (active) {
			await commit(workflowId, false)
			return
		}

		const requestId = ++toggleRequestId.current
		isCheckingRef.current = true
		let result: WorkflowRevalidateResult
		try {
			result = await revalidate()
		} finally {
			isCheckingRef.current = false
		}
		if (!isCurrentRequest(workflowId, requestId)) return
		if (result.status === 'ok' && result.errorCount === 0) {
			await commit(workflowId, true)
			return
		}

		openConfirm({
			...(result.status === 'ok'
				? {
						title: '문제가 있는 채로 켤까요?',
						message: `서버 검사에서 문제 ${result.errorCount}건을 찾았어요. 이대로 켜면 실행될 때마다 실패해요.`,
					}
				: { title: '설정을 검사하지 못했어요', message: '지금은 설정을 검사할 수 없어요. 그래도 켤까요?' }),
			confirmText: '그래도 켜기',
			onConfirm: () => {
				if (isCurrentRequest(workflowId, requestId)) void commit(workflowId, true)
			},
		})
	}

	return { active, handleToggleActive }
}
