---
paths:
    - 'src/hooks/**/*.ts'
---

# ViewModel 계층 (hooks)

서버 상태 조회, 변경, 화면 상태, 데이터 변환을 캡슐화해 View에 필요한 값과 핸들러만 넘기는 계층입니다.
query 캐시 정책은 `docs/ux-02-query-cache-policy.md`를 먼저 읽으세요.

## 폴더와 파일

```
src/hooks/<domain>/
├── queries/       # xQueryOptions.ts(option factory), useXQuery.ts, useXPrefetch.ts
├── mutations/     # use<Verb><Noun>Mutation.ts
└── useX.ts        # ViewModel, 화면 로직 훅
```

- 파일 하나에 훅 하나, 파일명은 훅 이름과 같습니다. 확장자는 `.ts`이고 JSX를 쓰지 않습니다.
- `export const useX = (...) => { ... }`로 선언하고 default export는 쓰지 않습니다.
- ViewModel과 화면 로직 훅은 인자가 2개 이상이면 `UseXOptions` 객체 하나로 받으세요. `queries/`의 option factory와 조회 훅은 query key 인자를 위치 인자로 그대로 받습니다(`nodeTestSampleQueryOptions(workflowId, nodeId)`).

## ViewModel 훅

- 페이지나 큰 화면 영역의 진입 훅 이름은 `use<Screen>ViewModel`입니다. View는 `const viewModel = useXViewModel()`로 호출합니다.
- 반환 타입을 명시하세요. 여러 파일이 쓰는 타입은 `src/types/<domain>.ts`에 `XViewModel`로, 그 훅에서만 쓰는 타입은 같은 파일에 `UseXResult`로 둡니다.
- 평평한 객체를 반환하세요. 화면에 필요한 값, `isX`/`canX`/`hasX` 플래그, `handleX` 핸들러만 담습니다. query 결과 객체, 서버 DTO 원본, 상태 setter를 그대로 노출하지 마세요.
- 비동기 상태는 `AsyncResourceState`(`@/types/asyncResource`: `isLoading`, `isRefetching`, `isLoadingError`, `isRefetchError`, `retry`)로 묶어 넘기세요. 최초 loading, cached refetch, empty, 부분 오류, 전체 오류를 구분할 수 있어야 합니다.
- 큰 화면은 책임별 하위 훅으로 나누고 ViewModel이 조합합니다. 예: `useWorkflowListResource`(데이터) + `useWorkflowListCommands`(mutation, 이동) + `useWorkflowListUiState`(UI 상태) → `useWorkflowListViewModel`. 하위 훅의 반환 타입은 `Pick<XViewModel, ...>`로 잘라 씁니다.
- DTO → 화면 모델 매핑, 필터, 정렬은 `src/utils/<domain>/`의 순수 함수(`mapX`, `selectX`, `formatX`)로 빼고 훅은 호출만 하세요.
- 오류·확인 모달은 `useModalStore`의 `open`, `openConfirm`으로 엽니다.
- 오류 메시지는 `isApiError(error) ? error.message : '… 다시 시도해주세요.'` 형태로 만들고, 도메인별 오류 코드 매핑이 있으면 그것을 쓰세요(`@/utils/ApiError`).

## Query

- query key는 `src/constants/queryKeys.ts`의 `queryKeys` 팩토리에만 정의하세요. 도메인마다 `all()`에서 시작해 `list()`, `detail(id)`처럼 상위 키를 펼쳐 만들고 `as const`를 붙입니다. 목록 변형이 여러 개일 때만 중간 단계 `lists()`를 둡니다(`workflows` 참고). 문자열 key를 훅에 직접 쓰지 마세요.
- 다른 query의 무효화에 휩쓸리면 안 되는 데이터는 그 도메인 키 밖에 별도 루트를 두세요(`queryKeys.nodeTestSamples` 참고).
- query 설정은 `queries/xQueryOptions.ts`의 factory(`queryOptions()`, `infiniteQueryOptions()`)에 한 번만 정의하세요. 조회 훅과 prefetch가 같은 factory를 씁니다.
- 조회 훅은 factory를 감싸기만 합니다: `export const useXQuery = (...) => useQuery(xQueryOptions(...))`
- `staleTime`은 `src/constants/queryCache.ts`의 `QUERY_STALE_TIME_MS.<data>`를 쓰세요. 새 데이터 종류를 추가하면 상수와 `docs/ux-02-query-cache-policy.md`의 표를 함께 갱신하세요.
- API 응답 envelope(`ApiResponse<T>`)을 꺼내는 변환을 여러 사용처가 공유하면 factory의 `select`에 한 번만 두세요. 사용처마다 `select`를 따로 쓰지 마세요.
- 특정 오류를 값으로 바꿔야 하면(예: 샘플 없음 404 → `null`) `select`가 아니라 factory의 `queryFn`에서 처리하세요(`nodeTestSampleQueryOptions` 참고).
- cursor 페이지네이션은 cursor를 query key에 넣지 말고 `pageParam`으로 다루세요(`initialPageParam: undefined as string | undefined`).
- 전역 `staleTime`, `keepPreviousData: true`, `isInitialLoading`을 쓰지 마세요.
- 조건부 조회는 `enabled`로 막으세요. 값이 없을 때 임의의 기본값으로 요청하지 마세요.

## Mutation

- 이름은 `use<Verb><Noun>Mutation`입니다(`useCreateWorkflowMutation`, `useDeleteCredentialMutation`).
- `mutationFn`에는 `src/api`의 함수를 넘기세요.
- 성공 후 관련 query는 `onSuccess`에서 `void queryClient.invalidateQueries({ queryKey })`로 무효화하세요. 무효화 Promise를 반환하지 않습니다.
- 무효화 범위는 변경에 영향받는 query만 덮는 가장 좁은 key로 정하세요. 생성·삭제처럼 목록과 집계가 모두 바뀌면 `all()` prefix, 목록만 바뀌면 `lists()`나 `list()`를 씁니다. 편집 중인 상세는 무효화하지 말고 서버 응답으로 `setQueryData`해 맞추세요(`useUpdateWorkflowMutation` 참고).
- 새 mutation을 추가하거나 무효화 범위를 바꾸면 `docs/ux-02-query-cache-policy.md`의 Mutation invalidation 표를 함께 갱신하세요.
- `setQueryData`는 서버가 확정해 돌려준 응답으로만 갱신하세요. optimistic update(`onMutate`)는 쓰지 않습니다.
- 같은 리소스에 대한 수정 요청이 겹칠 수 있으면 `mutationKey`와 `scope: { id }`로 직렬화하세요.
- mutation 실행은 ViewModel의 `handleX` 안에서 `mutateAsync`를 `try/catch`로 감싸 처리하세요. View에 `mutate`, `mutateAsync`를 그대로 넘기지 마세요.

## 실시간 연결

- SSE 실행 추적은 `src/services/workflowExecutionManager.ts`와 `src/api/sse.ts`가 담당합니다. 훅에서 `fetch` 스트림을 직접 열지 마세요.
- 구독, 타이머, 연결은 `useEffect` cleanup에서 반드시 해제하세요. 언마운트 뒤에 도착한 응답이 상태를 바꾸거나 모달을 열지 않게 막으세요.
