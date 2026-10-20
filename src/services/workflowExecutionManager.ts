import { subscribeSSE } from '@/api/sse'
import { executeWorkflow } from '@/api/workflow'
import { refreshAccessToken, subscribeAuthSessionChange } from '@/services/authRefresh'
import { useAuthStore } from '@/stores/useAuthStore'
import { useExecutionStore } from '@/stores/useExecutionStore'
import type { WorkflowExecutionPhase } from '@/stores/useExecutionStore'
import type { ExecutionEvent, ExecutionEventType } from '@/types/workflowExecution'

type Session = {
	requestId: number
	executionId: string | null
	requestController: AbortController
	controller: AbortController | null
	seen: Set<string>
	connection: number
	retryAttempt: number
	retryTimer: ReturnType<typeof setTimeout> | null
	refreshController: AbortController | null
	authRefreshAttempted: boolean
}

const sessions = new Map<string, Session>()
let nextRequestId = 0
const reconnectDelays = [1000, 2000, 4000, 8000, 16000, 30000] as const
const stableConnectionMs = 30000

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
	if (session.retryTimer !== null) clearTimeout(session.retryTimer)
	session.retryTimer = null
	session.connection++
	session.refreshController?.abort()
	session.refreshController = null
	useExecutionStore.getState().finish(workflowId, session.requestId, phase, errorMessage)
	session.requestController.abort()
	session.controller?.abort()
}

/** Retry only the tracking GET. The execution POST must never be repeated by reconnect logic. */
const connectSession = (workflowId: string, session: Session, baseUrl: string) => {
	if (!isCurrent(workflowId, session) || !session.executionId) return
	const token = useAuthStore.getState().accessToken
	if (!token) {
		closeSession(workflowId, session, 'interrupted', '로그인이 필요해요.')
		return
	}
	const connection = ++session.connection
	const controller = new AbortController()
	session.controller = controller
	let openedAt: number | null = null
	let settled = false
	const currentConnection = () => isCurrent(workflowId, session) && session.connection === connection
	const disconnected = (error?: unknown) => {
		if (!currentConnection() || settled || controller.signal.aborted) return
		settled = true
		controller.abort()
		const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined
		if (status === 403) {
			closeSession(workflowId, session, 'interrupted', '실행 추적 권한을 확인할 수 없어요. 다시 로그인해 주세요.')
			return
		}
		if (status === 401) {
			if (session.authRefreshAttempted) {
				closeSession(
					workflowId,
					session,
					'interrupted',
					'인증 갱신 후에도 실행을 추적하지 못했어요. 다시 로그인해 주세요.'
				)
				return
			}
			session.authRefreshAttempted = true
			const refresh = new AbortController()
			session.refreshController = refresh
			void refreshAccessToken(token, refresh.signal).then(
				() => {
					if (!currentConnection() || refresh.signal.aborted) return
					session.refreshController = null
					connectSession(workflowId, session, baseUrl)
				},
				() => {
					if (!currentConnection() || refresh.signal.aborted) return
					closeSession(workflowId, session, 'interrupted', '인증을 갱신하지 못했어요. 다시 로그인해 주세요.')
				}
			)
			return
		}
		// Long-lived, successful streams rotate at the server timeout without exhausting retries.
		// Immediate EOFs/replayed snapshots do not reset the consecutive failure budget.
		if (openedAt !== null && Date.now() - openedAt >= stableConnectionMs) {
			session.retryAttempt = 0
			session.authRefreshAttempted = false
		}
		const delay = reconnectDelays[session.retryAttempt]
		if (delay === undefined) {
			closeSession(
				workflowId,
				session,
				'interrupted',
				'실행 추적에 다시 연결하지 못했어요. 이전 실행은 서버에서 계속될 수 있어요.'
			)
			return
		}
		session.retryAttempt++
		session.retryTimer = setTimeout(() => {
			session.retryTimer = null
			if (currentConnection()) connectSession(workflowId, session, baseUrl)
		}, delay)
	}
	try {
		void subscribeSSE({
			url: `${baseUrl}/api/v1/workflows/${workflowId}/executions/${session.executionId}/events`,
			token,
			signal: controller.signal,
			onOpen: () => {
				if (currentConnection() && !settled) openedAt = Date.now()
			},
			onEvent: raw => {
				if (currentConnection() && !settled && !controller.signal.aborted) handleEvent(workflowId, session, raw)
			},
			onDone: () => disconnected(),
			onError: disconnected,
		}).catch(disconnected)
	} catch (error) {
		disconnected(error)
	}
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

	const session: Session = {
		requestId: ++nextRequestId,
		executionId: null,
		requestController: new AbortController(),
		controller: null,
		seen: new Set(),
		connection: 0,
		retryAttempt: 0,
		retryTimer: null,
		refreshController: null,
		authRefreshAttempted: false,
	}
	sessions.set(workflowId, session)
	useExecutionStore.getState().begin(workflowId, session.requestId)

	try {
		if (!useAuthStore.getState().accessToken) throw new Error('로그인이 필요해요.')
		const baseUrl = getApiBaseUrl()
		if (!baseUrl) throw new Error('API 주소가 설정되지 않았어요.')

		const response = await executeWorkflow(workflowId, undefined, session.requestController.signal)
		if (!isCurrent(workflowId, session)) return undefined
		const executionId = response.data.id
		if (typeof executionId !== 'string' || !executionId.trim()) throw new Error('실행 ID를 받지 못했어요.')

		// POST가 인증 갱신을 거쳤을 수 있으므로 SSE에는 현재 토큰을 사용한다.
		if (!useAuthStore.getState().accessToken) throw new Error('로그인이 필요해요.')
		session.executionId = executionId
		useExecutionStore.getState().attach(workflowId, session.requestId, executionId)
		connectSession(workflowId, session, baseUrl)

		return executionId
	} catch (error) {
		if (!isCurrent(workflowId, session)) return undefined
		closeSession(workflowId, session, 'requestFailed', error instanceof Error ? error.message : undefined)
		throw error
	}
}

/** 계정 전환, 로그아웃이나 앱 종료 시 대기 요청과 구독을 닫고 탭의 실행 상태를 비운다. */
export const disposeExecutionTracking = () => {
	const activeSessions = [...sessions.values()]
	sessions.clear()
	for (const session of activeSessions) {
		if (session.retryTimer !== null) clearTimeout(session.retryTimer)
		session.refreshController?.abort()
		session.requestController.abort()
		session.controller?.abort()
	}
	useExecutionStore.getState().resetAll()
}

subscribeAuthSessionChange(disposeExecutionTracking)
