export type AsyncResourceState = {
	isLoading: boolean
	isRefetching: boolean
	isLoadingError: boolean
	isRefetchError: boolean
	retry: () => void
}
