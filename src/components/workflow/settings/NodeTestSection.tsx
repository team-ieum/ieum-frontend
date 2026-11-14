import SkeletonPulse from '@/components/common/SkeletonPulse'
import Spinner from '@/components/common/Spinner'
import ManualRunInputField from '@/components/workflow/settings/ManualRunInputField'
import WebhookAddressBox from '@/components/workflow/settings/WebhookAddressBox'
import { useNodeTest } from '@/hooks/workflow/useNodeTest'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { NodeTestResult } from '@/types/nodeTest'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { cn } from '@/utils/cn'
import { formatServerDateTime } from '@/utils/workflow/formatServerDateTime'

type NodeTestSectionProps = {
	workflowId: string
	node: WorkflowNodeDto
	entry: NodeCatalogEntry | undefined
	nodes: WorkflowNodeDto[]
	/** 먼저 테스트해야 하는 노드의 설정 패널을 연다. */
	onNodeOpen: (nodeId: string) => void
	/** 서버에 저장된 같은 id의 노드. `webhook.catch`는 이 노드와 같아야 테스트할 수 있다. */
	savedNode: WorkflowNodeDto | undefined
	/** 워크플로우가 켜져 있으면 `webhook.catch` 테스트로 받은 요청이 실제 실행으로도 이어진다. */
	isWorkflowActive: boolean
}

const STATUS_BADGE: Record<NodeTestResult['status'], { label: string; className: string }> = {
	SUCCESS: { label: '성공', className: 'bg-[#e6f4ee] text-node-green' },
	FAILED: { label: '실패', className: 'bg-danger-100 text-danger-700' },
	LISTENING: { label: '수신 대기', className: 'bg-main-light-blue text-main-deep-blue' },
}

const ResultSkeleton = () => (
	<div role='status' aria-label='이전 테스트 결과 불러오는 중' aria-busy='true' className='flex flex-col gap-2'>
		<SkeletonPulse className='h-5 w-28 rounded bg-neutral-200' />
		<SkeletonPulse className='h-16 w-full rounded-lg bg-neutral-200' />
	</div>
)

const TestResult = ({ result, isOutdated }: { result: NodeTestResult; isOutdated: boolean }) => {
	const badge = STATUS_BADGE[result.status]
	return (
		<div className='flex flex-col gap-2'>
			<div className='flex items-center gap-2'>
				<span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-bold', badge.className)}>{badge.label}</span>
				{result.testedAt ? (
					<span className='text-xs text-neutral-500'>{formatServerDateTime(result.testedAt)}</span>
				) : null}
			</div>
			{isOutdated ? (
				<p className='m-0 text-xs text-[#9a6700]'>설정이나 입력을 바꿨어요. 결과는 바꾸기 전 기준이에요.</p>
			) : null}
			{result.status === 'SUCCESS' ? (
				<pre
					aria-label='테스트 출력'
					className='m-0 max-h-40 overflow-auto rounded-lg bg-neutral-50 p-2 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-neutral-700'
				>
					{JSON.stringify(result.output ?? {}, null, 2)}
				</pre>
			) : null}
			{result.status === 'FAILED' ? (
				<p className='m-0 text-xs leading-relaxed text-danger-700'>{result.error || '실행에 실패했어요.'}</p>
			) : null}
		</div>
	)
}

/**
 * 설정 패널 아래에 고정되는 노드 테스트 영역.
 * 편집 중인 노드를 실제로 실행하고, 결과가 없으면 서버의 최신 샘플을 보여 준다.
 */
const NodeTestSection = ({ workflowId, node, entry, nodes, onNodeOpen, savedNode, isWorkflowActive }: NodeTestSectionProps) => {
	const {
		availability,
		run,
		isRunning,
		result,
		isSampleLoading,
		isSampleError,
		retrySample,
		isOutdated,
		missingNodes,
		errorMessage,
		isWebhook,
		isListening,
		isListenExpired,
		listenRemainingLabel,
		stopListening,
		hasTestInput,
		inputText,
		inputError,
		handleInputChange,
	} = useNodeTest({ workflowId, node, entry, nodes, savedNode })

	const renderResult = () => {
		if (isListening) {
			return (
				<div
					role='status'
					aria-label='수신 대기 중'
					className='flex flex-col gap-1.5 rounded-lg bg-main-light-blue px-3 py-2'
				>
					<div className='flex items-center justify-between gap-2'>
						<span className='typo-caption1_bold text-main-deep-blue'>
							수신 대기 중 · 남은 시간 <span className='tabular-nums'>{listenRemainingLabel}</span>
						</span>
						<button
							type='button'
							onClick={stopListening}
							className='shrink-0 rounded-md px-1.5 py-0.5 typo-caption1_semibold text-main-deep-blue hover:bg-neutral-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
						>
							대기 그만
						</button>
					</div>
					<p className='m-0 typo-caption1_regular text-neutral-700'>
						수신 주소로 GET·POST 요청을 보내 주세요. 처음 받은 요청 1건을 결과로 보여 줘요.
					</p>
				</div>
			)
		}
		if (isSampleLoading) return <ResultSkeleton />
		if (isSampleError) {
			return (
				<div className='flex items-center gap-2 text-xs text-neutral-600'>
					<p className='m-0'>이전 테스트 결과를 불러오지 못했어요.</p>
					<button
						type='button'
						onClick={retrySample}
						className='rounded-md px-1.5 py-0.5 font-semibold text-main-deep-blue hover:bg-neutral-100'
					>
						다시 시도
					</button>
				</div>
			)
		}
		if (!result) return <p className='m-0 text-xs text-neutral-500'>아직 테스트하지 않았어요.</p>
		return <TestResult result={result} isOutdated={isOutdated} />
	}

	const getRunLabel = () => {
		if (isListening) return '대기 중…'
		return isRunning ? '테스트 중…' : '테스트'
	}

	return (
		<section aria-label='노드 테스트' className='flex shrink-0 flex-col gap-2 border-t border-neutral-200 bg-white p-3'>
			<div className='flex items-center justify-between gap-2'>
				<h3 className='m-0 text-xs font-bold text-main-deep-blue'>테스트</h3>
				<div className='flex items-center gap-2'>
					{isRunning ? <Spinner size='sm' label='테스트 실행 중' /> : null}
					<button
						type='button'
						onClick={run}
						disabled={!availability.canTest || Boolean(inputError) || isRunning || isListening}
						className='rounded-lg bg-main-deep-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-main-blue disabled:cursor-not-allowed disabled:bg-neutral-300'
					>
						{getRunLabel()}
					</button>
				</div>
			</div>
			{hasTestInput ? <ManualRunInputField value={inputText} error={inputError} onChange={handleInputChange} /> : null}
			{isWebhook ? <WebhookAddressBox workflowId={workflowId} /> : null}
			{isWebhook && isWorkflowActive ? (
				<p className='m-0 rounded-lg bg-warning-100 px-3 py-2 typo-caption1_regular text-warning-700'>
					워크플로우가 켜져 있어서 테스트로 받은 요청도 실제로 실행돼요.
				</p>
			) : null}
			{availability.canTest ? null : <p className='m-0 text-xs text-neutral-500'>{availability.reason}</p>}
			{isListenExpired ? (
				<p role='alert' className='m-0 rounded-lg bg-warning-100 px-3 py-2 typo-caption1_regular text-warning-700'>
					5분 동안 요청을 받지 못했어요. 다시 테스트해 주세요.
				</p>
			) : null}
			{missingNodes.length > 0 ? (
				<div role='alert' className='rounded-lg bg-[#fff1d6] px-3 py-2 text-xs text-[#9a6700]'>
					<p className='m-0 font-semibold'>이 노드가 참조하는 앞 노드를 먼저 테스트해 주세요.</p>
					<ul className='m-0 mt-1 flex list-none flex-col gap-1 p-0'>
						{missingNodes.map(missing => (
							<li key={missing.id} className='flex items-center justify-between gap-2'>
								<span className='min-w-0 truncate'>{missing.label || missing.id}</span>
								{missing.label === undefined ? null : (
									<button
										type='button'
										onClick={() => onNodeOpen(missing.id)}
										aria-label={`${missing.label || missing.id} 노드 열기`}
										className='shrink-0 rounded-md px-1.5 py-0.5 font-semibold text-main-deep-blue hover:bg-white/60'
									>
										열기
									</button>
								)}
							</li>
						))}
					</ul>
				</div>
			) : null}
			{errorMessage ? (
				<p role='alert' className='m-0 rounded-lg bg-danger-100 px-3 py-2 text-xs text-danger-700'>
					{errorMessage}
				</p>
			) : null}
			<div aria-live='polite'>{renderResult()}</div>
		</section>
	)
}

export default NodeTestSection
