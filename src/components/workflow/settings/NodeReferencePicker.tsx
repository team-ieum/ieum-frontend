import { motion } from 'framer-motion'
import { Braces } from 'lucide-react'
import { useEffect, useId, useRef, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react'
import NodeReferenceList from '@/components/workflow/settings/NodeReferenceList'
import { DROPDOWN_POPUP_CLASS } from '@/components/workflow/settings/settingsFieldClassNames'
import { useSettingsDropdown } from '@/hooks/workflow/useSettingsDropdown'
import type { NodeReferenceGroup } from '@/types/nodeReference'
import { cn } from '@/utils/cn'

type NodeReferencePickerProps = {
	/** 버튼 이름(`출력 참조 넣기({fieldTitle})`)에 쓴다. 칸 입력 요소와 이름 앞부분이 겹치지 않게 칸 이름을 뒤에 둔다. */
	fieldTitle: string
	groups: NodeReferenceGroup[]
	/** 고른 참조식을 넘긴다. 목록은 이 컴포넌트가 닫고, 포커스 이동은 받는 쪽이 맡는다. */
	onInsert: (expression: string) => void
}

/**
 * 칸 제목 줄의 출력 참조 넣기 버튼. 누르면 조상 노드별 출력 후보 목록을 칸 아래에 띄운다.
 * `SettingsDropdown`과 같은 select-only combobox 방식이라 포커스는 버튼에 둔 채 강조 행을 `aria-activedescendant`로 알린다.
 * 팝업은 가장 가까운 `relative` 조상(칸 제목 줄) 아래에 칸 너비로 그린다.
 */
const NodeReferencePicker = ({ fieldTitle, groups, onInsert }: NodeReferencePickerProps) => {
	const state = useSettingsDropdown()
	const listId = useId()
	const triggerRef = useRef<HTMLButtonElement>(null)
	const popupRef = useRef<HTMLDivElement>(null)
	const options = groups.flatMap(group => group.options)
	const optionId = (index: number) => `${listId}-option-${index}`

	// 아래쪽 칸에서 열면 패널 스크롤 영역 밖에 생길 수 있어 필요한 만큼만 스크롤한다. jsdom에는 scrollIntoView가 없다.
	useEffect(() => {
		if (state.isOpen) popupRef.current?.scrollIntoView?.({ block: 'nearest' })
	}, [state.isOpen])

	const choose = (index: number) => {
		const option = options[index]
		state.close()
		if (option) onInsert(option.expression)
	}

	const moveActive = (step: 1 | -1) => {
		if (!state.isOpen) {
			state.open()
			return
		}
		if (options.length === 0) return
		const current = state.activeIndex
		const next = current < 0 ? (step === 1 ? 0 : options.length - 1) : (current + step + options.length) % options.length
		state.setActiveIndex(next)
		// aria-activedescendant 방식이라 브라우저가 강조 행으로 스크롤해 주지 않는다.
		popupRef.current?.querySelector(`#${CSS.escape(optionId(next))}`)?.scrollIntoView?.({ block: 'nearest' })
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault()
			moveActive(event.key === 'ArrowDown' ? 1 : -1)
			return
		}
		if (event.key === 'Enter' || event.key === ' ') {
			// 버튼 기본 click으로 다시 열고 닫히지 않게 막고 직접 처리한다.
			event.preventDefault()
			if (!state.isOpen) state.open()
			else if (state.activeIndex >= 0 && state.activeIndex < options.length) choose(state.activeIndex)
			else state.close()
			return
		}
		if (event.key === 'Escape' && state.isOpen) {
			// 패널의 Escape 닫기보다 목록 닫기를 먼저 한다.
			event.stopPropagation()
			state.close()
		}
	}

	// Firefox는 keydown을 막아도 Space keyup에서 click을 일으켜, 막지 않으면 연 목록이 바로 닫힌다.
	const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === ' ') event.preventDefault()
	}

	// Safari는 클릭한 버튼에 포커스를 주지 않아, 직접 포커스를 줘야 밖을 눌렀을 때 blur로 목록이 닫힌다.
	const handleClick = () => {
		triggerRef.current?.focus()
		state.toggle()
	}

	const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
		if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
		state.close()
	}

	// 목록을 눌러도 버튼 포커스를 유지해, blur로 목록이 먼저 닫혀 행 click이 사라지지 않게 한다.
	const keepTriggerFocus = (event: MouseEvent<HTMLDivElement>) => event.preventDefault()

	return (
		<div onBlur={handleBlur} className='shrink-0'>
			<button
				ref={triggerRef}
				type='button'
				role='combobox'
				aria-label={`출력 참조 넣기(${fieldTitle})`}
				aria-haspopup='listbox'
				aria-expanded={state.isOpen}
				aria-controls={state.isOpen ? listId : undefined}
				aria-activedescendant={state.activeIndex >= 0 ? optionId(state.activeIndex) : undefined}
				title='출력 참조 넣기'
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				onKeyUp={handleKeyUp}
				className={cn(
					'grid size-7 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100',
					'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue',
					state.isOpen && 'bg-neutral-100 text-main-deep-blue'
				)}
			>
				<Braces size={14} aria-hidden='true' />
			</button>
			{state.isOpen ? (
				<motion.div
					ref={popupRef}
					initial={{ opacity: 0, y: -4 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.15 }}
					onMouseDown={keepTriggerFocus}
					className={DROPDOWN_POPUP_CLASS}
				>
					<NodeReferenceList
						id={listId}
						title={fieldTitle}
						groups={groups}
						activeIndex={state.activeIndex}
						optionId={optionId}
						onChoose={option => choose(options.indexOf(option))}
						onActiveChange={state.setActiveIndex}
					/>
				</motion.div>
			) : null}
		</div>
	)
}

export default NodeReferencePicker
