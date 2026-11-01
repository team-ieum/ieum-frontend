type Position = { x: number; y: number }
type Rect = Position & { width: number; height: number }

// 아직 측정되지 않은 WorkflowNode 카드(w-66)의 대략적인 크기. 새 노드와 측정 전 노드의 자리 계산에만 쓴다.
const ESTIMATED_NODE_SIZE = { width: 264, height: 150 }
const CASCADE_OFFSET = 32

const intersects = (a: Rect, b: Rect) =>
	a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** 캔버스 노드가 차지하는 영역. ReactFlow가 측정한 크기가 있으면 쓰고, 없으면 추정 크기를 쓴다. */
export const getNodeRect = (node: { position: Position; measured?: { width?: number; height?: number } }): Rect => ({
	...node.position,
	width: node.measured?.width ?? ESTIMATED_NODE_SIZE.width,
	height: node.measured?.height ?? ESTIMATED_NODE_SIZE.height,
})

/**
 * 화면 가운데(flow 좌표)에 새 노드를 놓을 왼쪽 위 좌표를 구한다.
 * 기존 노드 영역과 겹치면 겹치지 않을 때까지 대각선으로 한 칸씩 비켜 놓는다.
 */
export const placeNewNode = (viewportCenter: Position, occupied: Rect[]): Position => {
	const { width, height } = ESTIMATED_NODE_SIZE
	let candidate: Rect = { x: viewportCenter.x - width / 2, y: viewportCenter.y - height / 2, width, height }
	// 한 칸씩 오른쪽 아래로만 움직이므로 유한한 노드 영역을 언젠가 모두 벗어난다.
	while (occupied.some(rect => intersects(candidate, rect))) {
		candidate = { ...candidate, x: candidate.x + CASCADE_OFFSET, y: candidate.y + CASCADE_OFFSET }
	}
	return { x: candidate.x, y: candidate.y }
}

// 앞 노드의 + 버튼과 연결선이 보이도록 두는 가로 간격, 같은 열의 노드끼리 두는 세로 간격.
const NEXT_NODE_GAP_X = 80
const NEXT_NODE_GAP_Y = 24

/**
 * `source` 노드 바로 오른쪽에 다음 노드를 놓을 왼쪽 위 좌표를 구한다.
 * 그 자리에 이미 노드가 있으면(같은 노드에서 갈래를 여럿 낼 때 등) 겹치지 않을 때까지 한 칸씩 아래로 내린다.
 */
export const placeNextNode = (source: Rect, occupied: Rect[]): Position => {
	const { width, height } = ESTIMATED_NODE_SIZE
	let candidate: Rect = { x: source.x + source.width + NEXT_NODE_GAP_X, y: source.y, width, height }
	// 아래로만 움직이므로 유한한 노드 영역을 언젠가 모두 벗어난다.
	while (occupied.some(rect => intersects(candidate, rect))) {
		candidate = { ...candidate, y: candidate.y + height + NEXT_NODE_GAP_Y }
	}
	return { x: candidate.x, y: candidate.y }
}
