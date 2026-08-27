import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeasurementProfiler } from '@/measurement/MeasurementProfiler'
import { MEASUREMENT_PROFILER_PREFIX } from '@/measurement/measurementConsole'
import { installMeasurementProfilerApi } from '@/measurement/measurementProfilerRecorder'
import { measurementSessionId } from '@/measurement/measurementSession'

describe('MeasurementProfiler', () => {
	afterEach(() => {
		delete window.__IEUM_MEASUREMENT__
		window.history.replaceState(null, '', '/')
	})

	it('React commit 필드와 현재 pathname을 window API에 기록하고 초기화한다', () => {
		const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
		window.history.replaceState(null, '', '/workflow/measurement-workflow')
		installMeasurementProfilerApi()

		render(
			<MeasurementProfiler>
				<div>measurement</div>
			</MeasurementProfiler>
		)

		const [commit] = window.__IEUM_MEASUREMENT__?.read() ?? []
		expect(commit).toMatchObject({
			sessionId: measurementSessionId,
			id: 'routed-app',
			phase: 'mount',
			pathname: '/workflow/measurement-workflow',
		})
		expect(commit?.actualDuration).toEqual(expect.any(Number))
		expect(commit?.baseDuration).toEqual(expect.any(Number))
		expect(commit?.startTime).toEqual(expect.any(Number))
		expect(commit?.commitTime).toEqual(expect.any(Number))
		expect(consoleInfo).toHaveBeenCalledWith(`${MEASUREMENT_PROFILER_PREFIX}${JSON.stringify(commit)}`)

		window.__IEUM_MEASUREMENT__?.reset()
		expect(window.__IEUM_MEASUREMENT__?.read()).toEqual([])
		consoleInfo.mockRestore()
	})

	it('read 결과를 변경해도 내부 기록은 변경되지 않는다', () => {
		const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
		installMeasurementProfilerApi()
		render(
			<MeasurementProfiler>
				<div>measurement</div>
			</MeasurementProfiler>
		)

		const firstRead = window.__IEUM_MEASUREMENT__?.read() ?? []
		firstRead[0]!.pathname = '/mutated'

		expect(window.__IEUM_MEASUREMENT__?.read()[0]?.pathname).toBe('/')
		consoleInfo.mockRestore()
	})
})
