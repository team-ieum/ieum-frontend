import { useId } from 'react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import { DROPDOWN_OPTION_CLASS } from '@/components/workflow/settings/settingsFieldClassNames'
import type { NodeReferenceGroup, NodeReferenceOption } from '@/types/nodeReference'
import { cn } from '@/utils/cn'

type NodeReferenceListProps = {
	id: string
	/** 목록 이름(`{title} 참조 후보`)에 쓴다. */
	title: string
	groups: NodeReferenceGroup[]
	/** 모든 그룹의 후보를 이어 센 강조 행 index */
	activeIndex: number
	/** 강조 행을 `aria-activedescendant`로 알릴 option id */
	optionId: (index: number) => string
	onChoose: (option: NodeReferenceOption) => void
	onActiveChange: (index: number) => void
	/** 후보 그룹이 없을 때 보여 줄 안내. 없으면 앞에 연결된 노드가 없다고 안내한다. */
	emptyMessage?: string
}

const SAMPLE_SKELETON_COUNT = 2

const GroupStatus = ({ group }: { group: NodeReferenceGroup }) => {
	if (group.status === 'loading') {
		return (
			<div className='flex flex-col gap-1.5 px-2.5 py-1.5'>
				<span className='typo-caption1_regular text-neutral-500'>출력 칸을 불러오는 중이에요</span>
				{Array.from({ length: SAMPLE_SKELETON_COUNT }, (_, index) => (
					<SkeletonPulse key={index} className='h-4 w-2/3 rounded bg-neutral-200' />
				))}
			</div>
		)
	}
	if (group.status === 'needsSample') {
		return (
			<p className='m-0 px-2.5 py-1.5 typo-caption1_regular text-neutral-500'>
				'{group.label}' 노드를 테스트하면 출력 칸을 고를 수 있어요.
			</p>
		)
	}
	return group.options.length === 0 ? (
		<p className='m-0 px-2.5 py-1.5 typo-caption1_regular text-neutral-500'>고를 수 있는 출력이 없어요.</p>
	) : null
}

/**
 * 조상 노드별로 묶은 출력 참조 후보 listbox. 포커스는 여는 쪽(피커 버튼, 입력 칸)에 두고 강조 행만 받는다.
 * 보여 줄 그룹이 없으면 listbox 대신 안내(`emptyMessage`)를 보여 준다.
 */
const NodeReferenceList = ({
	id,
	title,
	groups,
	activeIndex,
	optionId,
	onChoose,
	onActiveChange,
	emptyMessage = '앞에 연결된 노드가 없어요. 노드를 연결하면 그 노드의 출력을 넣을 수 있어요.',
}: NodeReferenceListProps) => {
	const headerIdPrefix = useId()

	if (groups.length === 0) {
		return (
			<p id={id} className='m-0 px-2.5 py-2 typo-caption1_regular text-neutral-500'>
				{emptyMessage}
			</p>
		)
	}

	const offsets = groups.map((_, groupIndex) =>
		groups.slice(0, groupIndex).reduce((count, group) => count + group.options.length, 0)
	)

	return (
		<div id={id} role='listbox' aria-label={`${title} 참조 후보`} className='flex max-h-72 flex-col gap-1 overflow-y-auto'>
			{groups.map((group, groupIndex) => {
				const headerId = `${headerIdPrefix}-group-${groupIndex}`
				return (
					<div key={group.nodeId} role='group' aria-labelledby={headerId} className='flex flex-col gap-0.5'>
						<div id={headerId} className='truncate px-2.5 pt-1.5 typo-caption2_semibold text-neutral-500'>
							{group.label}
							{group.entryTitle ? ` · ${group.entryTitle}` : ''}
						</div>
						{group.options.map((option, optionIndex) => {
							const index = offsets[groupIndex] + optionIndex
							return (
								<div
									key={option.path}
									id={optionId(index)}
									role='option'
									aria-selected={index === activeIndex}
									onClick={() => onChoose(option)}
									onMouseEnter={() => onActiveChange(index)}
									className={cn(
										DROPDOWN_OPTION_CLASS,
										'text-neutral-700',
										index === activeIndex && 'bg-neutral-50'
									)}
								>
									<span className='flex min-w-0 flex-1 flex-col'>
										<span className='truncate'>{option.title}</span>
										<span className='truncate typo-mono-caption2_medium text-neutral-500'>{option.path}</span>
									</span>
								</div>
							)
						})}
						<GroupStatus group={group} />
					</div>
				)
			})}
		</div>
	)
}

export default NodeReferenceList
