import { lazy } from 'react'

type LazyComponentType = Awaited<ReturnType<Parameters<typeof lazy>[0]>>['default']
type ComponentModule<T> = { default: T }

/**
 * 미리 받을 수 있는 `React.lazy` 컴포넌트를 만든다.
 *
 * `preload`가 끝난 뒤 처음 렌더하면 suspend 없이 바로 표시한다. `preload`와 lazy 렌더가 같은 진행 중 import를 공유하고,
 * import가 실패하면 다음 호출에서 importer를 다시 실행한다. `preload`는 실패해도 reject하지 않는다.
 * lazy 렌더 중의 import 실패는 React.lazy가 결과를 유지해 다시 import하지 않으므로, 재시도는 렌더 전 `preload`에만 적용된다.
 */
export const createPreloadableLazy = <T extends LazyComponentType>(importer: () => Promise<ComponentModule<T>>) => {
	let loaded: ComponentModule<T> | undefined
	let pending: Promise<ComponentModule<T>> | undefined

	const load = () => {
		pending ??= importer().then(
			module => {
				loaded = module
				return module
			},
			error => {
				pending = undefined
				throw error
			}
		)
		return pending
	}

	// 이미 resolve된 Promise를 받아도 React.lazy는 한 번 suspend하고, React 19는 표시한 fallback을 최소 300ms 유지한다.
	// 받은 module은 then을 동기로 호출하는 thenable로 넘겨 첫 렌더에서 바로 resolved로 판정되게 한다.
	const Component = lazy(() => {
		const module = loaded
		if (!module) {
			return load()
		}
		const resolvedThenable = { then: (resolve: (value: ComponentModule<T>) => void) => resolve(module) }
		return resolvedThenable as unknown as Promise<ComponentModule<T>>
	})

	const preload = () =>
		load().then(
			() => undefined,
			() => undefined
		)

	return { Component, preload }
}
