export const DEFAULT_MEASUREMENT_DELAY_MS = 800

export const parseMeasurementDelay = (value: string | undefined): number => {
	const delayMs = Number(value)
	return Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : DEFAULT_MEASUREMENT_DELAY_MS
}
