import { describe, expect, it } from 'vitest'
import { getNodeRect, placeNewNode, placeNextNode } from '@/utils/workflow/placeNewNode'

describe('placeNewNode', () => {
	it('카드 중심이 화면 가운데에 오도록 왼쪽 위 좌표를 정한다', () => {
		expect(placeNewNode({ x: 500, y: 300 }, [])).toEqual({ x: 368, y: 225 })
	})

	it('기존 노드 영역과 겹치지 않는 노드는 비켜 놓지 않는다', () => {
		const occupied = [{ x: 632, y: 225, width: 264, height: 150 }]

		expect(placeNewNode({ x: 500, y: 300 }, occupied)).toEqual({ x: 368, y: 225 })
	})

	// 좌상단이 15px만 어긋난 키 큰 카드도 겹침으로 판정해야 거의 포개진 채 놓이지 않는다.
	it('좌상단이 조금 어긋난 키 큰 카드와 겹치면 영역을 벗어날 때까지 대각선으로 비켜 놓는다', () => {
		const occupied = [{ x: 368, y: 210, width: 264, height: 180 }]

		expect(placeNewNode({ x: 500, y: 300 }, occupied)).toEqual({ x: 560, y: 417 })
	})
})

describe('placeNextNode', () => {
	const source = { x: 0, y: 40, width: 264, height: 160 }

	it('앞 노드 오른쪽에 같은 높이로 간격을 두고 놓는다', () => {
		expect(placeNextNode(source, [source])).toEqual({ x: 344, y: 40 })
	})

	it('그 자리에 이미 갈래 노드가 있으면 겹치지 않을 때까지 아래로 내린다', () => {
		const occupied = [source, { x: 344, y: 40, width: 264, height: 150 }, { x: 344, y: 214, width: 264, height: 150 }]

		expect(placeNextNode(source, occupied)).toEqual({ x: 344, y: 388 })
	})
})

describe('getNodeRect', () => {
	it('측정한 크기를 쓰고 측정 전 노드는 추정 크기를 쓴다', () => {
		expect(getNodeRect({ position: { x: 10, y: 20 }, measured: { width: 300, height: 190 } })).toEqual({
			x: 10,
			y: 20,
			width: 300,
			height: 190,
		})
		expect(getNodeRect({ position: { x: 10, y: 20 } })).toEqual({ x: 10, y: 20, width: 264, height: 150 })
	})
})
