import { create } from 'zustand'
import type { AuthMode, SwapDirection } from '../types/auth'

interface AuthModeState {
	mode: AuthMode
	swapDirection: SwapDirection
	toLogin: () => void
	toSignup: () => void
	toForgotPassword: () => void
}

export const useAuthMode = create<AuthModeState>(set => ({
	mode: 'login',
	swapDirection: 1,
	toLogin: () => set({ mode: 'login', swapDirection: -1 }),
	toSignup: () => set({ mode: 'signup', swapDirection: 1 }),
	toForgotPassword: () => set({ mode: 'forgotPassword', swapDirection: 1 }),
}))
