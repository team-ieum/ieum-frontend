type PathContainer = Record<string, unknown> | unknown[]

const isPathContainer = (value: unknown): value is PathContainer => typeof value === 'object' && value !== null

const isIndexSegment = (segment: string) => /^\d+$/.test(segment)

const readChild = (container: unknown, segment: string) =>
	isPathContainer(container) ? (container as Record<string, unknown>)[segment] : undefined

/** `.`으로 나눈 path의 값을 읽는다. 숫자 세그먼트는 배열 인덱스이며 중간 값이 없으면 `undefined`다. */
export const getAtPath = (source: unknown, path: string): unknown =>
	path.split('.').reduce<unknown>((current, segment) => readChild(current, segment), source)

/**
 * path에 값을 쓴 새 객체를 돌려준다. 원본은 바꾸지 않고 path 위의 객체·배열만 복사한다.
 * 중간 값이 없으면 다음 세그먼트가 숫자일 때 배열, 아니면 객체를 만든다.
 */
export const setAtPath = <T extends Record<string, unknown>>(source: T, path: string, value: unknown): T => {
	const segments = path.split('.')
	const write = (current: unknown, index: number): PathContainer => {
		const segment = segments[index]
		const container: PathContainer = Array.isArray(current)
			? [...current]
			: isPathContainer(current)
				? { ...current }
				: isIndexSegment(segment)
					? []
					: {}
		;(container as Record<string, unknown>)[segment] =
			index === segments.length - 1 ? value : write(readChild(current, segment), index + 1)
		return container
	}
	return write(source, 0) as T
}

/** path의 키를 지운 새 객체를 돌려준다. 키가 없으면 원본을 그대로 돌려주고, 배열 원소는 빼서 뒤 원소를 당긴다. */
export const deleteAtPath = <T extends Record<string, unknown>>(source: T, path: string): T => {
	const segments = path.split('.')
	const remove = (current: unknown, index: number): unknown => {
		const segment = segments[index]
		if (!isPathContainer(current) || !(segment in current)) return current
		const container: PathContainer = Array.isArray(current) ? [...current] : { ...current }
		if (index === segments.length - 1) {
			if (Array.isArray(container)) container.splice(Number(segment), 1)
			else delete container[segment]
			return container
		}
		const child = readChild(current, segment)
		const nextChild = remove(child, index + 1)
		if (nextChild === child) return current
		;(container as Record<string, unknown>)[segment] = nextChild
		return container
	}
	return remove(source, 0) as T
}
