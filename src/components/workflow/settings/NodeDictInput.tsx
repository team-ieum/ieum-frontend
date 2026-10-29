import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/cn'

type DictRow = { id: number; key: string; value: string }

type NodeDictInputProps = {
	id: string
	title: string
	value: unknown
	inputClassName: string
	/** 키가 있는 행만 모은 객체를 넘기며, 남는 행이 없으면 `undefined`(비움)다. */
	onChange: (value: Record<string, string> | undefined) => void
}

const toRows = (value: unknown): DictRow[] =>
	value && typeof value === 'object' && !Array.isArray(value)
		? Object.entries(value).map(([key, item], index) => ({ id: index, key, value: String(item ?? '') }))
		: []

const toDict = (rows: DictRow[]) => {
	const entries = rows.filter(row => row.key.trim() !== '').map(row => [row.key.trim(), row.value] as const)
	return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

/**
 * `{문자열: 문자열}` dict 칸을 키·값 행으로 편집한다. 키가 빈 행은 입력 중으로 보고 저장하지 않는다.
 * 이 입력이 넘기지 않은 값이 들어오면 행을 그 값으로 다시 만든다.
 */
const NodeDictInput = ({ id, title, value, inputClassName, onChange }: NodeDictInputProps) => {
	const [rows, setRows] = useState(() => toRows(value))
	const [nextId, setNextId] = useState(() => rows.length)
	const [syncedValue, setSyncedValue] = useState(value)

	if (value !== syncedValue) {
		const nextRows = toRows(value)
		setSyncedValue(value)
		setRows(nextRows.map(row => ({ ...row, id: nextId + row.id })))
		setNextId(nextId + nextRows.length)
	}

	const commit = (nextRows: DictRow[]) => {
		const dict = toDict(nextRows)
		setRows(nextRows)
		setSyncedValue(dict)
		onChange(dict)
	}

	const updateRow = (rowId: number, patch: Partial<Omit<DictRow, 'id'>>) =>
		commit(rows.map(row => (row.id === rowId ? { ...row, ...patch } : row)))

	const addRow = () => {
		setRows([...rows, { id: nextId, key: '', value: '' }])
		setNextId(nextId + 1)
	}

	return (
		<div id={id} className='flex flex-col gap-1.5'>
			{rows.map((row, index) => (
				<div key={row.id} className='grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] gap-1.5'>
					<input
						type='text'
						value={row.key}
						onChange={event => updateRow(row.id, { key: event.target.value })}
						aria-label={`${title} ${index + 1}번째 키`}
						placeholder='키'
						className={inputClassName}
					/>
					<input
						type='text'
						value={row.value}
						onChange={event => updateRow(row.id, { value: event.target.value })}
						aria-label={`${title} ${index + 1}번째 값`}
						placeholder='값'
						className={inputClassName}
					/>
					<button
						type='button'
						onClick={() => commit(rows.filter(item => item.id !== row.id))}
						aria-label={`${title} ${index + 1}번째 항목 삭제`}
						className='grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100'
					>
						<X size={14} aria-hidden='true' />
					</button>
				</div>
			))}
			<button
				type='button'
				onClick={addRow}
				className={cn(
					'inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-main-deep-blue',
					'hover:bg-neutral-100'
				)}
			>
				<Plus size={14} aria-hidden='true' />
				항목 추가
			</button>
		</div>
	)
}

export default NodeDictInput
