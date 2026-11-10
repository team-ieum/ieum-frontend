import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useIssueWebhookTokenMutation } from '@/hooks/workflow/mutations/useIssueWebhookTokenMutation'
import {
	webhookTokenAddressQueryOptions,
	webhookTokenStatusQueryOptions,
} from '@/hooks/workflow/queries/webhookTokenQueryOptions'
import { useModalStore } from '@/stores/useModalStore'
import { formatServerDateTime } from '@/utils/workflow/formatServerDateTime'
import { toWebhookUrl } from '@/utils/workflow/webhookToken'

type WebhookTokenState = 'loading' | 'error' | 'notIssued' | 'issued'

type CopyState = 'idle' | 'copied' | 'failed'

type UseWebhookTokenResult = {
	state: WebhookTokenState
	/** 이 화면에서 발급받은 전체 수신 주소. 발급됐어도 새로고침 뒤에는 다시 볼 수 없어 `undefined`다. */
	url?: string
	issuedAtLabel?: string
	isIssuing: boolean
	issueErrorMessage?: string
	copyState: CopyState
	retry: () => void
	/** 처음이면 바로 발급하고, 이미 있으면 이전 주소가 끊긴다는 확인을 받은 뒤 재발급한다. */
	handleIssue: () => void
	handleCopy: () => Promise<void>
}

const ISSUE_ERROR_MESSAGE = '수신 주소를 만들지 못했어요. 잠시 후 다시 시도해 주세요.'

/** `webhook.catch` 노드의 수신 주소를 발급·재발급하고 복사하는 ViewModel. */
export const useWebhookToken = (workflowId: string): UseWebhookTokenResult => {
	const openConfirm = useModalStore(state => state.openConfirm)
	const statusQuery = useQuery(webhookTokenStatusQueryOptions(workflowId))
	const { data: address } = useQuery(webhookTokenAddressQueryOptions(workflowId))
	const mutation = useIssueWebhookTokenMutation(workflowId)
	const [issueErrorMessage, setIssueErrorMessage] = useState<string>()
	const [copyState, setCopyState] = useState<CopyState>('idle')

	const issue = async () => {
		setIssueErrorMessage(undefined)
		setCopyState('idle')
		try {
			await mutation.mutateAsync()
		} catch {
			setIssueErrorMessage(ISSUE_ERROR_MESSAGE)
		}
	}

	const handleIssue = () => {
		if (mutation.isPending) return
		if (!statusQuery.data?.issued) {
			void issue()
			return
		}
		openConfirm({
			title: '새 수신 주소를 만들까요?',
			message: '지금 쓰는 주소는 바로 끊겨요. 이 주소를 등록해 둔 외부 서비스에는 새 주소를 다시 등록해야 해요.',
			confirmText: '새 주소 만들기',
			variant: 'danger',
			onConfirm: () => void issue(),
		})
	}

	const url = address ? toWebhookUrl(address.path, window.location.origin) : undefined

	const handleCopy = async () => {
		if (!url) return
		try {
			await navigator.clipboard.writeText(url)
			setCopyState('copied')
		} catch {
			// 보안 컨텍스트가 아니거나 권한이 없으면 clipboard API가 없거나 거부된다.
			setCopyState('failed')
		}
	}

	const getState = (): WebhookTokenState => {
		// 다시 불러오다 실패해도 이미 받은 발급 상태는 그대로 보여 준다.
		if (statusQuery.data) return statusQuery.data.issued ? 'issued' : 'notIssued'
		return statusQuery.isError ? 'error' : 'loading'
	}
	const issuedAt = statusQuery.data?.issuedAt

	return {
		state: getState(),
		url,
		issuedAtLabel: issuedAt ? formatServerDateTime(issuedAt) : undefined,
		isIssuing: mutation.isPending,
		issueErrorMessage,
		copyState,
		retry: () => void statusQuery.refetch(),
		handleIssue,
		handleCopy,
	}
}
