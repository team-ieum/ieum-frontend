import type { NodeCatalogKind, NodePaletteMode } from '@/types/nodeCatalog'

/** 툴바 버튼의 `aria-controls`가 가리키는 팔레트 패널 id. */
export const NODE_CATALOG_PALETTE_ID = 'node-catalog-palette'

/** 팔레트에서 종류를 보여 주는 순서와 이름. */
export const NODE_CATALOG_KIND_LABELS: Record<NodeCatalogKind, string> = {
	trigger: '트리거',
	action: '작업',
	search: '검색',
}

export const NODE_CATALOG_KIND_ORDER = Object.keys(NODE_CATALOG_KIND_LABELS) as NodeCatalogKind[]

/** 팔레트를 연 목적별 제목과 보여 줄 종류. 다음 노드는 앞 노드와 연결되는데 트리거는 연결받을 수 없어 뺀다. */
export const NODE_PALETTE_MODES: Record<NodePaletteMode, { title: string; kinds: readonly NodeCatalogKind[] }> = {
	all: { title: '노드 추가', kinds: NODE_CATALOG_KIND_ORDER },
	trigger: { title: '트리거 고르기', kinds: ['trigger'] },
	next: { title: '다음 노드 추가', kinds: ['action', 'search'] },
}
