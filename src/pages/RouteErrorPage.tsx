import ErrorPageView from '@/components/common/ErrorPageView'
import { useRouteErrorViewModel } from '@/hooks/routing/useRouteErrorViewModel'

const RouteErrorPage = () => {
	const viewModel = useRouteErrorViewModel()
	return <ErrorPageView {...viewModel} layout='fullscreen' />
}

export default RouteErrorPage
