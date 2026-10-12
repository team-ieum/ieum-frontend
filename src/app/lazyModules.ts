import type { SidebarNavId } from '@/constants/layout'
import { createPreloadableLazy } from '@/app/createPreloadableLazy'

// 분리 대상은 PERF-01 bundle 측정 근거로 정했다(docs/perf-01-bundle-font-baseline.md).
const workflowEditorPage = createPreloadableLazy(() => import('@/pages/WorkFlowPage'))
const dashboardHeroSection = createPreloadableLazy(() => import('@/components/dashboard/DashboardHeroSection'))

/** `@xyflow/react`·STOMP·SockJS를 포함하는 워크플로우 편집 page. `Suspense`로 감싸 사용한다. */
export const LazyWorkflowEditorPage = workflowEditorPage.Component

/** Recharts를 포함하는 대시보드 hero 차트 섹션. `Suspense`로 감싸 사용한다. */
export const LazyDashboardHeroSection = dashboardHeroSection.Component

const SIDEBAR_CHUNK_PRELOADERS: Partial<Record<SidebarNavId, () => Promise<void>>> = {
	dashboard: dashboardHeroSection.preload,
	// 목록에서 상세 편집으로 이어지는 흐름이 대부분이라 목록 진입 의도에서 편집 page chunk를 미리 받는다.
	canvas: workflowEditorPage.preload,
}

/** 사이드바 이동 의도(hover·focus)에서 대상 route가 쓰는 분리 chunk를 미리 받는다. */
export const preloadSidebarRouteChunk = (navId: SidebarNavId) => {
	void SIDEBAR_CHUNK_PRELOADERS[navId]?.()
}

/** 새 캔버스·최근 작업처럼 편집 page로 바로 이동하는 컨트롤의 이동 의도에서 chunk를 미리 받는다. */
export const preloadWorkflowEditorPage = () => {
	void workflowEditorPage.preload()
}

/** 대시보드 진입 직후 호출해 hero 차트 chunk를 요약 데이터 요청과 병렬로 받는다. */
export const preloadDashboardHeroSection = () => {
	void dashboardHeroSection.preload()
}
