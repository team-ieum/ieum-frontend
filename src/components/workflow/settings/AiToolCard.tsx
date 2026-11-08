import { ChevronDown, X } from 'lucide-react'
import { useId, useState } from 'react'
import NodeSettingsField from '@/components/workflow/settings/NodeSettingsField'
import type { NodeAiTool } from '@/hooks/workflow/useNodeAiTools'
import type { NodeReferenceSource } from '@/types/nodeReference'
import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'
import { cn } from '@/utils/cn'

type AiToolCardProps = {
	tool: NodeAiTool
	/** 처음 그릴 때 칸을 펼칠지. 방금 추가한 도구만 펼친다. */
	defaultOpen: boolean
	references?: NodeReferenceSource
	/** 칸 path별 서버 검사 오류. 도구 칸 path(`config.tools.<i>.config.<칸>`)로 찾는다. */
	validationErrorsByPath?: ReadonlyMap<string, WorkflowValidationErrorDto[]>
	/** 이 도구 칸들에 붙은 서버 검사 오류 수. 카드를 접어 두어도 머리에서 알린다. */
	validationErrorCount?: number
	onRemove: () => void
}

/** 고른 도구 하나의 이름·빼기 버튼과, 펼치면 보이는 도구 칸 목록. */
const AiToolCard = ({
	tool,
	defaultOpen,
	references,
	validationErrorsByPath,
	validationErrorCount = 0,
	onRemove,
}: AiToolCardProps) => {
	const [isOpen, setIsOpen] = useState(defaultOpen)
	const bodyId = useId()
	const displayTitle = tool.title || '이름 없는 도구'

	const renderBody = () => {
		if (!tool.isKnown) {
			return (
				<p className='m-0 text-xs leading-relaxed text-neutral-500'>
					목록에 없는 도구라 화면에서 칸을 바꿀 수 없어요. 저장해도 지금 설정을 그대로 유지해요.
				</p>
			)
		}
		if (tool.fields.length === 0) {
			return <p className='m-0 text-xs text-neutral-500'>설정할 칸이 없어요. AI가 알아서 써요.</p>
		}
		return tool.fields.map(({ field, value, name, options, emptyHint }) => (
			<NodeSettingsField
				key={field.path}
				field={field}
				value={value}
				name={name}
				options={options}
				emptyHint={emptyHint}
				references={references}
				validationErrors={validationErrorsByPath?.get(field.path)}
				onChange={(next, nextName) => tool.changeField(field, next, nextName)}
			/>
		))
	}

	return (
		<li className='rounded-xl border border-neutral-200 bg-white'>
			<div className='flex items-center gap-1 px-1.5 py-1'>
				<button
					type='button'
					aria-expanded={isOpen}
					aria-controls={isOpen ? bodyId : undefined}
					onClick={() => setIsOpen(open => !open)}
					className='flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-neutral-50'
				>
					<ChevronDown
						size={14}
						aria-hidden='true'
						className={cn('shrink-0 text-neutral-400 transition-transform duration-200', !isOpen && '-rotate-90')}
					/>
					<span className='flex min-w-0 flex-1 flex-col'>
						<span className='truncate text-[0.8rem] font-bold text-[#27273b]'>{displayTitle}</span>
						{tool.appTitle ? <span className='truncate text-[0.7rem] text-neutral-500'>{tool.appTitle}</span> : null}
					</span>
					{validationErrorCount > 0 ? (
						<span className='shrink-0 typo-caption2_semibold text-danger-900'>
							검사 문제 {validationErrorCount}건
						</span>
					) : null}
					{tool.missingRequiredCount > 0 ? (
						<span className='shrink-0 text-[0.7rem] font-semibold text-[#9a6700]'>필수 칸 비어 있음</span>
					) : null}
				</button>
				<button
					type='button'
					onClick={onRemove}
					aria-label={`${displayTitle} 도구 빼기`}
					className='grid size-7 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100'
				>
					<X size={14} aria-hidden='true' />
				</button>
			</div>
			{isOpen ? (
				<div id={bodyId} className='flex flex-col gap-4 border-t border-neutral-100 px-3 py-3'>
					{renderBody()}
				</div>
			) : null}
		</li>
	)
}

export default AiToolCard
