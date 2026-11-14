import { useId } from 'react'
import { TEXTAREA_CLASS } from '@/components/workflow/settings/settingsFieldClassNames'
import { cn } from '@/utils/cn'

type ManualRunInputFieldProps = {
	value: string
	/** 객체 JSON이 아닐 때의 이유. 있으면 칸을 오류로 표시한다. */
	error?: string
	onChange: (value: string) => void
}

/** `manual.run` 노드 테스트에 보낼 JSON 입력 칸. 실제 실행에는 쓰지 않는다. */
const ManualRunInputField = ({ value, error, onChange }: ManualRunInputFieldProps) => {
	const inputId = useId()
	const hintId = useId()
	const errorId = useId()

	return (
		<div className='flex flex-col gap-1'>
			<label htmlFor={inputId} className='typo-caption1_semibold text-neutral-700'>
				테스트 입력 (JSON)
			</label>
			<textarea
				id={inputId}
				value={value}
				onChange={event => onChange(event.target.value)}
				placeholder='{"orderId": "ORD-1", "amount": 12000}'
				spellCheck={false}
				aria-invalid={error ? true : undefined}
				aria-describedby={error ? `${errorId} ${hintId}` : hintId}
				className={cn(TEXTAREA_CLASS, 'typo-mono-caption1_regular')}
			/>
			{error ? (
				<p id={errorId} className='m-0 typo-caption1_regular text-danger-700'>
					{error}
				</p>
			) : null}
			<p id={hintId} className='m-0 typo-caption2_regular text-neutral-500'>
				비우면 입력 없이 테스트해요. 실제 실행에는 이 입력이 들어가지 않고, 테스트 결과와 출력 참조 후보에만 쓰여요.
			</p>
		</div>
	)
}

export default ManualRunInputField
