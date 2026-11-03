---
paths:
    - 'src/app/**/*.{ts,tsx}'
    - 'src/main.tsx'
---

# 앱 조립 (app, main.tsx)

route 구성, 코드 분할, 전역 QueryClient처럼 앱 전체에 한 번만 적용되는 설정을 둡니다. 화면 로직이나 도메인 데이터 변환은 두지 마세요.

## route (`src/app/routes.tsx`)

- route는 `appRoutes` 배열 하나에서 관리합니다. 테스트의 `renderAppRoute`도 이 배열을 그대로 쓰므로 route를 다른 파일에 따로 정의하지 마세요.
- page는 default import로 가져오세요. 인증이 필요한 화면은 `ProtectedRoute` → `Layout` 아래에 둡니다.
- 경로를 옮기면 이전 주소는 `<Navigate replace />`로 새 주소에 연결하고, 그 이유를 주석으로 남기세요.

## 코드 분할 (`lazyModules.ts`, `createPreloadableLazy.ts`)

- 분리 chunk는 번들 측정 근거가 있을 때만 추가하세요(`docs/perf-01-bundle-font-baseline.md`). 근거 없이 page를 lazy로 바꾸지 마세요.
- lazy 컴포넌트는 `React.lazy`를 직접 쓰지 말고 `createPreloadableLazy`로 만들고, `LazyX` 컴포넌트와 `preloadX` 함수를 함께 export하세요.
- 미리 받기는 이동 의도(hover, focus)나 mount 직후에 `preloadX()`로 호출하세요. 사이드바 메뉴의 미리 받기는 `sidebarRouteChunkPreload.ts`의 매핑에 추가합니다.
- lazy 컴포넌트는 `Suspense`로 감싸고, chunk 로드 실패는 `ChunkLoadErrorBoundary`로 처리하세요.

## 전역 QueryClient (`createAppQueryClient.ts`)

- 전역 `defaultOptions`에는 모든 query에 공통으로 맞는 값만 둡니다(`refetchOnWindowFocus: false`, `retry: 3`).
- 전역 `staleTime`을 추가하지 마세요. 데이터별 `staleTime`은 query option factory에서 `QUERY_STALE_TIME_MS`로 정합니다(`docs/ux-02-query-cache-policy.md`).

## 진입점 (`src/main.tsx`)

- 개발 모드 MSW worker와 측정 모드 초기화는 render 전에 끝나야 합니다. 초기화 순서를 바꾸지 마세요.
- 개발·측정 전용 모듈은 dynamic import로만 가져와 프로덕션 번들에 들어가지 않게 하세요.
