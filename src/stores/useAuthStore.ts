import { create } from 'zustand'

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

interface AuthState {
	accessToken: string | null
	refreshToken: string | null
	setAuth: (accessToken: string, refreshToken: string) => void
	clearAuth: () => void
}

export const useAuthStore = create<AuthState>(set => ({
	accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
	refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
	setAuth: (accessToken, refreshToken) => {
		localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
		localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
		set({ accessToken, refreshToken })
	},
	clearAuth: () => {
		localStorage.removeItem(ACCESS_TOKEN_KEY)
		localStorage.removeItem(REFRESH_TOKEN_KEY)
		set({ accessToken: null, refreshToken: null })
	},
}))
