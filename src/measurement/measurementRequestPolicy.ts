import type { UnhandledRequestCallback } from 'msw'

export const isMeasurementApiRequest = (request: Request): boolean => {
	const pathname = new URL(request.url).pathname
	return pathname === '/api' || pathname.startsWith('/api/')
}

export const onMeasurementUnhandledRequest: UnhandledRequestCallback = (request, print) => {
	if (isMeasurementApiRequest(request)) {
		print.error()
	}
}
