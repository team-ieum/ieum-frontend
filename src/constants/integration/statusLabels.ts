import type { IntegrationConnectedDisplayStatus, IntegrationStatusLabelConfig, IntegrationTabItem } from '../../types/integration'

export const INTEGRATION_TABS: IntegrationTabItem[] = [
	{ id: 'connected', label: '연결됨' },
	{ id: 'available', label: '사용 가능' },
]

export const INTEGRATION_STATUS_LABEL: Record<IntegrationConnectedDisplayStatus, IntegrationStatusLabelConfig> = {
	connected: { text: '연결됨', className: 'bg-main-light-blue text-main-deep-blue' },
	error: { text: '오류', className: 'bg-danger-100 text-danger-700' },
	expired: { text: '만료됨', className: 'bg-neutral-100 text-neutral-600' },
}
