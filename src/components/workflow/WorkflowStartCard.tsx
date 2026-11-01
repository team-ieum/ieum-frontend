import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles, Zap } from 'lucide-react'
import { useId, type MouseEvent } from 'react'
import { cn } from '@/utils/cn'

type WorkflowStartCardProps = {
	/** 팔레트나 채팅이 열린 동안 숨긴다. DOM에는 남겨 연 버튼으로 포커스를 돌려받을 수 있게 한다. */
	isHidden: boolean
	/** 트리거만 보이는 팔레트를 연다. 닫힐 때 포커스를 돌려받도록 누른 버튼을 넘긴다. */
	onPickTrigger: (invoker: HTMLButtonElement) => void
	onStartWithAi: () => void
}

const OPTION_CLASS = cn(
	'flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-left',
	'transition-colors hover:border-main-deep-blue/40 hover:bg-neutral-50'
)

/**
 * 노드가 없는 캔버스에서 어떻게 시작할지 고르는 카드. 넓은 캔버스에서는 가운데에, 좁으면 아래쪽에 놓아
 * 노드 추가 버튼 옆 말풍선과 겹치지 않게 한다. 카드 밖 빈 영역은 계속 캔버스 조작을 받는다.
 */
const WorkflowStartCard = ({ isHidden, onPickTrigger, onStartWithAi }: WorkflowStartCardProps) => {
	const id = useId()
	const titleId = `${id}-title`
	const reduceMotion = useReducedMotion()

	return (
		<div
			hidden={isHidden}
			className={cn(
				'pointer-events-none absolute inset-x-0 z-10 flex justify-center px-4',
				// 좁으면 아래쪽 확대·축소 버튼 위에, 넓으면 왼쪽 말풍선(버튼 + 최대 16rem)이 끝나는 22rem 오른쪽부터 남은 폭의 가운데에 둔다.
				'bottom-28 @2xl:top-1/2 @2xl:bottom-auto @2xl:-translate-y-1/2 @2xl:pl-[22rem]'
			)}
		>
			<motion.section
				role='group'
				aria-labelledby={titleId}
				initial={reduceMotion ? false : { opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.2 }}
				className='pointer-events-auto w-full max-w-80 rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-[0_14px_36px_rgba(43,72,86,0.12)]'
			>
				<h2 id={titleId} className='m-0 mb-3 text-sm font-bold text-main-deep-blue'>
					어떻게 시작할까요?
				</h2>
				<div className='flex flex-col gap-2'>
					<button
						type='button'
						onClick={(event: MouseEvent<HTMLButtonElement>) => onPickTrigger(event.currentTarget)}
						aria-labelledby={`${id}-trigger`}
						aria-describedby={`${id}-trigger-description`}
						className={OPTION_CLASS}
					>
						<Zap size={18} aria-hidden='true' className='shrink-0 text-main-deep-blue' />
						<span className='flex flex-col'>
							<span id={`${id}-trigger`} className='text-sm font-semibold text-[#27273b]'>
								트리거 고르기
							</span>
							<span id={`${id}-trigger-description`} className='text-xs text-neutral-500'>
								언제 시작할지 직접 골라요
							</span>
						</span>
					</button>
					<button
						type='button'
						onClick={onStartWithAi}
						aria-labelledby={`${id}-ai`}
						aria-describedby={`${id}-ai-description`}
						className={OPTION_CLASS}
					>
						<Sparkles size={18} aria-hidden='true' className='shrink-0 text-main-deep-blue' />
						<span className='flex flex-col'>
							<span id={`${id}-ai`} className='text-sm font-semibold text-[#27273b]'>
								AI로 만들기
							</span>
							<span id={`${id}-ai-description`} className='text-xs text-neutral-500'>
								원하는 자동화를 말로 설명해 주세요
							</span>
						</span>
					</button>
				</div>
			</motion.section>
		</div>
	)
}

export default WorkflowStartCard
