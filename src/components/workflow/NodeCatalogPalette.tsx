import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import { NodeTypeIcon } from '@/components/workflow/WorkflowNode'
import { getBrandConfig } from '@/constants/integration/brandConfig'
import { NODE_CATALOG_KIND_LABELS, NODE_CATALOG_PALETTE_ID } from '@/constants/workflow/nodeCatalog'
import { getWorkflowNodeMeta } from '@/constants/workflow/workflowNode'
import { useNodeCatalogQuery } from '@/hooks/workflow/queries/useNodeCatalogQuery'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import { cn } from '@/utils/cn'
import { groupNodeCatalogEntries, type NodeCatalogAppGroup } from '@/utils/workflow/nodeCatalog'

const SKELETON_ROW_COUNT = 6

const AppIcon = ({ group }: { group: NodeCatalogAppGroup }) => {
	if (group.brand) {
		const brandConfig = getBrandConfig(group.brand)
		return (
			<span
				aria-hidden='true'
				className='grid size-8 shrink-0 place-items-center rounded-[0.6rem] bg-(--brand-tint)'
				style={{ '--brand-tint': brandConfig.tint } as CSSProperties}
			>
				{brandConfig.icon}
			</span>
		)
	}

	const meta = getWorkflowNodeMeta(group.nodeType)
	return (
		<span
			aria-hidden='true'
			className={cn(
				'grid size-8 shrink-0 place-items-center rounded-[0.6rem] bg-(--node-color) text-white',
				meta.toneClass
			)}
		>
			<NodeTypeIcon iconKey={meta.iconKey} />
		</span>
	)
}

const PaletteSkeleton = () => (
	<div role='status' aria-label='노드 목록 불러오는 중' aria-busy='true' className='flex flex-col gap-1 p-2'>
		{Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
			<div key={index} aria-hidden='true' className='flex min-h-12 items-center gap-3 px-2.5'>
				<SkeletonPulse className='size-8 rounded-[0.6rem] bg-neutral-200' />
				<SkeletonPulse className='h-4 w-28 rounded bg-neutral-200' />
			</div>
		))}
	</div>
)

type NodeCatalogPaletteProps = {
	onSelect: (entry: NodeCatalogEntry) => void
	onClose: () => void
}

/**
 * 노드 카탈로그를 앱 → 종류 → 이벤트 순서로 고르는 캔버스 왼쪽 패널.
 * 이벤트를 고르면 `onSelect`로 항목을 넘기며, 노드 생성과 패널 닫기는 호출자가 정한다.
 */
const NodeCatalogPalette = ({ onSelect, onClose }: NodeCatalogPaletteProps) => {
	const catalogQuery = useNodeCatalogQuery()
	const [selectedApp, setSelectedApp] = useState<string | null>(null)
	const panelRef = useRef<HTMLElement>(null)
	const reduceMotion = useReducedMotion()

	useEffect(() => {
		panelRef.current?.focus()
	}, [])

	const appGroups = catalogQuery.data ? groupNodeCatalogEntries(catalogQuery.data.data.entries) : []
	const selectedGroup = appGroups.find(group => group.app === selectedApp)

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape') return
		event.stopPropagation()
		onClose()
	}

	const renderBody = () => {
		if (catalogQuery.isPending) return <PaletteSkeleton />

		if (catalogQuery.isError) {
			return (
				<div role='alert' className='flex flex-col items-start gap-2 p-4 text-sm text-neutral-600'>
					<p className='m-0'>노드 목록을 불러오지 못했어요.</p>
					<button
						type='button'
						onClick={() => void catalogQuery.refetch()}
						disabled={catalogQuery.isFetching}
						className='rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-main-deep-blue hover:bg-neutral-50 disabled:opacity-60'
					>
						{catalogQuery.isFetching ? '다시 불러오는 중…' : '다시 시도'}
					</button>
				</div>
			)
		}

		if (appGroups.length === 0) {
			return <p className='m-0 p-4 text-sm text-neutral-500'>추가할 수 있는 노드가 없어요.</p>
		}

		if (selectedGroup) {
			return (
				<div className='flex flex-col gap-3 p-2'>
					{selectedGroup.kinds.map(kindGroup => (
						<section key={kindGroup.kind} aria-labelledby={`node-catalog-kind-${kindGroup.kind}`}>
							<h3
								id={`node-catalog-kind-${kindGroup.kind}`}
								className='m-0 px-2.5 pb-1 text-[0.7rem] font-bold tracking-wide text-neutral-500'
							>
								{NODE_CATALOG_KIND_LABELS[kindGroup.kind]}
							</h3>
							<ul className='m-0 flex list-none flex-col gap-0.5 p-0'>
								{kindGroup.entries.map(entry => (
									<li key={entry.id}>
										<button
											type='button'
											onClick={() => onSelect(entry)}
											className='flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left hover:bg-neutral-100 focus-visible:bg-neutral-100'
										>
											<span className='text-sm font-semibold text-[#27273b]'>{entry.title}</span>
											{entry.description ? (
												<span className='text-xs leading-snug text-neutral-500'>{entry.description}</span>
											) : null}
										</button>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			)
		}

		return (
			<ul className='m-0 flex list-none flex-col gap-0.5 p-2'>
				{appGroups.map(group => {
					const entryCount = group.kinds.reduce((count, kindGroup) => count + kindGroup.entries.length, 0)
					return (
						<li key={group.app}>
							<button
								type='button'
								onClick={() => setSelectedApp(group.app)}
								className='flex min-h-12 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-neutral-100 focus-visible:bg-neutral-100'
							>
								<AppIcon group={group} />
								<span className='min-w-0 flex-1 truncate text-sm font-semibold text-[#27273b]'>
									{group.title}
								</span>
								<span className='text-xs text-neutral-400'>{entryCount}개</span>
								<ChevronRight size={16} aria-hidden='true' className='text-neutral-400' />
							</button>
						</li>
					)
				})}
			</ul>
		)
	}

	return (
		<motion.aside
			ref={panelRef}
			id={NODE_CATALOG_PALETTE_ID}
			aria-label='노드 추가'
			tabIndex={-1}
			onKeyDown={handleKeyDown}
			initial={reduceMotion ? false : { x: -24, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			transition={{ duration: 0.18, ease: 'easeOut' }}
			className={cn(
				'absolute inset-y-3 left-3 z-10 flex w-80 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden outline-none',
				'rounded-2xl border border-neutral-200 bg-white shadow-[0_14px_36px_rgba(43,72,86,0.16)]'
			)}
		>
			<header className='flex min-h-13 shrink-0 items-center gap-2 border-b border-neutral-200 px-3'>
				{selectedGroup ? (
					<button
						type='button'
						onClick={() => setSelectedApp(null)}
						aria-label='앱 목록으로'
						className='grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100'
					>
						<ArrowLeft size={16} aria-hidden='true' />
					</button>
				) : null}
				<h2 className='m-0 min-w-0 flex-1 truncate text-sm font-bold text-main-deep-blue'>
					{selectedGroup ? selectedGroup.title : '노드 추가'}
				</h2>
				<button
					type='button'
					onClick={onClose}
					aria-label='노드 추가 닫기'
					className='grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100'
				>
					<X size={16} aria-hidden='true' />
				</button>
			</header>
			<div className='min-h-0 flex-1 overflow-y-auto'>{renderBody()}</div>
		</motion.aside>
	)
}

export default NodeCatalogPalette
