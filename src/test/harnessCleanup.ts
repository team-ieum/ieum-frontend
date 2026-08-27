const cleanupCallbacks = new Set<() => void>()

export const registerHarnessCleanup = (callback: () => void) => {
	cleanupCallbacks.add(callback)
	return () => cleanupCallbacks.delete(callback)
}

export const cleanupHarnessResources = () => {
	for (const callback of cleanupCallbacks) callback()
	cleanupCallbacks.clear()
}
