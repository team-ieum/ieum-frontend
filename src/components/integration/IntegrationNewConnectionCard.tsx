import { Plus } from 'lucide-react'

const IntegrationNewConnectionCard = () => (
	<button
		type='button'
		className='flex min-h-[188px] flex-col items-center justify-center gap-2 rounded-brand-md border-2 border-dashed border-neutral-300 bg-neutral-white p-6 text-neutral-500 transition-colors hover:border-main-blue hover:bg-main-light-blue/30 hover:text-main-blue'
	>
		<span className='grid h-11 w-11 place-items-center rounded-full border border-neutral-200 bg-neutral-50'>
			<Plus size={22} />
		</span>
		<span className='typo-body2_semibold text-neutral-700'>새 서비스 연결</span>
		<span className='typo-caption1_regular text-neutral-400'>OAuth 또는 API 키로 연결</span>
	</button>
)

export default IntegrationNewConnectionCard
