import ErrorPageView from '@/components/common/ErrorPageView'
import { useRouteErrorViewModel } from '@/hooks/routing/useRouteErrorViewModel'
import type { ErrorPageLayout } from '@/types/errorPage'

type RouteErrorPageProps = {
	layout?: ErrorPageLayout
}

const RouteErrorPage = ({ layout = 'content' }: RouteErrorPageProps) => {
	const viewModel = useRouteErrorViewModel()
	return <ErrorPageView {...viewModel} layout={layout} />
}

export default RouteErrorPage
