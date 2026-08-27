import { useAuthStore } from '@/stores/useAuthStore'

const MEASUREMENT_AUTH = {
	accessToken: 'measurement-only-fake-access-token',
	refreshToken: 'measurement-only-fake-refresh-token',
}

export const seedMeasurementAuthState = () => {
	useAuthStore.setState(MEASUREMENT_AUTH)
}
