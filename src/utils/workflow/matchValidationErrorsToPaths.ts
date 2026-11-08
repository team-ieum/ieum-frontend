import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'

export type MatchedValidationErrors = {
	byPath: ReadonlyMap<string, WorkflowValidationErrorDto[]>
	/** `field`가 없거나 어느 칸 path에도 속하지 않는 오류. 화면에서 빠뜨리지 않도록 따로 모은다. */
	unmatched: WorkflowValidationErrorDto[]
}

const belongsTo = (field: string, path: string) => field === path || field.startsWith(`${path}.`)

/**
 * 한 노드의 검사 오류를 화면에 그리는 칸 path에 붙인다.
 * 오류 `field`가 path와 같거나 그 아래 경로(`<path>.<i>.<하위 칸>`)면 그 칸에 붙이고, 여러 칸이 맞으면 가장 긴 path를 고른다.
 * 그래서 `config.tools.0.config.query`는 도구 칸이 있으면 그 칸에, 없으면 도구 섹션(`config.tools`)에 붙는다.
 */
export const matchValidationErrorsToPaths = (
	errors: WorkflowValidationErrorDto[],
	paths: readonly string[]
): MatchedValidationErrors => {
	const byPath = new Map<string, WorkflowValidationErrorDto[]>()
	const unmatched: WorkflowValidationErrorDto[] = []
	for (const error of errors) {
		const { field } = error
		const path = field
			? paths.reduce<string | undefined>(
					(best, candidate) =>
						belongsTo(field, candidate) && candidate.length > (best?.length ?? -1) ? candidate : best,
					undefined
				)
			: undefined
		if (path === undefined) {
			unmatched.push(error)
			continue
		}
		const pathErrors = byPath.get(path)
		if (pathErrors) pathErrors.push(error)
		else byPath.set(path, [error])
	}
	return { byPath, unmatched }
}
