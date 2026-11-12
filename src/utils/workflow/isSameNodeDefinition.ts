import type { WorkflowNodeDto } from '@/types/workflowList'

/** 객체 키를 정렬해 직렬화한다. `_names`처럼 지웠다 다시 넣은 키는 순서만 바뀌므로 값이 같으면 같은 문자열이 된다. */
const stableStringify = (value: unknown): string =>
	JSON.stringify(value, (_key, item: unknown) =>
		item && typeof item === 'object' && !Array.isArray(item)
			? Object.fromEntries(Object.entries(item).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)))
			: item
	)

/** 두 JSON 값이 객체 키 순서와 관계없이 같은지. 노드 테스트 입력처럼 config 밖의 값도 같은 기준으로 비교한다. */
export const isSameJsonValue = (left: unknown, right: unknown) => stableStringify(left) === stableStringify(right)

/**
 * 두 노드의 실행 정의(event·config)가 같은지. 위치·라벨이나 config 키 순서만 바뀐 노드는 같다고 본다.
 * 노드 테스트 결과가 지금 설정 기준인지, 서버 검사 결과가 지금 설정 기준인지를 가르는 데 함께 쓴다.
 */
export const isSameNodeDefinition = (left: WorkflowNodeDto, right: WorkflowNodeDto) =>
	left.event === right.event && isSameJsonValue(left.config, right.config)
