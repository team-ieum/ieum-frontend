import type { NodeCatalogKind } from '@/types/nodeCatalog'

/** 툴바 버튼의 `aria-controls`가 가리키는 팔레트 패널 id. */
export const NODE_CATALOG_PALETTE_ID = 'node-catalog-palette'

/** 팔레트에서 종류를 보여 주는 순서와 이름. */
export const NODE_CATALOG_KIND_LABELS: Record<NodeCatalogKind, string> = {
	trigger: '트리거',
	action: '작업',
	search: '검색',
}

export const NODE_CATALOG_KIND_ORDER = Object.keys(NODE_CATALOG_KIND_LABELS) as NodeCatalogKind[]
