import { ArrowLeft, Bug, CloudCheck, History, Rocket, Share2 } from 'lucide-react'
import { useWorkflowToolbar } from '@/hooks/workflow/useWorkflowToolbar'

type WorkflowToolbarProps = {
	defaultTitle?: string
}

const WorkflowToolbar = ({ defaultTitle = '워크플로우 제목' }: WorkflowToolbarProps) => {
	const { title, handleTitleChange, handleBack } = useWorkflowToolbar(defaultTitle)

	return (
		<div
			className='flex items-center gap-3.5 px-6 border-b border-neutral-200 shrink-0'
			style={{ height: 64, background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(8px)' }}
		>
			<button
				type='button'
				onClick={handleBack}
				aria-label='뒤로 가기'
				className='w-9 h-9 rounded-[10px] grid place-items-center bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0 cursor-pointer'
			>
				<ArrowLeft size={18} />
			</button>

			<div className='flex items-center gap-2.5'>
				<input
					value={title}
					onChange={e => handleTitleChange(e.target.value)}
					aria-label='워크플로우 제목'
					className='text-xl font-bold text-main-deep-blue tracking-wide outline-none bg-transparent rounded-md px-2 py-1 hover:bg-neutral-100 focus:bg-neutral-100 transition-colors min-w-0'
					style={{ fontFamily: 'var(--font-sans)' }}
				/>
				<span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-main-light-blue text-main-deep-blue border border-[#cde9f4] text-xs font-semibold shrink-0'>
					<span className='w-1.5 h-1.5 rounded-full bg-main-blue' />
					DRAFT
				</span>
			</div>

			<span className='inline-flex items-center gap-1 text-xs text-neutral-400 shrink-0'>
				<CloudCheck size={14} className='text-node-green' />
				방금 전 자동 저장됨
			</span>

			<div className='flex-1' />

			<button
				type='button'
				aria-label='실행 이력'
				className='w-9 h-9 rounded-[10px] grid place-items-center text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer'
			>
				<History size={18} />
			</button>
			<button
				type='button'
				aria-label='공유'
				className='w-9 h-9 rounded-[10px] grid place-items-center text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer'
			>
				<Share2 size={18} />
			</button>
			<button
				type='button'
				className='inline-flex items-center gap-2 h-9 px-4 rounded-[10px] border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer'
			>
				<Bug size={15} />
				테스트
			</button>
			<button
				type='button'
				className='inline-flex items-center gap-2 h-9 px-4 rounded-[10px] bg-main-deep-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer'
			>
				<Rocket size={15} />
				Deploy
			</button>
		</div>
	)
}

export default WorkflowToolbar
