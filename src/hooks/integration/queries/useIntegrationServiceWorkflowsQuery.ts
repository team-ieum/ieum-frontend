import { useInfiniteQuery } from '@tanstack/react-query'
import { getIntegrationServiceWorkflows } from '@/api/integrationWorkflows'
import { queryKeys } from '@/constants/queryKeys'
import type { IntegrationServiceType } from '@/types/integrationWorkflows'

export const useIntegrationServiceWorkflowsQuery = (serviceType: IntegrationServiceType | null, size = 20) =>
	useInfiniteQuery({
		queryKey: queryKeys.integrations.workflows(serviceType ?? 'UNKNOWN', { size }),
		queryFn: ({ pageParam }) => getIntegrationServiceWorkflows(serviceType!, { cursor: pageParam, size }),
		enabled: serviceType !== null,
		initialPageParam: undefined as string | undefined,
		getNextPageParam: page => (page.data.hasNext ? (page.data.nextCursor ?? undefined) : undefined),
	})
