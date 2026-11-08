import { useLayoutEffect, useRef } from 'react'
import { useWorkflowExecution } from '@/hooks/workflow/useWorkflowExecution'
import { useExecutionStore } from '@/stores/useExecutionStore'
import { useModalStore } from '@/stores/useModalStore'

type UseWorkflowExecuteCommandOptions = {
	workflowId: string | undefined
	/** 실행 요청이 실패하면 요청 당시의 워크플로우 id와 오류를 넘긴다. 정적 검사 400을 검사 결과로 반영하는 데 쓴다. */
	onExecutionError: (workflowId: string, error: unknown) => void
}

/**
 * 편집 화면의 수동 실행 명령과 실행 상태를 제공한다.
 * 중단된 실행을 다시 실행할 때는 확인 창을 띄우고, 확인 사이에 화면·실행이 바뀌었으면 실행하지 않는다.
 * 실행 요청 오류는 화면에 직접 알리지 않고 `onExecutionError`로만 넘긴다.
 */
export const useWorkflowExecuteCommand = ({ workflowId, onExecutionError }: UseWorkflowExecuteCommandOptions) => {
	const openConfirm = useModalStore(state => state.openConfirm)
	const { execute, phase, isExecuting, canExecute, nodeStatus, requestId } = useWorkflowExecution(workflowId ?? '')
	const currentWorkflowId = useRef(workflowId)
	const executionVisitId = useRef(0)

	useLayoutEffect(() => {
		executionVisitId.current += 1
		currentWorkflowId.current = workflowId
		return () => {
			if (currentWorkflowId.current === workflowId) currentWorkflowId.current = undefined
		}
	}, [workflowId])

	const runExecution = () => {
		const targetWorkflowId = workflowId ?? ''
		void execute().catch(error => onExecutionError(targetWorkflowId, error))
	}

	const handleExecute = () => {
		if (!canExecute) return
		if (phase === 'interrupted') {
			const selectedWorkflowId = workflowId
			const selectedVisitId = executionVisitId.current
			openConfirm({
				title: '다시 실행할까요?',
				message: '이전 실행이 서버에서 계속되고 있을 수 있어요. 새로 실행하면 작업이 중복될 수 있습니다.',
				confirmText: '새로 실행',
				onConfirm: () => {
					const current = useExecutionStore.getState().executions[selectedWorkflowId ?? '']
					if (
						currentWorkflowId.current !== selectedWorkflowId ||
						executionVisitId.current !== selectedVisitId ||
						current?.requestId !== requestId ||
						current.phase !== 'interrupted'
					)
						return
					runExecution()
				},
			})
			return
		}
		runExecution()
	}

	return { phase, isExecuting, canExecute, nodeStatus, handleExecute }
}
