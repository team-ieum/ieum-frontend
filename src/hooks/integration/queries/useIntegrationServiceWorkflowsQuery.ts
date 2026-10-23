import { useInfiniteQuery } from '@tanstack/react-query'
import type { IntegrationServiceType } from '@/types/integrationWorkflows'
import { integrationServiceWorkflowsQueryOptions } from '@/hooks/integration/queries/integrationServiceWorkflowsQueryOptions'

export const useIntegrationServiceWorkflowsQuery = (serviceType: IntegrationServiceType | null, size = 20) =>
	useInfiniteQuery(integrationServiceWorkflowsQueryOptions(serviceType, size))
