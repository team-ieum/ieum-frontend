import { useEffect, useId, useRef, type FocusEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import type { SettingsDropdownState } from '@/hooks/workflow/useSettingsDropdown'
import { cn } from '@/utils/cn'

export type SettingsDropdownRow = {
	key: string
	label: string
	/** 이름 아래 작게 보여 줄 보조 정보(예: 항목 ID). */
	detail?: string
	/** 지금 저장된 값인지. 체크와 강조 배경으로 보여 준다. */
	isCurrent: boolean
	/** 비우기 행처럼 흐리게 보여 줄 행인지. */
	isMuted?: boolean
}

type SettingsDropdownProps = {
	id: string
	/** 목록 이름(`{title} 목록`)에 쓴다. */
	title: string
	state: SettingsDropdownState
	rows: SettingsDropdownRow[]
	/** 고른 행 index를 넘긴다. 목록은 이 컴포넌트가 닫는다. */
	onChoose: (rowIndex: number) => void
	triggerText: string
	/** 값이 없어 안내 문구를 보여 주는 중인지. */
	isPlaceholder: boolean
	triggerClassName: string
	describedBy?: string
	/** 지금 값이 규칙에 어긋나는지. 트리거에 `aria-invalid`를 붙인다. */
	invalid?: boolean
	/** 목록 아래(불러오는 중·오류·더보기 등)에 보여 줄 내용. */
	footer?: ReactNode
}

/**
 * 설정 패널의 선택 전용 드롭다운. 채팅 'AI 모델' 메뉴와 같은 팝업·행 모양을 쓴다.
 * 포커스는 트리거에 둔 채 `aria-activedescendant`로 강조 행을 알리는 select-only combobox다.
 */
const SettingsDropdown = ({
	id,
	title,
	state,
	rows,
	onChoose,
	triggerText,
	isPlaceholder,
	triggerClassName,
	describedBy,
	invalid,
	footer,
}: SettingsDropdownProps) => {
	const listboxId = useId()
	const rootRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const listboxRef = useRef<HTMLUListElement>(null)
	const popupRef = useRef<HTMLDivElement>(null)
	const optionId = (rowIndex: number) => `${listboxId}-option-${rowIndex}`

	// 팝업은 패널 본문 스크롤 영역 안에 그려져, 아래쪽 칸에서 열면 보이지 않는 곳에 생길 수 있다.
	// 열릴 때 필요한 만큼만 패널을 스크롤한다. jsdom에는 scrollIntoView가 없어 있을 때만 부른다.
	useEffect(() => {
		if (state.isOpen) popupRef.current?.scrollIntoView?.({ block: 'nearest' })
	}, [state.isOpen])

	const choose = (rowIndex: number) => {
		onChoose(rowIndex)
		state.close()
	}

	const moveActive = (step: 1 | -1) => {
		if (!state.isOpen) {
			state.open()
			return
		}
		if (rows.length === 0) return
		const current = state.activeIndex
		const next = current < 0 ? (step === 1 ? 0 : rows.length - 1) : (current + step + rows.length) % rows.length
		state.setActiveIndex(next)
		// aria-activedescendant 방식이라 브라우저가 강조 행으로 스크롤해 주지 않는다.
		// 마우스를 올려 바뀐 강조에서 스크롤하면 목록이 커서 아래에서 밀리므로 키보드 이동에서만 한다.
		listboxRef.current?.children[next]?.scrollIntoView?.({ block: 'nearest' })
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
			else if (state.activeIndex >= 0 && state.activeIndex < rows.length) choose(state.activeIndex)
			else state.close()
		}
	}

	// footer 버튼에 포커스가 있을 때도 받도록 root에서 처리한다. 패널의 Escape 닫기보다 목록 닫기를 먼저 한다.
	const handleRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== 'Escape' || !state.isOpen) return
		event.stopPropagation()
		state.close()
		refocusTrigger()
	}

	// Firefox는 keydown을 막아도 Space keyup에서 click을 일으켜, 막지 않으면 연 목록이 바로 닫힌다.
	const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === ' ') event.preventDefault()
	}

	// Safari는 클릭한 버튼에 포커스를 주지 않아, 직접 포커스를 줘야 칸 밖을 눌렀을 때 blur로 목록이 닫힌다.
	const handleClick = () => {
		triggerRef.current?.focus()
		state.toggle()
	}

	// 포커스가 칸과 목록(footer 버튼 포함) 밖으로 나갈 때만 닫는다.
	const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
		if (rootRef.current?.contains(event.relatedTarget as Node | null)) return
		state.close()
	}

	// Tab으로 옮겨 간 footer 버튼은 누른 뒤 사라질 수 있어, 포커스가 칸 밖에 남아 목록이 닫히지 않게 트리거로 돌려놓는다.
	// 버튼 자신의 onClick이 먼저 실행된 뒤 bubble로 여기 온다.
	const refocusTrigger = () => triggerRef.current?.focus()

	// 목록 안을 눌러도 트리거 포커스를 유지한다. Safari는 클릭한 버튼·링크에 포커스를 주지 않아,
	// 막지 않으면 blur로 목록이 먼저 닫혀 버튼·링크의 click이 일어나지 않는다. click과 링크 이동은 그대로 일어난다.
	const keepTriggerFocus = (event: MouseEvent<HTMLDivElement>) => event.preventDefault()

	return (
		<div ref={rootRef} onBlur={handleBlur} onKeyDown={handleRootKeyDown} className='relative'>
			<button
				ref={triggerRef}
				id={id}
				type='button'
				role='combobox'
				aria-haspopup='listbox'
				aria-expanded={state.isOpen}
				aria-controls={state.isOpen ? listboxId : undefined}
				aria-activedescendant={state.activeIndex >= 0 ? optionId(state.activeIndex) : undefined}
				aria-describedby={describedBy}
				aria-invalid={invalid || undefined}
				// disabled로 막으면 막힌 칸에서 값을 비운 순간 포커스가 body로 빠져, 열기만 막고 포커스는 남긴다.
				aria-disabled={!state.canOpen || undefined}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				onKeyUp={handleKeyUp}
				className={cn(
					triggerClassName,
					'relative pr-8 text-left aria-disabled:cursor-not-allowed aria-disabled:bg-neutral-50',
					state.isOpen && 'border-main-blue'
				)}
			>
				<span className={cn('block truncate', isPlaceholder && 'text-neutral-400')}>{triggerText}</span>
				<ChevronDown
					size={14}
					aria-hidden='true'
					className={cn(
						'pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-neutral-400 transition-transform duration-200',
						state.isOpen && 'rotate-180'
					)}
				/>
			</button>
			{state.isOpen ? (
				<motion.div
					ref={popupRef}
					initial={{ opacity: 0, y: -4 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.15 }}
					onMouseDown={keepTriggerFocus}
					className='absolute inset-x-0 top-[calc(100%+6px)] z-20 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_16px_32px_-12px_rgba(16,24,40,.22)]'
				>
					<ul
						ref={listboxRef}
						id={listboxId}
						role='listbox'
						aria-label={`${title} 목록`}
						className='m-0 flex max-h-60 list-none flex-col gap-0.5 overflow-y-auto p-0'
					>
						{rows.map((row, rowIndex) => {
							const isActive = rowIndex === state.activeIndex
							return (
								<li
									key={row.key}
									id={optionId(rowIndex)}
									role='option'
									aria-selected={isActive}
									onClick={() => choose(rowIndex)}
									onMouseEnter={() => state.setActiveIndex(rowIndex)}
									className={cn(
										'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 typo-body3_regular transition-colors',
										row.isCurrent
											? 'bg-main-light-blue text-main-deep-blue'
											: cn('text-neutral-700', isActive && 'bg-neutral-50'),
										// 강조 행이 지금 값이면 배경이 같아 테두리로 강조를 구분한다.
										row.isCurrent && isActive && 'ring-1 ring-main-blue/40 ring-inset'
									)}
								>
									<span className='flex min-w-0 flex-1 flex-col'>
										<span className={cn('truncate', row.isMuted && !row.isCurrent && 'text-neutral-500')}>
											{row.label}
										</span>
										{row.detail ? (
											<span className='truncate text-[0.7rem] text-neutral-500'>{row.detail}</span>
										) : null}
									</span>
									{row.isCurrent ? <Check size={14} aria-hidden='true' className='shrink-0' /> : null}
								</li>
							)
						})}
					</ul>
					{footer ? <div onClick={refocusTrigger}>{footer}</div> : null}
				</motion.div>
			) : null}
		</div>
	)
}

export default SettingsDropdown
