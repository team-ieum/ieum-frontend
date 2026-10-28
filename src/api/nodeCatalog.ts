import { api } from '@/utils/AxiosInstance'
import type { NodeCatalogResponse } from '@/types/nodeCatalog'

export const getNodeCatalog = async (): Promise<NodeCatalogResponse> => {
	const response = await api.get('/api/v1/nodes/catalog')
	return response.data
}
