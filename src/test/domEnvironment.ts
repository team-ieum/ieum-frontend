const DEFAULT_VIEWPORT_WIDTH = 1280
const ROOT_FONT_SIZE = 16

let reducedMotion = false
let viewportWidth = DEFAULT_VIEWPORT_WIDTH
const animationFrameHandles = new Set<number>()
const mediaQueryLists = new Map<string, MediaQueryListMock>()
const intersectionObservers = new Set<IntersectionObserverMock>()

const toPixels = (value: string, unit: string) => Number(value) * (unit === 'rem' || unit === 'em' ? ROOT_FONT_SIZE : 1)

const matchesQuery = (query: string) => {
	if (query === '(prefers-reduced-motion)' || query === '(prefers-reduced-motion: reduce)') return reducedMotion
	if (query === '(prefers-reduced-motion: no-preference)') return !reducedMotion

	const widthQuery = /^\((min|max)-width:\s*([\d.]+)(px|rem|em)\)$/.exec(query)
	if (widthQuery) {
		const [, bound, value, unit] = widthQuery
		const pixels = toPixels(value, unit)
		return bound === 'min' ? viewportWidth >= pixels : viewportWidth <= pixels
	}
	return false
}

class MediaQueryListMock {
	readonly media: string
	onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null = null
	private readonly listeners = new Set<EventListenerOrEventListenerObject>()

	constructor(media: string) {
		this.media = media
	}

	get matches() {
		return matchesQuery(this.media)
	}

	addListener(listener: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null) {
		if (listener) this.listeners.add(listener as EventListener)
	}

	removeListener(listener: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null) {
		if (listener) this.listeners.delete(listener as EventListener)
	}

	addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
		if (type === 'change' && listener) this.listeners.add(listener)
	}

	removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
		if (type === 'change' && listener) this.listeners.delete(listener)
	}

	dispatchEvent(event: Event) {
		for (const listener of this.listeners) {
			if (typeof listener === 'function') listener.call(this, event)
			else listener.handleEvent(event)
		}
		this.onchange?.call(this as unknown as MediaQueryList, event as MediaQueryListEvent)
		return true
	}

	dispatchChange() {
		const event = new Event('change') as MediaQueryListEvent
		Object.defineProperties(event, {
			matches: { value: this.matches },
			media: { value: this.media },
		})
		this.dispatchEvent(event)
	}
}

const getMediaQueryList = (query: string) => {
	const current = mediaQueryLists.get(query)
	if (current) return current

	const created = new MediaQueryListMock(query)
	mediaQueryLists.set(query, created)
	return created
}

const updateMediaState = (update: () => void) => {
	const previousMatches = new Map([...mediaQueryLists].map(([query, mediaQueryList]) => [query, mediaQueryList.matches]))
	update()

	for (const [query, mediaQueryList] of mediaQueryLists) {
		if (previousMatches.get(query) !== mediaQueryList.matches) mediaQueryList.dispatchChange()
	}
}

class ResizeObserverMock implements ResizeObserver {
	disconnect() {}
	observe() {}
	unobserve() {}
}

class IntersectionObserverMock implements IntersectionObserver {
	readonly root = null
	readonly rootMargin: string
	readonly scrollMargin = '0px'
	readonly thresholds: readonly number[]
	private readonly callback: IntersectionObserverCallback
	private readonly elements = new Set<Element>()

	constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
		this.callback = callback
		this.rootMargin = options.rootMargin ?? '0px'
		this.thresholds = Array.isArray(options.threshold)
			? options.threshold
			: [typeof options.threshold === 'number' ? options.threshold : 0]
		intersectionObservers.add(this)
	}

	disconnect() {
		this.elements.clear()
		intersectionObservers.delete(this)
	}

	observe(element: Element) {
		this.elements.add(element)
	}

	takeRecords() {
		return []
	}

	unobserve(element: Element) {
		this.elements.delete(element)
	}

	trigger(isIntersecting: boolean) {
		const entries = [...this.elements].map(
			target =>
				({
					target,
					isIntersecting,
					intersectionRatio: isIntersecting ? 1 : 0,
				}) as IntersectionObserverEntry
		)
		if (entries.length > 0) {
			this.callback(entries, this)
		}
	}
}

export const installDomEnvironment = () => {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		writable: true,
		value: (query: string) => getMediaQueryList(query) as unknown as MediaQueryList,
	})
	Object.defineProperty(window, 'scrollTo', {
		configurable: true,
		writable: true,
		value: () => undefined,
	})
	Object.defineProperty(Element.prototype, 'scrollIntoView', {
		configurable: true,
		writable: true,
		value: () => undefined,
	})
	Object.defineProperty(window, 'requestAnimationFrame', {
		configurable: true,
		writable: true,
		value: (callback: FrameRequestCallback) => {
			const handle = window.setTimeout(() => {
				animationFrameHandles.delete(handle)
				callback(performance.now())
			}, 0)
			animationFrameHandles.add(handle)
			return handle
		},
	})
	Object.defineProperty(window, 'cancelAnimationFrame', {
		configurable: true,
		writable: true,
		value: (handle: number) => window.clearTimeout(handle),
	})
	Object.defineProperty(globalThis, 'ResizeObserver', {
		configurable: true,
		writable: true,
		value: ResizeObserverMock,
	})
	Object.defineProperty(globalThis, 'IntersectionObserver', {
		configurable: true,
		writable: true,
		value: IntersectionObserverMock,
	})
	// jsdom은 layout이 없어 빈 목록을 반환하므로 focus-trap(tabbable)이 모든 요소를 숨김으로 판정한다.
	Object.defineProperty(Element.prototype, 'getClientRects', {
		configurable: true,
		writable: true,
		value(this: Element) {
			const rects = this.closest('[hidden]') ? [] : [new DOMRect(0, 0, 1, 1)]
			return Object.assign(rects, { item: (index: number) => rects[index] ?? null }) as unknown as DOMRectList
		},
	})
}

export const setReducedMotion = (value: boolean) => {
	updateMediaState(() => {
		reducedMotion = value
	})
}

/** `(min-width)`/`(max-width)` media query 판정에 쓰는 viewport 너비를 바꾼다. 기본값은 desktop 너비다. */
export const setViewportWidth = (width: number) => {
	updateMediaState(() => {
		viewportWidth = width
	})
}

export const intersectObservedElements = (isIntersecting: boolean = true): void => {
	for (const observer of [...intersectionObservers]) {
		observer.trigger(isIntersecting)
	}
}

export const getIntersectionObserverRootMargins = (): string[] => [...intersectionObservers].map(observer => observer.rootMargin)

export const resetDomEnvironment = () => {
	for (const handle of animationFrameHandles) window.clearTimeout(handle)
	animationFrameHandles.clear()
	for (const observer of [...intersectionObservers]) observer.disconnect()
	updateMediaState(() => {
		reducedMotion = false
		viewportWidth = DEFAULT_VIEWPORT_WIDTH
	})
}
