import type { ProfilerOnRenderCallback } from 'react'

export type MeasurementProfilerCommit = {
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
	commits.push({ id, phase, actualDuration, baseDuration, startTime, commitTime, pathname: window.location.pathname })
}

export const installMeasurementProfilerApi = () => {
	measurementProfilerApi.reset()
	window.__IEUM_MEASUREMENT__ = measurementProfilerApi
}
