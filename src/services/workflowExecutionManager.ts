import { subscribeSSE } from '@/api/sse'
import { executeWorkflow } from '@/api/workflow'
import { useAuthStore } from '@/stores/useAuthStore'
import { useExecutionStore } from '@/stores/useExecutionStore'
import type { WorkflowExecutionPhase } from '@/stores/useExecutionStore'
import type { ExecutionEvent, ExecutionEventType } from '@/types/workflowExecution'

type Session = {
	requestId: number
	executionId: string | null
	controller: AbortController | null
	seen: Set<string>
}

const sessions = new Map<string, Session>()
let nextRequestId = 0

const eventTypes: ReadonlySet<ExecutionEventType> = new Set([
	'NODE_STARTED',
	'NODE_COMPLETED',
	'NODE_FAILED',
	'APPROVAL_REQUESTED',
	'EXECUTION_COMPLETED',
])

const getApiBaseUrl = (): string | null => {
	const apiUrl = import.meta.env.VITE_API_URL?.trim()
	return apiUrl ? apiUrl.replace(/\/$/, '') : null
}

const parseExecutionEvent = (raw: string): ExecutionEvent | null => {
	try {
		const value: unknown = JSON.parse(raw)
		if (!value || typeof value !== 'object') return null
		const event = value as Partial<ExecutionEvent>
		if (
			typeof event.type !== 'string' ||
			!eventTypes.has(event.type as ExecutionEventType) ||
			typeof event.workflowId !== 'string' ||
			typeof event.executionId !== 'string' ||
			(event.nodeId !== undefined && typeof event.nodeId !== 'string')
		) {
			return null
		}
		return event as ExecutionEvent
	} catch {
		return null
	}
}

const isCurrent = (workflowId: string, session: Session): boolean => sessions.get(workflowId) === session

const closeSession = (
	workflowId: string,
	session: Session,
	phase: Extract<WorkflowExecutionPhase, 'success' | 'failed' | 'waitingApproval' | 'interrupted' | 'requestFailed'>,
	errorMessage?: string
) => {
	if (!isCurrent(workflowId, session)) return
	sessions.delete(workflowId)
	useExecutionStore.getState().finish(workflowId, session.requestId, phase, errorMessage)
	session.controller?.abort()
}

const handleEvent = (workflowId: string, session: Session, raw: string) => {
	if (!isCurrent(workflowId, session)) return
	const event = parseExecutionEvent(raw)
	if (!event || event.workflowId !== workflowId || event.executionId !== session.executionId) return
	if (event.type !== 'EXECUTION_COMPLETED' && !event.nodeId) return
	if (event.type === 'NODE_COMPLETED' && event.status !== 'SUCCESS' && event.status !== 'SKIPPED') return

	// 늦은 구독의 스냅샷과 live 이벤트가 같은 노드 종료를 중복 전달할 수 있다.
	const key = `${event.nodeId ?? ''}:${event.type}`
	if (session.seen.has(key)) return
	session.seen.add(key)

	if (event.type === 'EXECUTION_COMPLETED') {
		if (event.executionStatus === 'SUCCESS') closeSession(workflowId, session, 'success')
		else if (event.executionStatus === 'FAILED') closeSession(workflowId, session, 'failed')
		else if (event.executionStatus === 'WAITING_APPROVAL') closeSession(workflowId, session, 'waitingApproval')
		else closeSession(workflowId, session, 'interrupted', '실행 결과를 확인할 수 없어요.')
		return
	}

	if (!event.nodeId) return
	const store = useExecutionStore.getState()
	if (event.type === 'NODE_STARTED') store.setNodeStatus(workflowId, session.requestId, event.nodeId, 'running')
	else if (event.type === 'NODE_COMPLETED') {
		store.setNodeStatus(workflowId, session.requestId, event.nodeId, event.status === 'SKIPPED' ? 'skipped' : 'success')
	} else if (event.type === 'NODE_FAILED') store.setNodeStatus(workflowId, session.requestId, event.nodeId, 'failed')
	else if (event.type === 'APPROVAL_REQUESTED') {
		store.setNodeStatus(workflowId, session.requestId, event.nodeId, 'waitingApproval')
	}
}

/** 현재 탭에서 workflow별 요청과 SSE를 추적한다. 화면 이동은 구독을 종료하지 않는다. */
export const executeWorkflowTracked = async (workflowId: string): Promise<string | undefined> => {
	if (!workflowId || sessions.has(workflowId)) return undefined
	if (useExecutionStore.getState().executions[workflowId]?.phase === 'waitingApproval') return undefined

	const session: Session = { requestId: ++nextRequestId, executionId: null, controller: null, seen: new Set() }
	sessions.set(workflowId, session)
	useExecutionStore.getState().begin(workflowId, session.requestId)

	try {
		if (!useAuthStore.getState().accessToken) throw new Error('로그인이 필요해요.')
		const baseUrl = getApiBaseUrl()
		if (!baseUrl) throw new Error('API 주소가 설정되지 않았어요.')

		const response = await executeWorkflow(workflowId)
		if (!isCurrent(workflowId, session)) return undefined
		const executionId = response.data.id
		if (typeof executionId !== 'string' || !executionId.trim()) throw new Error('실행 ID를 받지 못했어요.')

		// POST가 인증 갱신을 거쳤을 수 있으므로 SSE에는 현재 토큰을 사용한다.
		const token = useAuthStore.getState().accessToken
		if (!token) throw new Error('로그인이 필요해요.')
		session.executionId = executionId
		session.controller = new AbortController()
		useExecutionStore.getState().attach(workflowId, session.requestId, executionId)

		void subscribeSSE({
			url: `${baseUrl}/api/v1/workflows/${workflowId}/executions/${executionId}/events`,
			token,
			signal: session.controller.signal,
			onEvent: raw => handleEvent(workflowId, session, raw),
			onDone: () => closeSession(workflowId, session, 'interrupted', '실행 추적이 종료되어 결과를 확인할 수 없어요.'),
			onError: () => closeSession(workflowId, session, 'interrupted', '실행 추적 연결이 끊겼어요.'),
		})

		return executionId
	} catch (error) {
		if (!isCurrent(workflowId, session)) return undefined
		closeSession(workflowId, session, 'requestFailed', error instanceof Error ? error.message : undefined)
		throw error
	}
}

/** 로그아웃이나 앱 종료 시 모든 구독을 닫고 탭의 실행 상태를 비운다. */
export const disposeExecutionTracking = () => {
	const activeSessions = [...sessions.values()]
	sessions.clear()
	for (const session of activeSessions) session.controller?.abort()
	useExecutionStore.getState().resetAll()
}

useAuthStore.subscribe((state, previous) => {
	if (previous.accessToken && !state.accessToken) disposeExecutionTracking()
})
