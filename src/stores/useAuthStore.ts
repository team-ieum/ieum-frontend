import { create } from 'zustand'
import { LOCAL_STORAGE_KEY } from '@/constants/key'

interface AuthState {
	accessToken: string | null
	refreshToken: string | null
	setAuth: (accessToken: string, refreshToken: string) => void
	clearAuth: () => void
}

export const useAuthStore = create<AuthState>(set => ({
	accessToken: localStorage.getItem(LOCAL_STORAGE_KEY.ACCESS_TOKEN),
	refreshToken: localStorage.getItem(LOCAL_STORAGE_KEY.REFRESH_TOKEN),
	setAuth: (accessToken, refreshToken) => {
		localStorage.setItem(LOCAL_STORAGE_KEY.ACCESS_TOKEN, accessToken)
		localStorage.setItem(LOCAL_STORAGE_KEY.REFRESH_TOKEN, refreshToken)
		set({ accessToken, refreshToken })
	},
	clearAuth: () => {
		localStorage.removeItem(LOCAL_STORAGE_KEY.ACCESS_TOKEN)
		localStorage.removeItem(LOCAL_STORAGE_KEY.REFRESH_TOKEN)
		set({ accessToken: null, refreshToken: null })
	},
}))
