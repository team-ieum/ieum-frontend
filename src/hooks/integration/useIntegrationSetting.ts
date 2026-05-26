import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { integrationMock } from '../../mocks/integration/integrationMock'
import type { IntegrationTabId, IntegrationView, UseIntegrationSettingResult } from '../../types/integration'
import { findServiceById, partitionServices } from '../../utils/integration/selectors'

export const useIntegrationSetting = (): UseIntegrationSettingResult => {
	const { services } = integrationMock

	const [view, setView] = useState<IntegrationView>({ kind: 'list' })
	const [activeTab, setActiveTab] = useState<IntegrationTabId>('connected')

	const availableSectionRef = useRef<HTMLElement>(null)
	const shouldScrollToAvailableRef = useRef(false)

	const { connected, available } = useMemo(() => partitionServices(services), [services])

	const currentService = view.kind === 'detail' ? findServiceById(services, view.id) : undefined

	const goDetail = useCallback((id: string) => {
		setView({ kind: 'detail', id })
	}, [])

	const goList = useCallback(() => {
		setView({ kind: 'list' })
	}, [])

	const handleTabChange = useCallback((tab: IntegrationTabId) => {
		if (tab === 'available') {
			shouldScrollToAvailableRef.current = true
			setView(prev => (prev.kind === 'detail' ? { kind: 'list' } : prev))
		}
		setActiveTab(tab)
	}, [])

	useEffect(() => {
		if (!shouldScrollToAvailableRef.current || activeTab !== 'available' || view.kind !== 'list') {
			return
		}

		shouldScrollToAvailableRef.current = false
		requestAnimationFrame(() => {
			availableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	}, [activeTab, view.kind])

	return {
		view,
		activeTab,
		connected,
		available,
		currentService,
		connectedCount: connected.length,
		availableCount: available.length,
		isListView: view.kind === 'list',
		availableSectionRef,
		goDetail,
		goList,
		handleTabChange,
	}
}
