import { useCallback, useEffect, useRef } from 'react'
import { subscribeSSE } from '@/api/sse'
import { executeWorkflow } from '@/api/workflow'
import { useAuthStore } from '@/stores/useAuthStore'
import { useExecutionStore } from '@/stores/useExecutionStore'
import type { ExecutionEvent } from '@/types/workflowExecution'

// 실행 종료 후 노드 상태 비주얼을 잠시 유지했다가 정리한다 (성공/실패 확인 여유)
const RESET_DELAY_MS = 8000

const getApiBaseUrl = (): string | null => {
	const apiUrl = import.meta.env.VITE_API_URL?.trim()
	return apiUrl ? apiUrl.replace(/\/$/, '') : null
}

export const useWorkflowExecution = (workflowId: string) => {
	const accessToken = useAuthStore(state => state.accessToken)
	const isExecuting = useExecutionStore(state => state.isExecuting)
	const start = useExecutionStore(state => state.start)
	const setNodeStatus = useExecutionStore(state => state.setNodeStatus)
	const finish = useExecutionStore(state => state.finish)
	const reset = useExecutionStore(state => state.reset)

	const abortRef = useRef<AbortController | null>(null)
	const seenRef = useRef<Set<string>>(new Set())
	const resetTimerRef = useRef<number | null>(null)

	const cleanup = useCallback(() => {
		abortRef.current?.abort()
		abortRef.current = null
		if (resetTimerRef.current !== null) {
			window.clearTimeout(resetTimerRef.current)
			resetTimerRef.current = null
		}
	}, [])

	useEffect(() => cleanup, [cleanup])

	// 실행 종료(완료/에러/정상 EOF) 시 공통 정리. 기존 타이머를 비워 중복 예약을 막는다.
	const scheduleReset = useCallback(() => {
		finish()
		if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
		resetTimerRef.current = window.setTimeout(() => reset(), RESET_DELAY_MS)
	}, [finish, reset])

	const handleEvent = useCallback(
		(raw: string) => {
			let event: ExecutionEvent
			try {
				event = JSON.parse(raw) as ExecutionEvent
			} catch {
				return
			}

			// 스냅샷 재생으로 동일 이벤트가 중복될 수 있어 nodeId+type로 멱등 처리한다.
			const key = `${event.nodeId ?? ''}:${event.type}`
			if (seenRef.current.has(key)) return
			seenRef.current.add(key)

			if (event.type === 'EXECUTION_COMPLETED') {
				scheduleReset()
				abortRef.current?.abort()
				abortRef.current = null
				return
			}

			if (!event.nodeId) return

			// 스냅샷+라이브 순서가 역전될 수 있어(예: COMPLETED가 STARTED보다 먼저 도착)
			// terminal(success/failed) 상태는 running으로 되돌리지 않는다.
			const current = useExecutionStore.getState().nodeStatus[event.nodeId]
			const isTerminal = current === 'success' || current === 'failed'

			if (event.type === 'NODE_STARTED') {
				if (!isTerminal) setNodeStatus(event.nodeId, 'running')
			} else if (event.type === 'NODE_COMPLETED') setNodeStatus(event.nodeId, 'success')
			else if (event.type === 'NODE_FAILED') setNodeStatus(event.nodeId, 'failed')
		},
		[scheduleReset, setNodeStatus]
	)

	const execute = useCallback(async () => {
		if (!workflowId || isExecuting) return
		if (!accessToken) throw new Error('로그인이 필요해요.')

		const baseUrl = getApiBaseUrl()
		if (!baseUrl) throw new Error('API 주소가 설정되지 않았어요.')

		const response = await executeWorkflow(workflowId)
		const executionId = response.data.id
		if (!executionId) throw new Error('실행 ID를 받지 못했어요.')

		cleanup()
		seenRef.current = new Set()
		start(executionId)

		const controller = new AbortController()
		abortRef.current = controller

		const sseUrl = `${baseUrl}/api/v1/workflows/${workflowId}/executions/${executionId}/events`
		void subscribeSSE({
			url: sseUrl,
			token: accessToken,
			signal: controller.signal,
			onEvent: handleEvent,
			// 정상 EOF(onDone)·에러(onError) 모두 실행 상태를 정리한다 (isExecuting 영구 set 방지).
			onDone: scheduleReset,
			onError: scheduleReset,
		})

		return executionId
	}, [accessToken, cleanup, isExecuting, scheduleReset, handleEvent, start, workflowId])

	return { execute, isExecuting }
}
