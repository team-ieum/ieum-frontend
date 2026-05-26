import { Plus, Search } from 'lucide-react'

const IntegrationPageHeader = () => (
	<div className='flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-neutral-white px-6 py-5'>
		<div className='flex flex-col gap-1'>
			<h1 className='typo-title1_bold m-0 text-neutral-900'>통합 및 설정</h1>
			<p className='typo-body3_regular m-0 text-neutral-500'>외부 서비스를 연결하여 워크플로우 자동화를 구성하세요.</p>
		</div>
		<div className='flex items-center gap-2'>
			<label className='relative hidden sm:block'>
				<Search size={16} className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400' />
				<input
					type='search'
					placeholder='서비스 검색 (⌘K)'
					className='h-9 w-52 rounded-brand-sm border border-neutral-200 bg-neutral-50 py-0 pl-9 pr-3 typo-body3_regular text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-main-blue focus:bg-neutral-white'
				/>
			</label>
			<button
				type='button'
				className='inline-flex h-9 items-center gap-1.5 rounded-brand-sm bg-main-blue px-4 typo-body3_semibold text-neutral-white transition-colors hover:bg-main-deep-blue'
			>
				<Plus size={16} />새 연결
			</button>
		</div>
	</div>
)

export default IntegrationPageHeader
