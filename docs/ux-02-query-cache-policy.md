# UX-02 Query option SSOT와 데이터별 캐시 정책

## 목적

Query hook과 후속 prefetch가 같은 query key, query function, select, page parameter를 사용하도록 option factory를 기준으로 통합한다. 데이터별 허용 신선도를 적용해 fresh cache 재방문 시 불필요한 요청을 막고, stale cache 재방문 시 기존 데이터를 유지한 채 백그라운드에서 갱신한다.

## 적용 범위

- Dashboard summary, executions, errors
- Workflow list 첫 페이지와 다음 cursor 페이지
- OAuth connections
- Webhook credentials
- AI providers와 credentials

SideBar의 pointer enter·focus production prefetch는 UX-03에서 적용한다. 이번 작업에서는 동일 option factory를 `prefetchQuery`와 `prefetchInfiniteQuery`에 직접 전달해 호환성과 중복 요청 방지를 검증한다.

## 데이터별 캐시 정책

| 데이터               | `staleTime` | 결정 근거                                                             |
| -------------------- | ----------: | --------------------------------------------------------------------- |
| Dashboard summary    |        30초 | 집계 데이터의 짧은 재방문 요청을 줄인다.                              |
| Dashboard executions |        10초 | 실행 직후 변경 가능성이 높은 운영 데이터다.                           |
| Dashboard errors     |        10초 | 실행 오류 직후 변경 가능성이 높은 운영 데이터다.                      |
| Workflow list        |        30초 | 생성·삭제 후에는 prefix invalidation하고, 그 외 재방문 요청을 줄인다. |
| OAuth connections    |        10초 | 외부 연결 상태의 최신성을 우선한다.                                   |
| Webhook credentials  |        10초 | 생성·삭제 가능한 연결 상태의 최신성을 우선한다.                       |
| AI credentials       |        10초 | 등록·삭제·검증 결과의 최신성을 우선한다.                              |
| AI providers         |         5분 | 변경 빈도가 낮은 메타데이터이며 기존 정책을 유지한다.                 |

전역 QueryClient에는 `staleTime`을 추가하지 않는다. 정책 값은 `src/constants/queryCache.ts`에서 관리하고 각 option factory가 참조한다.

## UX-01 기준값과 기대 변화

`docs/ux-01-navigation-baseline.md`의 warm 재방문은 기본 `staleTime: 0` 때문에 cache 콘텐츠를 즉시 복원하면서도 다음 요청을 발생시켰다.

| Route            | UX-01 warm 재요청 | Fresh cache 기대 | Stale cache 기대                                                    |
| ---------------- | ----------------: | ---------------: | ------------------------------------------------------------------- |
| `/main`          |                 3 |                0 | 기존 dashboard를 유지하고 3개 query를 background refetch            |
| `/workflow`      |                 1 |                0 | 기존 목록을 유지하고 workflow list를 background refetch             |
| `/inter-setting` |                 3 |                0 | 기존 연결·credential을 유지하고 3개 동적 query를 background refetch |

Providers는 UX-01에서도 5분 동안 fresh해 `/inter-setting` warm 재요청에 포함되지 않았다.

## Option factory 계약

- Query key는 `src/constants/queryKeys.ts`를 재사용한다.
- Query function은 기존 `src/api` 함수를 재사용한다.
- `select`는 option factory에 한 번만 정의한다. Prefetch는 원본 query function 결과를 cache하고 hook observer가 `select`를 적용한다.
- Infinite query의 cursor는 query key에 넣지 않고 `pageParam`으로 전달한다.
- 첫 페이지의 `initialPageParam`은 `undefined`다.
- Dashboard와 workflow list의 page size는 factory와 query key가 같은 상수를 사용한다.
- 현재 검색·정렬·필터는 클라이언트 상태이고 page size를 바꾸는 UI가 없으므로 `placeholderData`를 적용하지 않는다.

## Mutation invalidation

| 변경                      | 현재 invalidation                    |
| ------------------------- | ------------------------------------ |
| Workflow 생성·삭제        | `queryKeys.workflows.all()` prefix   |
| Credential 등록·삭제·검증 | `queryKeys.credentials.all()` prefix |
| Webhook 생성·삭제         | Webhook credentials list exact key   |
| OAuth callback 완료       | OAuth connections list exact key     |

Mutation의 완료 기준은 API 변경 요청의 성공이다. Mutation `onSuccess`는 `invalidateQueries()` Promise를 반환하지 않으며, `mutateAsync()`와 `isPending`이 완료된 뒤에도 active query refetch는 background에서 계속될 수 있다. 이때 기존 cache 데이터를 유지하고 refetch 실패를 mutation 실패로 취급하지 않는다.

OAuth callback은 mutation이 아니며 callback 처리와 query parameter 정리 순서를 보장하기 위해 OAuth connections invalidation을 기다린다. Query key 구조와 기존 prefix/exact invalidation 범위는 변경하지 않는다.

현재 workflow 실행은 dashboard query를 무효화하지 않으므로 실행 직후 dashboard에는 최대 10초의 stale 구간이 남을 수 있다. Workflow 활성화 토글도 list를 무효화하지 않으므로 목록에는 최대 30초의 stale 구간이 남을 수 있다. 이 invalidation 개선은 UX-02 범위에서 제외한다.

## 설치 버전 기준 API

구현 계약은 설치된 `@tanstack/react-query` 5.90.14의 타입 선언을 기준으로 한다.

허용 API:

- `queryOptions(options)`
- `infiniteQueryOptions(options)`
- `queryClient.prefetchQuery(options)`
- `queryClient.prefetchInfiniteQuery(options)`
- `queryClient.ensureQueryData(options)`
- `placeholderData: keepPreviousData`

공식 문서의 [Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)는 fresh·stale·background refetch의 개념 근거로 사용한다. [최신 Prefetching 문서](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)는 설치 버전보다 앞선 API를 설명하므로 그대로 복사하지 않는다.

금지사항:

- 모든 query에 동일한 전역 `staleTime` 적용
- `keepPreviousData: true` 사용
- 새 코드에서 deprecated `isInitialLoading` 사용
- Hook과 prefetch용 query function 분리
- Infinite cursor를 query key에 포함

## 검증 기준

- Fresh cache 재방문은 콘텐츠를 유지하고 대상 GET 요청 횟수가 증가하지 않는다.
- Stale cache 재방문은 콘텐츠를 유지하고 대상 GET 요청이 한 번 증가한다.
- 모든 option factory는 실제 prefetch 후 hook mount에서 중복 요청을 만들지 않는다.
- Workflow 다음 페이지는 같은 query key에 `pageParams: [undefined, nextCursor]`로 누적된다.
- Workflow·credential·webhook mutation 성공 후 기존 prefix 또는 exact-key invalidation이 active query를 refetch한다.
