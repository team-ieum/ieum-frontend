import { useQuery } from '@tanstack/react-query'
import { nodeCatalogQueryOptions } from '@/hooks/workflow/queries/nodeCatalogQueryOptions'

export const useNodeCatalogQuery = () => useQuery(nodeCatalogQueryOptions())
