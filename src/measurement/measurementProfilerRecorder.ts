import type { ProfilerOnRenderCallback } from 'react'
import { logMeasurementEvent, MEASUREMENT_PROFILER_PREFIX } from './measurementConsole'
import { measurementSessionId } from './measurementSession'

export type MeasurementProfilerCommit = {
	sessionId: string
	id: string
	phase: Parameters<ProfilerOnRenderCallback>[1]
	actualDuration: number
	baseDuration: number
	startTime: number
	commitTime: number
	pathname: string
}

export type MeasurementProfilerApi = {
	reset: () => void
	read: () => MeasurementProfilerCommit[]
}

const commits: MeasurementProfilerCommit[] = []

const measurementProfilerApi: MeasurementProfilerApi = {
	reset: () => {
		commits.length = 0
	},
	read: () => commits.map(commit => ({ ...commit })),
}

export const recordMeasurementCommit: ProfilerOnRenderCallback = (
	id,
	phase,
	actualDuration,
	baseDuration,
	startTime,
	commitTime
) => {
	const commit = {
		sessionId: measurementSessionId,
		id,
		phase,
		actualDuration,
		baseDuration,
		startTime,
		commitTime,
		pathname: window.location.pathname,
	}
	commits.push(commit)
	logMeasurementEvent(MEASUREMENT_PROFILER_PREFIX, commit)
}

export const installMeasurementProfilerApi = () => {
	measurementProfilerApi.reset()
	window.__IEUM_MEASUREMENT__ = measurementProfilerApi
}
