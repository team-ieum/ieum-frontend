import { useAuthMode } from '../../stores/useAuthMode'

export const useAuthPage = () => {
	const mode = useAuthMode(state => state.mode)
	const swapDirection = useAuthMode(state => state.swapDirection)
	const isSignup = mode === 'signup'

	return { mode, swapDirection, isSignup }
}
