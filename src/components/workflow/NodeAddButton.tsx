import { Plus } from 'lucide-react'
import type { Ref } from 'react'
import { NODE_CATALOG_PALETTE_ID } from '@/constants/workflow/nodeCatalog'
import { cn } from '@/utils/cn'

type NodeAddButtonProps = {
	isPaletteOpen: boolean
	onTogglePalette: () => void
	/** 팔레트가 닫힐 때 포커스를 돌려받을 버튼. */
	buttonRef?: Ref<HTMLButtonElement>
	/** 캔버스에 노드가 없을 때 버튼 오른쪽에 직접 추가 안내 말풍선을 띄운다. */
	showsEmptyHint: boolean
}

/**
 * 캔버스 왼쪽 가운데의 '노드 추가' 버튼. 평소에는 + 아이콘만 보이고 호버·키보드 포커스 때 글자가 펼쳐진다.
 * 팔레트가 캔버스 왼쪽 전체를 덮으며 열리고, 닫힐 때 포커스를 돌려받아야 해서 열린 동안에도 버튼을 DOM에 남겨 둔다.
 */
const NodeAddButton = ({ isPaletteOpen, onTogglePalette, buttonRef, showsEmptyHint }: NodeAddButtonProps) => (
	<div className='absolute top-1/2 left-3 z-10 flex -translate-y-1/2 items-center'>
		<button
			ref={buttonRef}
			type='button'
			// 팔레트에 가려진 동안 Tab으로 닿으면 보이지 않는 버튼에서 팔레트가 닫혀 Tab 순서에서만 뺀다.
			// inert·aria-hidden은 닫힐 때의 focus 복귀까지 막아 쓰지 않는다.
			tabIndex={isPaletteOpen ? -1 : undefined}
			onClick={onTogglePalette}
			aria-expanded={isPaletteOpen}
			aria-controls={isPaletteOpen ? NODE_CATALOG_PALETTE_ID : undefined}
			className={cn(
				'group inline-flex h-10 cursor-pointer items-center rounded-full border px-[11px] text-xs font-semibold shadow-sm transition-colors',
				isPaletteOpen
					? 'border-main-deep-blue bg-neutral-100 text-main-deep-blue'
					: 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
			)}
		>
			<Plus size={16} aria-hidden='true' className='shrink-0' />
			{/* 접근 가능한 이름이 되도록 글자는 DOM에 두고 너비만 접어 둔다. 마우스 클릭으로 남은 포커스에서는 펼치지 않는다. */}
			<span className='max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,margin,opacity] duration-200 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-20 group-focus-visible:opacity-100 motion-reduce:transition-none'>
				노드 추가
			</span>
		</button>
		{showsEmptyHint && !isPaletteOpen ? (
			<div
				role='note'
				className='relative ml-3 w-max max-w-64 rounded-xl break-keep bg-main-deep-blue px-3 py-2 text-xs leading-relaxed text-white shadow-[0_10px_24px_rgba(43,72,86,0.18)]'
			>
				{/* 버튼을 가리키는 말풍선 꼬리. 버튼이 펼쳐지면 말풍선도 같은 줄에서 함께 밀린다. */}
				<span
					aria-hidden='true'
					className='absolute top-1/2 -left-1 size-2.5 -translate-y-1/2 rotate-45 bg-main-deep-blue'
				/>
				+ 버튼으로 노드를 직접 골라 추가해 보세요.
			</div>
		) : null}
	</div>
)

export default NodeAddButton
