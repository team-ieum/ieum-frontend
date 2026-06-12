import type { IntegrationConnectedDisplayStatus, IntegrationStatusLabelConfig, IntegrationTabItem } from '../../types/integration'

export const INTEGRATION_TABS: IntegrationTabItem[] = [
	{ id: 'services', label: '서비스' },
	{ id: 'aiCredentials', label: 'AI 자격증명' },
]

export const INTEGRATION_STATUS_LABEL: Record<IntegrationConnectedDisplayStatus, IntegrationStatusLabelConfig> = {
	connected: { text: '연결됨', className: 'bg-main-light-blue text-main-deep-blue' },
	error: { text: '오류', className: 'bg-danger-100 text-danger-700' },
	expired: { text: '만료됨', className: 'bg-neutral-100 text-neutral-600' },
}
