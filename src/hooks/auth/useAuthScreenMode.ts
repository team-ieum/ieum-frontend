import { useAuthMode } from '../../stores/useAuthMode'

export const useAuthScreenMode = () => {
	const mode = useAuthMode(state => state.mode)
	const swapDirection = useAuthMode(state => state.swapDirection)
	const isSignup = mode === 'signup'
	const isPanelSwapped = mode !== 'login'

	return { mode, swapDirection, isSignup, isPanelSwapped }
}
