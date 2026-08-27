/// <reference types="vite/client" />

import type { MeasurementProfilerApi } from '@/measurement/measurementProfilerRecorder'

declare global {
	interface ImportMetaEnv {
		readonly VITE_API_URL: string
		readonly VITE_MEASUREMENT_MODE?: 'true'
		readonly VITE_MEASUREMENT_DELAY_MS?: string
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv
	}

	interface Window {
		__IEUM_MEASUREMENT__?: MeasurementProfilerApi
	}
}
