import { isIntegrationBrand } from '@/constants/integration/brandConfig'
import { NODE_CATALOG_KIND_ORDER } from '@/constants/workflow/nodeCatalog'
import type { IntegrationBrand } from '@/types/integration'
import type { NodeCatalogEntry, NodeCatalogKind } from '@/types/nodeCatalog'
import type { WorkflowNodeKind } from '@/types/workflowCommon'
import type { WorkflowNodeDto } from '@/types/workflowList'

type NodeCatalogKindGroup = {
	kind: NodeCatalogKind
	entries: NodeCatalogEntry[]
}

export type NodeCatalogAppGroup = {
	app: string
	title: string
	/** 연동 서비스 앱이면 로고를 보여 줄 브랜드. 내장 앱은 비어 있다. */
	brand?: IntegrationBrand
	/** 브랜드가 없을 때 아이콘을 고르는 기준 노드 종류(앱의 첫 항목). */
	nodeType: WorkflowNodeKind
	kinds: NodeCatalogKindGroup[]
}

/**
 * 카탈로그 항목을 팔레트의 앱 → 종류 → 이벤트 구조로 묶는다.
 * 앱은 응답에 처음 나온 순서, 종류는 `NODE_CATALOG_KIND_ORDER` 순서를 따르고 항목이 없는 종류는 뺀다.
 */
export const groupNodeCatalogEntries = (entries: NodeCatalogEntry[]): NodeCatalogAppGroup[] => {
	const apps = new Map<string, { first: NodeCatalogEntry; entries: NodeCatalogEntry[] }>()
	for (const entry of entries) {
		const group = apps.get(entry.app)
		if (group) group.entries.push(entry)
		else apps.set(entry.app, { first: entry, entries: [entry] })
	}

	return [...apps.values()].map(({ first, entries: appEntries }) => {
		const brand = first.fixed.config.brand
		return {
			app: first.app,
			title: first.appTitle,
			brand: isIntegrationBrand(brand) ? brand : undefined,
			nodeType: first.nodeType,
			kinds: NODE_CATALOG_KIND_ORDER.map(kind => ({
				kind,
				entries: appEntries.filter(entry => entry.kind === kind),
			})).filter(group => group.entries.length > 0),
		}
	})
}

/**
 * 카탈로그 항목의 `fixed` 뼈대를 복사해 저장할 새 노드를 만든다.
 * 칸 값은 채우지 않으며(0-D 설정 폼 몫), 항목 config는 노드마다 독립되도록 깊은 복사한다.
 */
export const createWorkflowNodeFromCatalogEntry = (
	entry: NodeCatalogEntry,
	position: { x: number; y: number },
	id: string = crypto.randomUUID()
): WorkflowNodeDto => ({
	id,
	event: entry.id,
	// 서버는 요청 type을 무시하고 event로 다시 계산한다. 저장 전 캔버스 표시에만 쓰도록 같은 값을 채운다.
	type: entry.fixed.type,
	label: entry.title,
	position,
	config: structuredClone(entry.fixed.config),
})
