import { useId, type ReactElement } from 'react'
import symbolLogo from '@/assets/symbolNoLine.png'
import PatternBackground from '@/components/common/PatternBackground'
import type { ErrorPageLayout, ErrorPageViewProps } from '@/types/errorPage'
import { cn } from '@/utils/cn'

const LAYOUT_CLASS: Record<ErrorPageLayout, string> = {
	fullscreen: 'w-full min-h-screen',
	content: '-mx-6 -my-6 min-h-[calc(100vh-var(--layout-header-height))]',
}

const ErrorPageView = ({
	title,
	description,
	code,
	icon: Icon,
	illustrationSrc,
	primaryAction,
	secondaryAction,
	layout = 'content',
}: ErrorPageViewProps): ReactElement => {
	const titleId = useId()
	const descriptionId = useId()

	return (
		<section
			aria-labelledby={titleId}
			aria-describedby={description ? descriptionId : undefined}
			className={cn(
				'relative flex items-center justify-center overflow-hidden bg-[#f4fbfe] px-6 py-12',
				LAYOUT_CLASS[layout]
			)}
		>
			<PatternBackground />
			<div className='relative z-10 flex w-full max-w-md flex-col items-center text-center'>
				<div
					className={cn(
						'relative mb-6 grid place-items-center select-none',
						illustrationSrc ? 'size-40' : 'size-28 rounded-full bg-main-light-blue'
					)}
				>
					{illustrationSrc ? (
						<img
							src={illustrationSrc}
							alt=''
							aria-hidden='true'
							draggable={false}
							className='pointer-events-none size-full object-contain'
						/>
					) : Icon ? (
						<Icon size={48} strokeWidth={1.6} className='text-main-deep-blue' aria-hidden='true' />
					) : (
						<img
							src={symbolLogo}
							alt=''
							aria-hidden='true'
							draggable={false}
							className='pointer-events-none size-16 object-contain'
						/>
					)}
					{code ? (
						<span
							className={cn(
								'absolute rounded-full border border-neutral-200 bg-neutral-white px-2.5 py-0.5 typo-caption1_bold text-main-deep-blue shadow-sm',
								illustrationSrc ? 'right-3 bottom-3' : '-right-2 -bottom-1'
							)}
						>
							{code}
						</span>
					) : null}
				</div>

				<h1 id={titleId} className='m-0 typo-title1_bold text-main-deep-blue'>
					{title}
				</h1>
				{description ? (
					<p id={descriptionId} className='mt-2 mb-0 whitespace-pre-line typo-body2_regular text-neutral-500'>
						{description}
					</p>
				) : null}

				{primaryAction || secondaryAction ? (
					<div className='mt-8 flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-center'>
						{secondaryAction ? (
							<button
								type='button'
								onClick={secondaryAction.onClick}
								className='h-10 cursor-pointer rounded-[10px] border border-neutral-200 bg-neutral-white px-5 typo-body2_semibold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-50'
							>
								{secondaryAction.label}
							</button>
						) : null}
						{primaryAction ? (
							<button
								type='button'
								onClick={primaryAction.onClick}
								className='h-10 cursor-pointer rounded-[10px] bg-main-deep-blue px-5 typo-body2_semibold whitespace-nowrap text-neutral-white transition-opacity hover:opacity-90'
							>
								{primaryAction.label}
							</button>
						) : null}
					</div>
				) : null}
			</div>
		</section>
	)
}

export default ErrorPageView
