import { INTEGRATION_CONNECTION_METHOD_LABEL } from '@/constants/integration/connectionMethodLabels'
import type { IntegrationConnectionMethod } from '@/types/integration'

type IntegrationConnectionMethodBadgeProps = {
	method: IntegrationConnectionMethod
}

const IntegrationConnectionMethodBadge = ({ method }: IntegrationConnectionMethodBadgeProps) => (
	<span className='inline-flex shrink-0 items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 typo-caption1_semibold text-neutral-600'>
		{INTEGRATION_CONNECTION_METHOD_LABEL[method]}
	</span>
)

export default IntegrationConnectionMethodBadge
