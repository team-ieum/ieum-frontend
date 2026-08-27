import { Profiler, type PropsWithChildren } from 'react'
import { recordMeasurementCommit } from './measurementProfilerRecorder'

export const MeasurementProfiler = ({ children }: PropsWithChildren) => (
	<Profiler id='routed-app' onRender={recordMeasurementCommit}>
		{children}
	</Profiler>
)
