import { useId, useState } from 'react'
import AiToolAddSelect from '@/components/workflow/settings/AiToolAddSelect'
import AiToolCard from '@/components/workflow/settings/AiToolCard'
import type { NodeAiTools } from '@/hooks/workflow/useNodeAiTools'
import { cn } from '@/utils/cn'

const ADD_TRIGGER_CLASS = cn(
	'w-full min-w-0 rounded-lg border border-dashed border-neutral-300 bg-white px-2.5 py-1.5 text-sm font-semibold',
	'text-main-deep-blue hover:bg-neutral-50 focus:border-main-blue focus:outline-none'
)

type AiToolsSectionProps = {
	aiTools: NodeAiTools
}

// 도구 없는 ai.agent(팔레트의 'AI 에이전트', GitHub 프리셋 등)는 도구를 빼서 생긴 상태가 아니라 바뀐다고 안내하지 않는다.
const getToolsNotice = (isAgent: boolean, hasTools: boolean) => {
	if (!isAgent) return '도구를 고르면 고른 도구를 써 가며 일하는 AI 에이전트로 바뀌어요.'
	return hasTools ? '도구를 모두 빼면 도구 없이 답만 만드는 AI로 바뀌어요.' : '도구를 고르면 AI가 고른 도구를 써 가며 일해요.'
}

/**
 * AI 노드 도구 칸. 고른 도구를 카드로 보여 주고 '도구 추가' 드롭다운으로 도구를 더한다.
 * 도구 유무에 따라 노드가 AI 에이전트와 도구 없는 AI 사이에서 바뀐다는 점을 함께 안내한다.
 */
const AiToolsSection = ({ aiTools }: AiToolsSectionProps) => {
	const { toolsField, isAgent, tools, addableTools, addTool, removeTool } = aiTools
	const titleId = useId()
	// 방금 추가한 도구 카드만 펼친 채로 그린다.
	const [addedToolKey, setAddedToolKey] = useState<string | null>(null)

	const handleAdd = (toolKey: string) => {
		setAddedToolKey(toolKey)
		addTool(toolKey)
	}

	// choices 밖 도구는 같은 이름이 여러 번 저장돼 있을 수 있어 몇 번째 같은 이름인지까지 key에 넣는다.
	const keyedTools = tools.map(tool => ({
		tool,
		key: `${tool.toolKey}#${tools.filter(item => item.toolKey === tool.toolKey && item.index < tool.index).length}`,
	}))

	return (
		<section aria-labelledby={titleId} className='flex flex-col gap-2'>
			<h3 id={titleId} className='m-0 text-[0.8rem] font-bold text-[#27273b]'>
				{toolsField.title}
			</h3>
			{toolsField.description ? (
				<p className='m-0 text-xs leading-snug text-neutral-500'>{toolsField.description}</p>
			) : null}
			<p className='m-0 rounded-lg bg-neutral-50 px-2.5 py-2 text-[0.7rem] leading-relaxed text-neutral-600'>
				{getToolsNotice(isAgent, tools.length > 0)}
			</p>
			{keyedTools.length > 0 ? (
				<ul className='m-0 flex list-none flex-col gap-2 p-0'>
					{keyedTools.map(({ tool, key }) => (
						<AiToolCard
							key={key}
							tool={tool}
							defaultOpen={tool.toolKey === addedToolKey}
							onRemove={() => removeTool(tool.index)}
						/>
					))}
				</ul>
			) : null}
			<AiToolAddSelect tools={addableTools} triggerClassName={ADD_TRIGGER_CLASS} onAdd={handleAdd} />
		</section>
	)
}

export default AiToolsSection
