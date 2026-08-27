import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from './components/ErrorFallback.tsx'

const isMeasurementMode = import.meta.env.VITE_MEASUREMENT_MODE === 'true'
const isDevelopmentMeasurementProfiling = isMeasurementMode && import.meta.env.DEV

async function enableDevelopmentMocking() {
	if (import.meta.env.MODE !== 'development') {
		return
	}
	const { worker } = await import('./mocks/browser')
	return worker.start({ onUnhandledRequest: 'bypass' })
}

async function bootstrap() {
	const measurement = isMeasurementMode
		? await Promise.all([
				import('./measurement/measurementMode'),
				isDevelopmentMeasurementProfiling
					? Promise.all([
							import('./measurement/MeasurementProfiler'),
							import('./measurement/measurementProfilerRecorder'),
						])
					: null,
			])
		: null

	if (measurement) {
		await measurement[0].enableMeasurementMode()
	} else {
		await enableDevelopmentMocking()
	}
	const profiler = measurement?.[1]
	profiler?.[1].installMeasurementProfilerApi()

	const app = (
		<ErrorBoundary FallbackComponent={ErrorFallback}>
			<App />
		</ErrorBoundary>
	)
	const MeasurementProfiler = profiler?.[0].MeasurementProfiler
	const content = MeasurementProfiler ? <MeasurementProfiler>{app}</MeasurementProfiler> : app

	createRoot(document.getElementById('root')!).render(<StrictMode>{content}</StrictMode>)
}

void bootstrap()
