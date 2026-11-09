import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { nodeTestSampleQueryOptions } from '@/hooks/workflow/queries/nodeTestSampleQueryOptions'
import type { NodeTestResult } from '@/types/nodeTest'
import { getListenWindow, isSampleRecordedSince } from '@/utils/workflow/nodeTest'

/** 수신 대기 중 샘플을 다시 조회하는 간격. 2026-11-09 사용자 결정. */
const LISTEN_POLL_INTERVAL_MS = 5_000
const CLOCK_TICK_MS = 1_000

type ListenSession = ReturnType<typeof getListenWindow>

type UseWebhookListenOptions = {
	workflowId: string
	nodeId: string
}

type UseWebhookListenResult = {
	isListening: boolean
	/** 요청을 받지 못하고 대기 시간이 끝났다. 다시 테스트하면 사라진다. */
	isExpired: boolean
	remainingMs: number
	/** `LISTENING` 응답의 `expiresAt`으로 대기를 시작한다. */
	start: (expiresAt: string | undefined) => void
	stop: () => void
}

/**
 * `webhook.catch` 테스트가 `LISTENING`을 받은 뒤 수신 주소로 들어올 첫 요청을 기다린다.
 * 서버는 대기 중에도 직전 샘플을 돌려주므로, 대기를 시작한 뒤(서버 시각) 기록된 샘플이 오면 받은 것으로 본다.
 * 그래서 '대기 그만' 뒤 서버 대기가 받은 요청이나 다른 곳에서 바뀐 샘플을 새 대기의 수신으로 착각하지 않는다.
 * 받은 샘플은 같은 샘플 캐시에 들어가 테스트 영역과 출력 참조 피커가 그대로 보여 준다.
 * 폴링은 받기·만료·`stop`·언마운트(패널 닫기, 노드 변경) 중 먼저 일어난 때 멈춘다. 서버 대기는 만료까지 남는다.
 */
export const useWebhookListen = ({ workflowId, nodeId }: UseWebhookListenOptions): UseWebhookListenResult => {
	const [session, setSession] = useState<ListenSession | null>(null)
	const [now, setNow] = useState(() => Date.now())

	const isReceived = (sample: NodeTestResult | null | undefined) =>
		Boolean(session && sample && isSampleRecordedSince(sample.testedAt, session.serverStartedAt))
	const isWaitingFor = (sample: NodeTestResult | null | undefined) =>
		Boolean(session && !isReceived(sample) && now < session.deadline)

	const { data: sample } = useQuery({
		...nodeTestSampleQueryOptions(workflowId, nodeId),
		// 받은 샘플로 폴링을 멈추려면 이 관찰자가 받은 최신 값으로 판정해야 한다.
		enabled: query => isWaitingFor(query.state.data),
		refetchInterval: LISTEN_POLL_INTERVAL_MS,
		// 요청을 보내려고 다른 탭으로 옮겨 가도 계속 확인한다. 대기는 5분 뒤 끝난다.
		refetchIntervalInBackground: true,
	})
	const hasReceived = isReceived(sample)
	const isWaiting = isWaitingFor(sample)

	useEffect(() => {
		if (!isWaiting) return
		const timer = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
		return () => window.clearInterval(timer)
	}, [isWaiting])

	const start = (expiresAt: string | undefined) => {
		const startedAt = Date.now()
		setNow(startedAt)
		setSession(getListenWindow(expiresAt, startedAt))
	}

	return {
		isListening: isWaiting,
		isExpired: Boolean(session && !hasReceived && now >= session.deadline),
		remainingMs: session ? Math.max(0, session.deadline - now) : 0,
		start,
		stop: () => setSession(null),
	}
}
