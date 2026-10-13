export const NOT_FOUND_PAGE_TEXT = {
	code: '404',
	title: '페이지를 찾을 수 없어요',
	description: '주소가 바뀌었거나 삭제된 페이지예요.\n입력한 주소를 다시 확인해주세요.',
} as const

export const ROUTE_ERROR_PAGE_TEXT = {
	code: '500',
	title: '문제가 발생했어요',
	description: '일시적인 오류로 화면을 표시하지 못했어요.\n잠시 후 다시 시도해주세요.',
} as const

export const WORKFLOW_NOT_FOUND_TEXT = {
	code: '404',
	title: '워크플로우를 찾을 수 없어요',
	description: '삭제되었거나 접근할 수 없는 워크플로우예요.\n목록에서 다시 선택해주세요.',
} as const

export const WORKFLOW_LOAD_ERROR_TEXT = {
	title: '워크플로우를 불러오지 못했어요',
	description: '일시적인 오류로 워크플로우를 불러오지 못했어요.\n잠시 후 다시 시도해주세요.',
} as const

export const ERROR_PAGE_ACTION_LABEL = {
	home: '홈으로',
	back: '이전 페이지',
	retry: '다시 시도',
	workflowList: '워크플로우 목록으로',
} as const
