import { motion, useReducedMotion } from 'framer-motion'
import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

const MARQUEE_SPEED_PX_PER_S = 40
const MARQUEE_PAUSE_S = 1.5
const TITLE_TEXT_CLASS = 'px-2 py-1 text-xl font-bold tracking-wide whitespace-pre'

type WorkflowToolbarTitleProps = {
	title: string
	onTitleChange: (title: string) => void
}

// 끝까지 흘러간 뒤 잠시 멈추고, 처음으로 돌아와 다시 멈추기를 반복한다. 이동 구간은 등속이다.
const getMarqueeAnimation = (distance: number) => {
	const travel = Math.max(distance / MARQUEE_SPEED_PX_PER_S, 1)
	const total = MARQUEE_PAUSE_S * 2 + travel * 2
	return {
		animate: { x: [0, -distance, -distance, 0, 0] },
		transition: {
			duration: total,
			times: [0, travel / total, (travel + MARQUEE_PAUSE_S) / total, (travel * 2 + MARQUEE_PAUSE_S) / total, 1],
			ease: 'linear' as const,
			repeat: Infinity,
		},
	}
}

/**
 * 툴바의 워크플로우 제목 입력. 제목 길이만큼 자리를 차지하고, 자리가 모자라 잘리면 말줄임으로 보여 주다가
 * 마우스를 올리면 편집 중이 아닐 때 제목을 좌우로 흘려 가려진 부분을 보여 준다.
 */
const WorkflowToolbarTitle = ({ title, onTitleChange }: WorkflowToolbarTitleProps) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const textRef = useRef<HTMLSpanElement>(null)
	const [overflowDistance, setOverflowDistance] = useState(0)
	const [isEditing, setIsEditing] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const shouldReduceMotion = useReducedMotion()

	// 입력 요소의 글자는 transform으로 움직일 수 없어서, 같은 글꼴의 span이 너비를 정하고 흐르는 글자를 그린다.
	// 입력 요소는 그 위에 겹쳐 두고 흐르는 동안에만 글자를 숨긴다.
	useLayoutEffect(() => {
		const container = containerRef.current
		const text = textRef.current
		if (!container || !text) return

		const measure = () => setOverflowDistance(Math.max(text.offsetWidth - container.clientWidth, 0))
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(container)
		observer.observe(text)
		return () => observer.disconnect()
	}, [])

	// 움직임을 줄인 환경에서는 흐르게 하지 않고 입력 요소의 말줄임만 보여 준다.
	const isMarquee = overflowDistance > 0 && isHovered && !isEditing && shouldReduceMotion !== true
	const marquee = isMarquee ? getMarqueeAnimation(overflowDistance) : { animate: { x: 0 }, transition: { duration: 0 } }

	return (
		<div
			ref={containerRef}
			data-marquee={isMarquee ? 'true' : undefined}
			onPointerEnter={() => setIsHovered(true)}
			onPointerLeave={() => setIsHovered(false)}
			className='relative min-w-12 overflow-hidden rounded-md text-main-deep-blue transition-colors hover:bg-neutral-100 has-focus:bg-neutral-100 motion-reduce:transition-none'
			style={{ fontFamily: 'var(--font-sans)' }}
		>
			<motion.span
				ref={textRef}
				aria-hidden='true'
				animate={marquee.animate}
				transition={marquee.transition}
				className={cn('block w-max', TITLE_TEXT_CLASS, !isMarquee && 'invisible')}
			>
				{title}
			</motion.span>
			<input
				value={title}
				onChange={e => onTitleChange(e.target.value)}
				onFocus={() => setIsEditing(true)}
				onBlur={() => setIsEditing(false)}
				aria-label='워크플로우 제목'
				className={cn(
					'absolute inset-0 w-full bg-transparent text-ellipsis outline-none',
					TITLE_TEXT_CLASS,
					isMarquee ? 'text-transparent' : 'text-main-deep-blue'
				)}
			/>
		</div>
	)
}

export default WorkflowToolbarTitle
