import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import AiOutputFieldsSection from '@/components/workflow/settings/AiOutputFieldsSection'
import AiToolsSection from '@/components/workflow/settings/AiToolsSection'
import NodeSettingsField from '@/components/workflow/settings/NodeSettingsField'
import NodeTestSection from '@/components/workflow/settings/NodeTestSection'
import { NodeTypeIcon } from '@/components/workflow/WorkflowNode'
import { getWorkflowNodeMeta } from '@/constants/workflow/workflowNode'
import { useNodeSettingsPanel } from '@/hooks/workflow/useNodeSettingsPanel'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import { cn } from '@/utils/cn'

const SKELETON_FIELD_COUNT = 3

const FieldsSkeleton = () => (
	<div role='status' aria-label='설정 칸 불러오는 중' aria-busy='true' className='flex flex-col gap-4 p-4'>
		{Array.from({ length: SKELETON_FIELD_COUNT }, (_, index) => (
			<div key={index} aria-hidden='true' className='flex flex-col gap-2'>
				<SkeletonPulse className='h-4 w-24 rounded bg-neutral-200' />
				<SkeletonPulse className='h-8 w-full rounded-lg bg-neutral-200' />
			</div>
		))}
	</div>
)

type NodeSettingsPanelProps = {
	workflowId: string
	node: WorkflowNodeDto
	/** 편집 문서의 모든 노드. 출력 참조 후보·깨진 참조 계산과, 노드 테스트가 먼저 테스트할 노드를 라벨로 안내할 때 쓴다. */
	nodes: WorkflowNodeDto[]
	/** 편집 문서의 엣지. 참조할 수 있는 조상 노드를 계산한다. */
	edges: WorkflowEdgeDto[]
	onNodeChange: (node: WorkflowNodeDto) => void
	/** 다른 노드의 설정 패널로 바꾼다. */
	onNodeOpen: (nodeId: string) => void
	onClose: () => void
}

/**
 * 선택한 노드의 설정을 카탈로그 `inputFields`로 편집하는 캔버스 오른쪽 패널.
 * 노드는 `event`가 같은 카탈로그 항목으로만 열며, 항목이 없는 노드는 원본을 바꾸지 않도록 읽기 전용으로 보여 준다.
 * 마운트할 때 패널로 포커스를 옮기므로 다른 노드를 열 때만 `key`를 바꿔 다시 마운트한다.
 */
const NodeSettingsPanel = ({ workflowId, node, nodes, edges, onNodeChange, onNodeOpen, onClose }: NodeSettingsPanelProps) => {
	const {
		status,
		entry,
		entryTitle,
		fields,
		aiTools,
		outputFields,
		outputFieldIssueCount,
		missingRequiredCount,
		references,
		referenceIssueCount,
		brokenReferrers,
		changeField,
		retry,
		isRetrying,
	} = useNodeSettingsPanel({ workflowId, node, nodes, edges, onNodeChange })
	const panelRef = useRef<HTMLElement>(null)
	const reduceMotion = useReducedMotion()
	const meta = getWorkflowNodeMeta(node.type)

	useEffect(() => {
		panelRef.current?.focus()
	}, [])

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape') return
		event.stopPropagation()
		onClose()
	}

	const renderBody = () => {
		if (status === 'loading') return <FieldsSkeleton />

		if (status === 'error') {
			return (
				<div role='alert' className='flex flex-col items-start gap-2 p-4 text-sm text-neutral-600'>
					<p className='m-0'>설정 칸을 불러오지 못했어요.</p>
					<button
						type='button'
						onClick={retry}
						disabled={isRetrying}
						className='rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-main-deep-blue hover:bg-neutral-50 disabled:opacity-60'
					>
						{isRetrying ? '다시 불러오는 중…' : '다시 시도'}
					</button>
				</div>
			)
		}

		if (status === 'outsideCatalog') {
			return (
				<div className='flex flex-col gap-2 p-4 text-sm leading-relaxed text-neutral-600'>
					<p className='m-0'>
						지원하지 않는 작업이라 화면에서 설정을 바꿀 수 없어요. 저장해도 지금 설정을 그대로 유지해요.
					</p>
					<p className='m-0 text-xs text-neutral-500'>
						이벤트 <code className='rounded bg-neutral-100 px-1 py-0.5'>{node.event}</code>
					</p>
				</div>
			)
		}

		if (fields.length === 0 && !aiTools && !outputFields) {
			return <p className='m-0 p-4 text-sm text-neutral-500'>설정할 칸이 없어요.</p>
		}

		return (
			<div className='flex flex-col gap-4 p-4'>
				{missingRequiredCount > 0 ? (
					<p role='status' className='m-0 rounded-lg bg-[#fff1d6] px-3 py-2 text-xs font-semibold text-[#9a6700]'>
						필수 칸 {missingRequiredCount}개가 비어 있어요. 저장은 되지만 채우기 전에는 실행할 수 없어요.
					</p>
				) : null}
				{outputFieldIssueCount > 0 ? (
					<p role='status' className='m-0 rounded-lg bg-[#fff1d6] px-3 py-2 text-xs font-semibold text-[#9a6700]'>
						출력 칸 {outputFieldIssueCount}곳을 고쳐야 실행할 수 있어요. 저장은 돼요.
					</p>
				) : null}
				{referenceIssueCount > 0 ? (
					<p role='status' className='m-0 rounded-lg bg-warning-100 px-3 py-2 typo-caption1_semibold text-warning-700'>
						참조 {referenceIssueCount}곳을 확인해 주세요. 없거나 앞에 연결되지 않은 노드·출력을 가리키고 있어요.
						저장은 돼요.
					</p>
				) : null}
				{brokenReferrers.length > 0 ? (
					<div role='status' className='flex flex-col gap-1.5 rounded-lg bg-warning-100 px-3 py-2'>
						<p className='m-0 typo-caption1_semibold text-warning-700'>
							이 노드에 없는 출력을 참조하는 노드가 있어요. 출력 칸 이름을 바꿨거나 지웠다면 그 노드의 참조도 고쳐
							주세요.
						</p>
						<ul className='m-0 flex list-none flex-wrap gap-1.5 p-0'>
							{brokenReferrers.map(referrer => (
								<li key={referrer.nodeId}>
									<button
										type='button'
										onClick={() => onNodeOpen(referrer.nodeId)}
										className='rounded-lg border border-neutral-200 bg-white px-2.5 py-1 typo-caption1_semibold text-main-deep-blue hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
									>
										'{referrer.label}' 열기
									</button>
								</li>
							))}
						</ul>
					</div>
				) : null}
				{fields.map(({ field, value, name, options }) => (
					<NodeSettingsField
						key={field.path}
						field={field}
						value={value}
						name={name}
						options={options}
						references={references}
						onChange={(next, nextName) => changeField(field, next, nextName)}
					/>
				))}
				{aiTools ? <AiToolsSection aiTools={aiTools} references={references} /> : null}
				{outputFields ? <AiOutputFieldsSection outputFields={outputFields} /> : null}
			</div>
		)
	}

	return (
		<motion.aside
			ref={panelRef}
			aria-label='노드 설정'
			tabIndex={-1}
			onKeyDown={handleKeyDown}
			initial={reduceMotion ? false : { x: 24, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			transition={{ duration: 0.18, ease: 'easeOut' }}
			className={cn(
				// nokey: React Flow 삭제 키(Backspace·Delete)가 패널 안 키 입력으로 선택된 노드를 지우지 않게 한다.
				'nokey absolute inset-y-3 right-3 z-20 flex w-90 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden outline-none',
				'rounded-2xl border border-neutral-200 bg-white shadow-[0_14px_36px_rgba(43,72,86,0.16)]'
			)}
		>
			<header className={cn('flex min-h-13 shrink-0 items-center gap-2 border-b border-neutral-200 px-3', meta.toneClass)}>
				<span
					aria-hidden='true'
					className='grid size-8 shrink-0 place-items-center rounded-[0.6rem] bg-(--node-color) text-white'
				>
					<NodeTypeIcon iconKey={meta.iconKey} />
				</span>
				<div className='min-w-0 flex-1'>
					<h2 className='m-0 truncate text-sm font-bold text-main-deep-blue' title={node.label}>
						{node.label}
					</h2>
					{entryTitle ? <p className='m-0 truncate text-xs text-neutral-500'>{entryTitle}</p> : null}
				</div>
				<button
					type='button'
					onClick={onClose}
					aria-label='노드 설정 닫기'
					className='grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100'
				>
					<X size={16} aria-hidden='true' />
				</button>
			</header>
			<div className='min-h-0 flex-1 overflow-y-auto'>{renderBody()}</div>
			{status === 'ready' || status === 'outsideCatalog' ? (
				<NodeTestSection workflowId={workflowId} node={node} entry={entry} nodes={nodes} onNodeOpen={onNodeOpen} />
			) : null}
		</motion.aside>
	)
}

export default NodeSettingsPanel
