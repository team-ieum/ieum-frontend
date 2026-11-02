import ErrorPageView from '@/components/common/ErrorPageView'
import { useNotFoundPageViewModel } from '@/hooks/routing/useNotFoundPageViewModel'

const NotFoundPage = () => {
	const viewModel = useNotFoundPageViewModel()
	return <ErrorPageView {...viewModel} layout='fullscreen' />
}

export default NotFoundPage
