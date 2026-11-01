import { api } from '@/utils/AxiosInstance'
import type { NodeOptionsRequest, NodeOptionsResponse } from '@/types/nodeOptions'

/** 드롭다운 목록 한 페이지를 받는다. `source`는 첫 `.`에서 app과 resource로 나눈다. */
export const getNodeOptions = async ({ source, inputs, cursor }: NodeOptionsRequest): Promise<NodeOptionsResponse> => {
	const dotIndex = source.indexOf('.')
	const app = source.slice(0, dotIndex)
	const resource = source.slice(dotIndex + 1)
	const response = await api.get(`/api/v1/integrations/${encodeURIComponent(app)}/options/${encodeURIComponent(resource)}`, {
		params: { ...inputs, ...(cursor ? { cursor } : {}) },
	})
	return response.data
}
