import { createPreloadableLazy } from '@/app/createPreloadableLazy'

// 분리 대상은 PERF-01 bundle 측정 근거로 정했다(docs/perf-01-bundle-font-baseline.md).
const workflowEditorPage = createPreloadableLazy(() => import('@/pages/WorkFlowPage'))
const dashboardHeroSection = createPreloadableLazy(() => import('@/components/dashboard/DashboardHeroSection'))

/** `@xyflow/react`·STOMP·SockJS를 포함하는 워크플로우 편집 page. `Suspense`로 감싸 사용한다. */
export const LazyWorkflowEditorPage = workflowEditorPage.Component

/** Recharts를 포함하는 대시보드 hero 차트 섹션. `Suspense`로 감싸 사용한다. */
export const LazyDashboardHeroSection = dashboardHeroSection.Component

/** 워크플로우 편집 page chunk를 미리 받는다. 편집 page로 이어지는 컨트롤의 이동 의도(hover·focus)에서 호출한다. */
export const preloadWorkflowEditorPage = () => {
	void workflowEditorPage.preload()
}

/** 대시보드 hero 차트 chunk를 미리 받는다. 대시보드 mount 직후와 대시보드 메뉴의 이동 의도에서 호출한다. */
export const preloadDashboardHeroSection = () => {
	void dashboardHeroSection.preload()
}
