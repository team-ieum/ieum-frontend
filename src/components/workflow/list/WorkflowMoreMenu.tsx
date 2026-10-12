import { MoreHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'

type WorkflowMoreMenuProps = {
	onDelete: () => void
	className?: string
}

export const WorkflowMoreMenu = ({ onDelete, className = '' }: WorkflowMoreMenuProps) => {
	const [open, setOpen] = useState(false)
	const menuId = useId()
	const containerRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const firstItemRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		if (!open) return
		firstItemRef.current?.focus()

		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [open])

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (!open || event.key !== 'Escape') return
		event.stopPropagation()
		setOpen(false)
		triggerRef.current?.focus()
	}

	const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			setOpen(false)
		}
	}

	return (
		<div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown} onBlur={handleBlur}>
			<button
				ref={triggerRef}
				type='button'
				onClick={e => {
					e.stopPropagation()
					setOpen(v => !v)
				}}
				className='grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600'
				aria-label='워크플로우 메뉴'
				aria-haspopup='menu'
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
			>
				<MoreHorizontal size={17} />
			</button>

			{open && (
				<div
					id={menuId}
					role='menu'
					aria-label='워크플로우 메뉴'
					className='absolute right-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg'
				>
					<button
						ref={firstItemRef}
						type='button'
						role='menuitem'
						onClick={e => {
							e.stopPropagation()
							setOpen(false)
							onDelete()
						}}
						className='flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50'
					>
						<Trash2 size={14} />
						삭제
					</button>
				</div>
			)}
		</div>
	)
}
