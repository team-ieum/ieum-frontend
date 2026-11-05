/** 텍스트 안에서 찾은 출력 참조식 `{{nodes.<nodeId>.output.<path>}}` 하나. `start`·`end`는 원문 위치다(`end` 미포함). */
export type NodeReference = {
	nodeId: string
	/** `output.` 뒤의 경로(`items.0.summary`) */
	path: string
	start: number
	end: number
}

/** 노드 출력에서 참조할 수 있는 경로 하나. */
export type NodeOutputPath = {
	/** `output.` 뒤에 쓰는 경로. 목록은 첫 항목(`items.0`)만 제시한다. */
	path: string
	/** 화면에 보여 줄 이름. 카탈로그 칸 제목을 `›`로 이은 값이며, 없으면 key를 쓴다. */
	title: string
	/** 아래에 어떤 경로든 올 수 있는 칸(`dynamic: true`)인지. 참조 검사에서 하위 경로를 허용한다. */
	isOpenEnded?: boolean
}

/**
 * 참조 후보 그룹의 상태.
 * - `ready`: 경로를 계산함(경로가 없을 수도 있음)
 * - `loading`: 동적 출력 노드의 테스트 샘플을 불러오는 중
 * - `needsSample`: 동적 출력 노드인데 성공한 테스트 샘플이 없음
 */
type NodeReferenceGroupStatus = 'ready' | 'loading' | 'needsSample'

export type NodeReferenceOption = NodeOutputPath & {
	/** 칸에 넣을 참조식 */
	expression: string
}

/** 참조할 수 있는 조상 노드 하나와 그 출력 경로 후보. */
export type NodeReferenceGroup = {
	nodeId: string
	label: string
	/** 카탈로그 항목 제목. 카탈로그 밖 노드는 없다. */
	entryTitle?: string
	status: NodeReferenceGroupStatus
	options: NodeReferenceOption[]
}

/** 참조 검사에 쓰는 노드 하나의 정보. `paths`가 `null`이면 출력 경로를 알 수 없어(동적 출력·카탈로그 밖) 경로는 검사하지 않는다. */
export type NodeReferenceTarget = {
	label: string
	paths: NodeOutputPath[] | null
}

/** 한 노드에서 참조식을 검사할 때 쓰는 편집 문서 정보. */
export type NodeReferenceContext = {
	ancestorIds: ReadonlySet<string>
	/** 편집 문서의 모든 노드. 키는 노드 id다. */
	targets: ReadonlyMap<string, NodeReferenceTarget>
}

/**
 * 참조식 문제.
 * - `missingNode`: 편집 문서에 없는 노드
 * - `notAncestor`: 자기 자신이거나 앞에 연결되지 않은 노드
 * - `missingPath`: 노드 출력에 없는 경로
 */
export type NodeReferenceIssue = {
	kind: 'missingNode' | 'notAncestor' | 'missingPath'
	nodeId: string
	path: string
	/** 문서에 있는 노드의 라벨 */
	nodeLabel?: string
}

/** 설정 칸이 참조 피커와 참조 경고에 쓰는 값. 설정 패널이 노드마다 한 번 만든다. */
export type NodeReferenceSource = {
	/** 가까운 조상부터 정렬한 후보 그룹 */
	groups: NodeReferenceGroup[]
	context: NodeReferenceContext
}
