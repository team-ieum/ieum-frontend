import { infiniteQueryOptions } from '@tanstack/react-query'
import { getIntegrationServiceWorkflows } from '@/api/integrationWorkflows'
import { queryKeys } from '@/constants/queryKeys'
import type { IntegrationServiceType } from '@/types/integrationWorkflows'

/** `serviceType`이 null이면 요청하지 않는 비활성 query가 된다. */
export const integrationServiceWorkflowsQueryOptions = (serviceType: IntegrationServiceType | null, size = 20) =>
	infiniteQueryOptions({
		queryKey: queryKeys.integrations.workflows(serviceType ?? 'UNKNOWN', { size }),
		queryFn: ({ pageParam }) => getIntegrationServiceWorkflows(serviceType!, { cursor: pageParam, size }),
		enabled: serviceType !== null,
		initialPageParam: undefined as string | undefined,
		getNextPageParam: page => (page.data.hasNext ? (page.data.nextCursor ?? undefined) : undefined),
	})
