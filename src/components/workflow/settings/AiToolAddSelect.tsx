import { useId } from 'react'
import SettingsDropdown from '@/components/workflow/settings/SettingsDropdown'
import { useSettingsDropdown } from '@/hooks/workflow/useSettingsDropdown'
import type { NodeAiTools } from '@/hooks/workflow/useNodeAiTools'

type AiToolAddSelectProps = {
	tools: NodeAiTools['addableTools']
	triggerClassName: string
	onAdd: (toolKey: string) => void
}

/** 아직 고르지 않은 도구를 골라 추가하는 드롭다운. 행 아래에 도구가 속한 앱 이름을 보여 준다. */
const AiToolAddSelect = ({ tools, triggerClassName, onAdd }: AiToolAddSelectProps) => {
	const id = useId()
	const dropdown = useSettingsDropdown()

	if (tools.length === 0) return <p className='m-0 text-xs text-neutral-500'>고를 수 있는 도구를 모두 골랐어요.</p>

	return (
		<div>
			<label htmlFor={id} className='sr-only'>
				도구 추가
			</label>
			<SettingsDropdown
				id={id}
				title='도구'
				state={dropdown}
				rows={tools.map(tool => ({ key: tool.id, label: tool.name, detail: tool.appTitle, isCurrent: false }))}
				onChoose={rowIndex => onAdd(tools[rowIndex].id)}
				triggerText='도구 추가'
				isPlaceholder={false}
				triggerClassName={triggerClassName}
			/>
		</div>
	)
}

export default AiToolAddSelect
