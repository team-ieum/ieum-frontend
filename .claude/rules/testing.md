---
paths:
    - 'src/test/**/*.{ts,tsx}'
    - 'src/mocks/**/*.ts'
    - 'src/**/*.test.{ts,tsx}'
---

# 테스트 (Vitest, Testing Library, MSW)

## 실행

- 1회 실행은 `npx vitest run --dir src [경로]`를 쓰세요. `--dir src`를 빼면 `.claude/worktrees` 같은 다른 작업 사본의 테스트까지 수집되어 React 중복 로드로 무관한 테스트가 실패합니다.
- CI Test 단계에는 `VITE_API_URL`이 없습니다. 환경 변수에 의존하는 코드를 테스트할 때는 `vi.stubEnv`로 값을 넣고, 로컬에서도 `VITE_API_URL= npx vitest run --dir src <경로>`로 확인하세요.

## 위치와 이름

- 테스트는 `src/test/` 아래에 소스 경로를 그대로 따라 둡니다. 예: `src/utils/workflow/mapWorkflowCanvas.ts` → `src/test/utils/workflow/mapWorkflowCanvas.test.ts`
- 파일명은 `<소스파일명>.test.ts`이고, JSX를 렌더하면 `.test.tsx`입니다.
- 여러 화면을 거치는 route·통합 시나리오는 `src/test/routes/<시나리오>.test.tsx`에 둡니다.
- `describe`, `it`, `expect`, `vi`는 `import { describe, expect, it, vi } from 'vitest'`로 명시적으로 가져오세요. `test()`가 아니라 `it()`를 씁니다.
- `describe` 이름은 대상 식별자(`'useToggleWorkflowMutation'`)나 한국어 주제(`'인증 화면'`)입니다.
- `it` 이름은 조건과 기대 동작을 담은 한국어 평서문("~한다", "~않는다")입니다. 예: `'토글 요청 중 페이지를 언마운트하면 늦은 실패가 오류 모달을 열지 않는다'`
- 같은 동작을 입력만 바꿔 검증하면 `it.each`를 쓰세요.

## 렌더 헬퍼

- route가 필요한 화면·통합 테스트는 `renderAppRoute(initialEntry, { auth?, queryClient? })`(`src/test/renderAppRoute.tsx`)를 쓰세요. 실제 route, `QueryClientProvider`, 전역 `Modal`이 함께 렌더되고 정리는 setup이 자동으로 합니다. `auth: null`이면 로그아웃 상태입니다.
- 훅·컴포넌트 단위 테스트의 QueryClient는 `createTestQueryClient()`(`src/test/createTestQueryClient.ts`)로 만드세요.
- jsdom에서 끝나지 않는 exit 애니메이션 때문에 `framer-motion`의 `AnimatePresence`나 `@/components/routing/RouteTransition`을 mock할 때는 `vi.importActual`로 나머지 export를 유지하세요.
- reduced motion과 뷰포트 너비는 `src/test/domEnvironment.ts`의 `setReducedMotion`, `setViewportWidth`로 바꾸세요. 화면 진입은 `intersectObservedElements`로 발생시킵니다.

## MSW

- `src/mocks/server.ts`가 기본 성공 응답을 전역으로 등록합니다. `src/test/setup.ts`가 `onUnhandledRequest: 'error'`로 서버를 띄우므로 등록되지 않은 요청은 테스트를 실패시킵니다. 새 API를 추가하면 기본 handler도 함께 추가하세요.
- 테스트별 응답은 `server.use(...)`로 덮어쓰세요. 핸들러는 setup에서 자동으로 리셋됩니다.
- 경로는 baseURL과 관계없이 매칭되도록 `http.get('*/api/v1/...')`처럼 `*` 와일드카드로 시작하세요.
- 응답 데이터는 `src/mocks/fixtures/`의 fixture를, 지연·빈 결과·실패 시나리오는 `src/mocks/apiScenarios.ts`의 factory(`createHeldSuccessHandlers`, `createEmptyHandlers`, `createPartialFailureHandlers`, `createResourceApiErrorHandler` 등)를 먼저 찾아 쓰세요.
- 요청 횟수와 내용은 handler 안의 `vi.fn()` observer로 확인하세요.

## 비동기와 대기

- `delay(80)`, `setTimeout` 같은 고정 지연으로 순서를 맞추지 마세요. 응답을 붙잡았다가 확인 후 `release()`하는 hold handler(`createHeldSuccessHandlers`, `createResourceHoldHandler`)나 직접 만든 Promise gate를 쓰세요.
- 요청 응답 뒤에 나타나는 요소는 `getBy*`로 바로 단언하지 말고 `await findBy*`나 `waitFor`로 기다리세요.
- 독립적인 응답이 여러 개면 각각을 기다리세요. 하나만 기다리고 나머지를 `getBy*`로 확인하면 응답 순서에 따라 간헐적으로 실패합니다.
- `router.state`나 query cache 상태가 아니라 화면(DOM, `aria-busy`)을 기준으로 기다리세요. React Router는 상태를 먼저 바꾸고 render는 `startTransition`으로 나중에 합니다.
- jsdom에서 `*ByRole`의 접근 이름 계산은 비쌉니다. 반복문 안에서 `findByRole`을 계속 기다리지 말고, 바뀌는 텍스트로 먼저 기다린 뒤 role 단언은 한 번만 하세요.
- 시간 의존 로직은 `vi.useFakeTimers()`와 `act(() => vi.advanceTimersByTime(n))`로 제어하고 `afterEach`에서 `vi.useRealTimers()`로 복원하세요. fake timers와 `userEvent`를 함께 쓰지 마세요.

## 쿼리와 상호작용

- 요소는 `getByRole(role, { name })`을 먼저 쓰세요. 그다음은 `getByLabelText`, `getByText` 순입니다. `getByTestId`는 다른 방법이 없을 때만 씁니다.
- 영역 안의 요소는 `within(container)`로 범위를 좁히세요. 부재 확인은 `queryBy*`로 하세요.
- 컴포넌트 상호작용은 `const user = userEvent.setup()` 후 `await user.click(...)`을 쓰세요. `fireEvent`는 `pointerEnter` 같은 저수준 이벤트나 route 테스트의 단순 이동에만 씁니다.
- focus 이동은 `toHaveFocus()`로 검증하세요.

## mock과 전역 상태 복원

- Vitest 설정에 `restoreMocks`가 없습니다. `vi.spyOn`을 쓰면 `afterEach(() => vi.restoreAllMocks())`, `vi.stubEnv`는 `vi.unstubAllEnvs()`, `vi.stubGlobal`은 `vi.unstubAllGlobals()`로 직접 복원하세요.
- 여러 테스트가 공유하는 mock 함수는 `const mocks = vi.hoisted(() => ({ fn: vi.fn() }))`로 만들고 `vi.mock` factory에서 참조하세요. 모듈 일부만 바꿀 때는 `vi.importActual`로 나머지를 유지하세요.
- error boundary 테스트처럼 예상된 `console.error`는 `vi.spyOn(console, 'error').mockImplementation(() => {})`로 숨기고 복원하세요.
- `cleanup`, MSW handler, `localStorage`, Zustand store 리셋은 `src/test/setup.ts`의 `afterEach`가 담당합니다. 새 전역 store나 모듈 수준 상태를 추가하면 이 목록에 리셋을 추가하세요.

## 검증 품질

- 구현 세부(내부 state, 호출 순서)가 아니라 사용자가 관찰하는 동작과 경계 조건을 검증하세요.
- 새 단언이 실제로 실패할 수 있는지 의심하세요. 의심되면 앱 코드를 잠시 틀리게 바꿔 테스트가 실패하는지 확인한 뒤 되돌리세요.
- 간헐 실패를 고칠 때는 대기 시점을 일부러 늦춰 실패를 재현한 뒤 수정하고, 같은 조건으로 반복 실행해 확인하세요.
