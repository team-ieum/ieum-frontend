/** 확인 문구에 이름을 보여 줄 최대 워크플로우 수 */
const MAX_LISTED_NAMES = 3

type AffectedWorkflows = {
	names: string[]
	/** 조회한 첫 페이지 뒤에 워크플로우가 더 있는지. 서버가 전체 개수를 주지 않아 "N개 이상"으로 표시한다. */
	hasMore: boolean
}

/**
 * 연결 해제 확인 문구에 덧붙일 영향받는 워크플로우 안내를 만든다.
 * `null`은 조회에 실패해 확인하지 못한 경우다.
 */
export const formatAffectedWorkflowsNotice = (affected: AffectedWorkflows | null): string => {
	if (!affected) return '이 연결을 쓰는 워크플로우를 확인하지 못했어요.'

	const { names, hasMore } = affected
	if (names.length === 0) return '이 연결을 쓰는 워크플로우는 없어요.'

	const listed = names.slice(0, MAX_LISTED_NAMES).join(', ')
	const restCount = names.length - MAX_LISTED_NAMES
	const rest = hasMore ? ' 등' : restCount > 0 ? ` 외 ${restCount}개` : ''
	const count = hasMore ? `${names.length}개 이상은` : `${names.length}개는`
	return `이 연결을 쓰는 워크플로우 ${count} 실행할 때 실패해요: ${listed}${rest}.`
}
