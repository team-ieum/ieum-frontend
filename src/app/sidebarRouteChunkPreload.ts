import { preloadDashboardHeroSection, preloadWorkflowEditorPage } from '@/app/lazyModules'
import type { SidebarNavId } from '@/constants/layout'

const SIDEBAR_CHUNK_PRELOADERS: Partial<Record<SidebarNavId, () => void>> = {
	dashboard: preloadDashboardHeroSection,
	// 목록에서 상세 편집으로 이어지는 흐름이 대부분이라 목록 진입 의도에서 편집 page chunk를 미리 받는다.
	canvas: preloadWorkflowEditorPage,
}

/** 사이드바 이동 의도(hover·focus)에서 대상 route가 쓰는 분리 chunk를 미리 받는다. 분리 chunk가 없는 메뉴는 아무것도 하지 않는다. */
export const preloadSidebarRouteChunk = (navId: SidebarNavId) => {
	SIDEBAR_CHUNK_PRELOADERS[navId]?.()
}
