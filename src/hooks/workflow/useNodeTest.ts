import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTestWorkflowNodeMutation } from '@/hooks/workflow/mutations/useTestWorkflowNodeMutation'
import { nodeTestSampleQueryOptions } from '@/hooks/workflow/queries/nodeTestSampleQueryOptions'
import { webhookTokenStatusQueryOptions } from '@/hooks/workflow/queries/webhookTokenQueryOptions'
import { useWebhookListen } from '@/hooks/workflow/useWebhookListen'
import { useModalStore } from '@/stores/useModalStore'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { NodeTestResult } from '@/types/nodeTest'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { isApiError } from '@/utils/ApiError'
import {
	formatRemainingTime,
	getMissingSampleNodeIds,
	getNodeTestAvailability,
	getNodeTestErrorMessage,
	isWebhookCatch,
	requiresRunConfirm,
} from '@/utils/workflow/nodeTest'
import { isSameNodeDefinition } from '@/utils/workflow/isSameNodeDefinition'

type UseNodeTestOptions = {
	workflowId: string
	/** 편집 중인 노드. 저장하지 않은 변경도 그대로 테스트한다. */
	node: WorkflowNodeDto
	/** 노드 event의 카탈로그 항목. 찾지 못했으면 테스트를 끈다. */
	entry: NodeCatalogEntry | undefined
	/** 먼저 테스트해야 하는 노드의 라벨을 찾을 편집 문서 노드 */
	nodes: WorkflowNodeDto[]
	/** 서버에 저장된 같은 id의 노드. 없으면 아직 저장하지 않은 노드다. */
	savedNode: WorkflowNodeDto | undefined
}

/** 먼저 테스트해야 하는 노드. 편집 문서에서 찾지 못한 노드는 `label`이 없다. */
type MissingSampleNode = { id: string; label?: string }

/**
 * 설정 패널에서 노드 하나를 테스트하는 ViewModel.
 * 패널을 열면 최신 샘플을 불러오고, 테스트를 실행하면 그 결과를 우선해 보여 준다.
 * action 노드는 실제 발송·사용량 차감이 일어나므로 확인 모달을 거쳐 실행한다.
 * `webhook.catch`는 실행하지 않고 수신 대기(`LISTENING`)를 시작해 받은 요청을 샘플로 기다린다.
 * 받은 요청은 저장된 노드 설정으로 처리되므로 저장본과 같고 수신 주소가 있을 때만 테스트할 수 있다.
 */
export const useNodeTest = ({ workflowId, node, entry, nodes, savedNode }: UseNodeTestOptions) => {
	const queryClient = useQueryClient()
	const openConfirm = useModalStore(state => state.openConfirm)
	const isWebhook = isWebhookCatch(entry)
	const sampleQuery = useQuery(nodeTestSampleQueryOptions(workflowId, node.id))
	const tokenStatusQuery = useQuery({ ...webhookTokenStatusQueryOptions(workflowId), enabled: isWebhook })
	const listen = useWebhookListen({ workflowId, nodeId: node.id })
	const mutation = useTestWorkflowNodeMutation(workflowId)
	const availability = getNodeTestAvailability(entry, {
		isSaved: Boolean(savedNode && isSameNodeDefinition(savedNode, node)),
		isTokenIssued: tokenStatusQuery.data?.issued,
	})
	// mutation은 다시 실행하는 동안과 실패했을 때 `data`·`variables`를 바꾸므로, 마지막으로 받은 결과와
	// 그때 보낸 노드를 따로 둬야 재실행 중에도 이전 결과가 어느 설정 기준인지 알릴 수 있다.
	// 패널이 노드마다 다시 마운트되므로 이 상태는 노드 하나에만 속한다.
	const [lastRun, setLastRun] = useState<{ result: NodeTestResult; node: WorkflowNodeDto }>()

	const execute = (target: WorkflowNodeDto) =>
		mutation.mutate(target, {
			onSuccess: response => {
				const result = response.data
				if (result.status === 'LISTENING') {
					listen.start(result.expiresAt)
					return
				}
				setLastRun({ result, node: target })
			},
			onError: error => {
				// 다른 화면에서 주소를 지웠거나 발급 상태 캐시가 오래됐다. 주소 영역이 '만들기'로 돌아가게 다시 확인한다.
				if (isApiError(error) && error.code === 'WEBHOOK_TOKEN_NOT_ISSUED') {
					void queryClient.invalidateQueries({ queryKey: webhookTokenStatusQueryOptions(workflowId).queryKey })
				}
			},
		})

	const run = () => {
		if (!entry || !availability.canTest || mutation.isPending || listen.isListening) return
		// 확인을 기다리는 동안 노드가 바뀌어도 사용자가 본 설정으로 실행한다.
		const target = node
		if (!requiresRunConfirm(entry)) {
			execute(target)
			return
		}
		openConfirm({
			title: '노드를 실제로 실행할까요?',
			message: '테스트도 실제로 실행돼요. 메시지·요청이 그대로 보내지고, AI 노드는 사용량이 차감돼요.',
			confirmText: '테스트 실행',
			onConfirm: () => execute(target),
		})
	}

	const testedResult = lastRun?.result
	const missingNodeIds = getMissingSampleNodeIds(mutation.error)
	const missingNodes: MissingSampleNode[] = missingNodeIds.map(id => ({
		id,
		label: nodes.find(item => item.id === id)?.label,
	}))

	return {
		availability,
		run,
		isRunning: mutation.isPending,
		/** 이 패널에서 마지막으로 받은 결과, 없으면 서버의 최신 샘플. `null`은 아직 테스트하지 않은 노드다. */
		result: testedResult ?? sampleQuery.data,
		isSampleLoading: !testedResult && sampleQuery.isPending,
		isSampleError: !testedResult && sampleQuery.isError,
		retrySample: () => void sampleQuery.refetch(),
		/** 마지막으로 받은 결과 뒤에 노드 설정을 바꿨으면 true. 서버에서 불러온 샘플은 기준 설정을 알 수 없어 false다. */
		isOutdated: Boolean(lastRun && !isSameNodeDefinition(lastRun.node, node)),
		missingNodes,
		errorMessage: mutation.isError && missingNodes.length === 0 ? getNodeTestErrorMessage(mutation.error) : undefined,
		isWebhook,
		isListening: listen.isListening,
		/** 요청을 받지 못하고 대기 시간이 끝났다. */
		isListenExpired: listen.isExpired,
		listenRemainingLabel: formatRemainingTime(listen.remainingMs),
		stopListening: listen.stop,
	}
}
