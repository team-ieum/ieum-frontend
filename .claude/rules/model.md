---
paths:
    - 'src/api/**/*.ts'
    - 'src/types/**/*.ts'
    - 'src/schemas/**/*.ts'
    - 'src/stores/**/*.ts'
    - 'src/constants/**/*.{ts,tsx}'
    - 'src/utils/**/*.ts'
    - 'src/services/**/*.ts'
---

# Model 계층과 공용 모듈 (api, types, schemas, stores, constants, utils, services)

이 계층의 파일은 React 컴포넌트, 훅, JSX를 쓰지 않습니다. 예외는 다음뿐입니다.

- `src/constants/integration/brandConfig.tsx`: 서비스 로고 JSX
- `src/constants/layout/`: lucide 아이콘 컴포넌트를 값으로 담는 메뉴 상수(`NAV_ITEMS`). 아이콘 매핑을 컴포넌트로 옮기지 말고 이 상수에 추가하세요.
- Zustand store의 `create`

## API (`src/api`)

- 도메인당 파일 하나(`src/api/<domain>.ts`)이고, 공통 Axios 인스턴스 `api`(`@/utils/AxiosInstance`)를 씁니다. 토큰 첨부, `success: false` 응답의 `ApiError` 변환, 토큰 갱신은 인스턴스 인터셉터가 처리하므로 API 함수에서 반복하지 마세요.
- 기존 세션 없이 호출하는 공개 인증 요청(회원가입, 이메일 인증 코드, 비밀번호 재설정)은 `src/api/auth.ts` 안에 추가하고 그 파일의 `postPublicAuth`(별도 인스턴스 `publicAuthApi`)를 쓰세요. `api`를 쓰면 만료된 토큰이 첨부되고, `TOKEN_EXPIRED` 응답에서 토큰 갱신이 실패해 `/auth`로 강제 이동할 수 있습니다.
- 형태:

    ```ts
    export const updateWorkflow = async (id: string, body: UpdateWorkflowRequest): Promise<UpdateWorkflowResponse> => {
    	const response = await api.put(`/api/v1/workflows/${id}`, body)
    	return response.data
    }
    ```

- 이름은 동사 + 도메인 명사입니다. 조회는 `get*`, 변경은 `create*`, `update*`, `delete*`처럼 동작을 나타내는 동사를 씁니다. `fetch*`, `post*`는 쓰지 않습니다.
- 반환 타입 `Promise<XResponse>`를 명시하세요. 응답 envelope(`ApiResponse<T>`)은 언래핑하지 않고 그대로 반환합니다. 언래핑은 query option factory나 ViewModel 훅에서 합니다(`view-model.md`의 Query 규칙).
- 경로 파라미터는 원시값 인자로, 쿼리 파라미터는 `params` 객체 인자로 받으세요.
- 요청·응답 타입은 API 파일이 아니라 `src/types/<domain>.ts`에 두세요.
- 아직 화면에 연결하지 않았지만 서버 연동용으로 남기는 함수에는 이유를 담은 `/** @public ... */` JSDoc을 붙이세요(knip 검사 대상에서 빠집니다).

## 타입 (`src/types`)

- 도메인당 파일 하나(`src/types/<domain>.ts`)이고 런타임 코드를 두지 않습니다.
- 새 타입은 `type`으로 선언하세요(declaration merging 예외는 `general.md` 참고).
- 이름 규칙:

    | 용도           | 이름                            | 예                       |
    | -------------- | ------------------------------- | ------------------------ |
    | 서버 엔티티    | `XDto`                          | `WorkflowDto`            |
    | 요청 body      | `XRequest`                      | `CreateWorkflowRequest`  |
    | 응답 envelope  | `XResponse = ApiResponse<XDto>` | `UpdateWorkflowResponse` |
    | ViewModel 반환 | `XViewModel`                    | `WorkflowListViewModel`  |

- 서버 열거 값은 문자열 리터럴 union으로 표현하세요. 서버가 값을 늘릴 수 있으면 `| (string & {})`로 열어 두세요.
- 필드 의미, 단위, 서버 제약은 한국어 JSDoc으로 적으세요.

## 스키마 (`src/schemas`)

- Zod 4 스키마를 `src/schemas/<domain>.ts`에 `xSchema` 이름으로 두세요.
- 폼 값 타입은 같은 파일에서 `export type XValues = z.infer<typeof xSchema>`로 만드세요.
- 폼 검증은 `useValidatedXForm` 훅에서 `schema.safeParse()` 결과를 필드 오류로 매핑하는 방식입니다(`src/hooks/auth/` 참고). `react-hook-form`은 쓰지 않습니다.
- 검증 메시지는 한국어로 스키마에 직접 씁니다.

## Store (`src/stores`)

- Zustand store는 전역 클라이언트 상태에만 쓰세요. 서버 상태는 TanStack Query로 관리합니다.
- `src/stores/useXStore.ts`에 `export const useXStore = create<XState>(set => ({ ... }))`로 만들고, 상태와 액션을 한 타입에 담으세요. 액션은 동사형(`setAuth`, `clearAuth`, `open`, `close`)입니다.
- store 액션 안에서 API를 호출하지 마세요.
- 컴포넌트와 훅에서는 selector로 필요한 값만 구독하세요(`useModalStore(state => state.open)`). React 밖(인터셉터, service)에서는 `useXStore.getState()`를 씁니다.
- 새 store를 추가하면 `src/test/setup.ts`의 `afterEach`에 `useXStore.setState(useXStore.getInitialState(), true)` 리셋을 함께 추가하세요.

## 상수 (`src/constants`)

- `src/constants/<domain>/<topic>.ts`에 두고, 이름은 UPPER_SNAKE_CASE입니다. 예외는 `queryKeys`뿐입니다.
- 닫힌 union(값이 모두 정해진 union)의 매핑 테이블은 `Record<Union, Meta>`로 타입을 붙여 누락을 컴파일 단계에서 잡으세요.
- `| (string & {})`로 열린 union은 서버가 모르는 값을 보낼 수 있습니다. 이 경우 알려진 값만 매핑하고(`Record<string, Meta>` 또는 `Partial<Record<KnownValue, Meta>>`), 조회하는 곳에서 `?? fallback`으로 모르는 값을 처리하세요(`constants/integration/integrationProviders.ts`의 `OAUTH_PROVIDER_BRAND`와 `utils/integration/mapOAuthConnectionToIntegrationService.ts`의 조회). 이 저장소는 `noUncheckedIndexedAccess`가 꺼져 있어 없는 키 조회를 타입 검사가 잡지 못합니다.
- 리터럴 타입을 보존해야 하는 값에는 `as const`를 붙이세요.
- `localStorage` 키는 `src/constants/key.ts`에 모으세요.
- 상수와 밀접한 타입가드·조회 함수(`isOAuthConnectServiceId`)는 상수 옆에 둘 수 있습니다.

## 유틸 (`src/utils`)

- 입력만으로 결과가 정해지는 순수 함수를 둡니다. React 훅, API 호출, 전역 상태 변경을 넣지 마세요.
- 예외: `AxiosInstance.ts`(공통 HTTP 인스턴스와 인증 인터셉터, store 갱신·인증 화면 이동 포함)와 `*Storage.ts`(브라우저 저장소 접근, 예: `workflow/workflowDraftStorage.ts`)는 순수 함수 규칙에서 제외합니다. 이 파일들을 수정할 때 부수효과를 다른 계층으로 옮기는 리팩터링을 하지 마세요.
- `src/utils/<domain>/<verbNoun>.ts`에 두고, 파일명은 주 함수 이름과 같게 하세요. 접두어는 `map*`, `format*`, `select*`, `get*`, `resolve*`, `is*` 등 동작을 드러내는 동사를 씁니다.
- 여러 도메인에서 쓰는 범용 함수만 `src/utils/` 루트에 둡니다(`cn.ts`, `formatRelativeTime.ts`).
- 오류 판별은 `ApiError` 클래스와 `isApiError()`(`@/utils/ApiError`)를 쓰세요.

## 서비스 (`src/services`)

- React 생명주기 밖에서 유지해야 하는 연결과 세션(예: SSE 실행 추적 `workflowExecutionManager.ts`)을 둡니다.
- 늦게 도착한 응답은 요청 id로 무시하고, 로그아웃이나 계정 전환 때 연결과 상태를 정리하세요.
