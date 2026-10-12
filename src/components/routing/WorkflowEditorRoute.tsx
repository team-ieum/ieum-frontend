import { Suspense } from 'react'
import { useParams } from 'react-router'
import { LazyWorkflowEditorPage } from '@/app/lazyModules'
import { WorkflowDetailSkeleton } from '@/components/workflow/WorkflowDetailAsyncState'
import { useWorkflowDetailPrefetch } from '@/hooks/workflow/queries/useWorkflowDetailPrefetch'

// 상세 query는 lazy page 안에서 시작되므로, chunk를 기다리는 동안 상세 데이터도 함께 받도록 route에서 먼저 요청한다.
const WorkflowDetailPrefetch = ({ workflowId }: { workflowId: string }) => {
	useWorkflowDetailPrefetch(workflowId)
	return null
}

/** `workflow/new`와 `workflow/:workflowId`의 편집 page를 lazy chunk로 렌더하고, chunk를 받는 동안 page shell을 표시한다. */
export const WorkflowEditorRoute = () => {
	const { workflowId } = useParams<{ workflowId: string }>()

	return (
		<>
			{workflowId && <WorkflowDetailPrefetch workflowId={workflowId} />}
			<Suspense fallback={<WorkflowDetailSkeleton label={workflowId ? undefined : '워크플로우 편집 화면 불러오는 중'} />}>
				<LazyWorkflowEditorPage />
			</Suspense>
		</>
	)
}
