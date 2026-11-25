import { Trash2 } from 'lucide-react'
import { useId } from 'react'
import { useNodeDeleteConfirmSetting } from '@/hooks/user/useNodeDeleteConfirmSetting'
import { cn } from '@/utils/cn'

const NodeDeleteConfirmSetting = () => {
	const labelId = useId()
	const descriptionId = useId()
	const setting = useNodeDeleteConfirmSetting()

	return (
		<div className='border-b border-neutral-200 last:border-b-0'>
			<div className='flex min-h-16 items-center gap-3 px-5 py-3 sm:px-8 lg:px-10'>
				<Trash2 size={19} className='shrink-0 text-main-blue' aria-hidden='true' />
				<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
					<span id={labelId} className='typo-body2_semibold text-neutral-700'>
						노드 삭제 전에 확인하기
					</span>
					<span id={descriptionId} className='typo-caption1_regular text-neutral-500'>
						워크플로우 편집 화면에서 노드를 지울 때 한 번 더 물어봐요. 이 브라우저에만 적용돼요.
					</span>
				</div>
				<button
					type='button'
					role='switch'
					aria-checked={setting.shouldConfirm}
					aria-labelledby={labelId}
					aria-describedby={descriptionId}
					onClick={setting.handleToggle}
					className={cn(
						'relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 motion-reduce:transition-none',
						'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue',
						setting.shouldConfirm ? 'bg-main-blue' : 'bg-neutral-300'
					)}
				>
					<span
						aria-hidden='true'
						className={cn(
							'absolute left-0 top-0.5 size-5 rounded-full bg-neutral-white shadow-sm transition-transform duration-200 motion-reduce:transition-none',
							setting.shouldConfirm ? 'translate-x-5.5' : 'translate-x-0.5'
						)}
					/>
				</button>
			</div>
			{setting.errorMessage ? (
				<p role='alert' className='m-0 px-5 pb-3 typo-caption1_medium text-danger-700 sm:px-8 lg:px-10'>
					{setting.errorMessage}
				</p>
			) : null}
		</div>
	)
}

export default NodeDeleteConfirmSetting
