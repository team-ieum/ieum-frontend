import type { LucideIcon } from 'lucide-react'

export type ErrorPageAction = {
	label: string
	onClick: () => void
}

export type ErrorPageLayout = 'fullscreen' | 'content'

export type ErrorPageContent = {
	title: string
	description?: string
	code?: string
	icon?: LucideIcon
	illustrationSrc?: string
	primaryAction?: ErrorPageAction
	secondaryAction?: ErrorPageAction
}

export type ErrorPageViewProps = ErrorPageContent & {
	layout?: ErrorPageLayout
}

// --- ViewModel (훅) ---

export type ErrorPageViewModel = ErrorPageContent
