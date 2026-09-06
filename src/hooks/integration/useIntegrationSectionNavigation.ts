import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { IntegrationTabId } from '@/types/integration'

type UseIntegrationSectionNavigationOptions = {
	isListView: boolean
	shouldReturnToList: boolean
	onReturnToList: () => void
}

type UseIntegrationSectionNavigationResult = {
	activeSection: IntegrationTabId
	aiCredentialsSectionRef: RefObject<HTMLElement | null>
	handleSectionChange: (section: IntegrationTabId) => void
}

export const useIntegrationSectionNavigation = ({
	isListView,
	shouldReturnToList,
	onReturnToList,
}: UseIntegrationSectionNavigationOptions): UseIntegrationSectionNavigationResult => {
	const reduceMotion = useReducedMotion()
	const [activeSection, setActiveSection] = useState<IntegrationTabId>('services')
	const aiCredentialsSectionRef = useRef<HTMLElement>(null)
	const shouldScrollToAiCredentialsRef = useRef(false)
	const isAutoScrollingRef = useRef(false)
	const autoScrollIdleTimerRef = useRef<number | undefined>(undefined)
	const scrollBehavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth'

	const handleSectionChange = useCallback(
		(section: IntegrationTabId) => {
			if (shouldReturnToList) onReturnToList()
			isAutoScrollingRef.current = true
			if (section === 'aiCredentials') {
				shouldScrollToAiCredentialsRef.current = true
			} else {
				window.scrollTo({ top: 0, behavior: scrollBehavior })
			}
			setActiveSection(section)
		},
		[onReturnToList, scrollBehavior, shouldReturnToList]
	)

	useEffect(() => {
		if (!shouldScrollToAiCredentialsRef.current || activeSection !== 'aiCredentials' || !isListView) return

		shouldScrollToAiCredentialsRef.current = false
		const frame = window.requestAnimationFrame(() => {
			aiCredentialsSectionRef.current?.scrollIntoView({ behavior: scrollBehavior, block: 'start' })
		})
		return () => window.cancelAnimationFrame(frame)
	}, [activeSection, isListView, scrollBehavior])

	useEffect(() => {
		if (!isListView) return

		const handleScroll = () => {
			if (isAutoScrollingRef.current) {
				window.clearTimeout(autoScrollIdleTimerRef.current)
				autoScrollIdleTimerRef.current = window.setTimeout(() => {
					isAutoScrollingRef.current = false
				}, 200)
				return
			}

			const section = aiCredentialsSectionRef.current
			if (!section) return

			const isAiCredentialsInView = section.getBoundingClientRect().top <= window.innerHeight / 3
			setActiveSection(isAiCredentialsInView ? 'aiCredentials' : 'services')
		}

		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => {
			window.removeEventListener('scroll', handleScroll)
			window.clearTimeout(autoScrollIdleTimerRef.current)
		}
	}, [isListView])

	return { activeSection, aiCredentialsSectionRef, handleSectionChange }
}
