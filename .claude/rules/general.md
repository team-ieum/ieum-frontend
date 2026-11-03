# 공통 코드 스타일

모든 코드에 적용합니다. 경로별 세부 규칙은 같은 폴더의 `view.md`, `view-model.md`, `model.md`, `testing.md`, `app.md`를 따르세요.
기존 코드에 아래 규칙과 다른 예외가 있어도 현재 작업 범위 밖이면 고치지 마세요. 새로 쓰는 코드는 이 규칙을 따릅니다.

## 포맷과 린트

- 포맷의 기준은 `.prettierrc`입니다(탭 들여쓰기, 폭 4, `printWidth` 130, 작은따옴표, JSX 속성도 작은따옴표, 세미콜론 없음, `arrowParens: avoid`, trailing comma `es5`). 정렬 방식은 손으로 바꾸지 말고 Prettier 결과를 따르세요.
- 린트 규칙의 기준은 `eslint.config.js`입니다(typescript-eslint, react-hooks, react-refresh).
- 린트 경고를 피하려고 `eslint-disable` 주석을 추가하지 마세요. 꼭 필요하면 `eslint-disable-next-line <규칙>`으로 범위를 한 줄로 좁히고 이유를 남기세요.
- 디버깅용 `console.log`를 남기지 마세요. 측정 모드 코드(`src/measurement/**`)는 예외입니다.

## TypeScript

- `strict`, `noUnusedLocals`, `noUnusedParameters`가 켜져 있습니다. 쓰지 않는 변수와 매개변수를 남기지 마세요.
- `verbatimModuleSyntax`가 켜져 있으므로 타입만 가져올 때는 `import type { X }`를, 값과 함께 가져올 때는 `import { a, type X }`를 쓰세요.
- `erasableSyntaxOnly`가 켜져 있으므로 `enum`, `namespace`, 생성자 매개변수 프로퍼티를 쓰지 마세요. 열거 값은 문자열 리터럴 union이나 `as const` 객체와 `keyof typeof`로 표현하세요.
- 새 타입은 `type`으로 선언하세요. 단, 외부 모듈의 타입을 보강하는 declaration merging(`declare module 'axios'`의 `InternalAxiosRequestConfig`, `vite-env.d.ts`의 `ImportMetaEnv`)은 병합되도록 `interface`로 씁니다. 기존 `interface`(일부 DTO, Zustand 상태 타입)를 이유 없이 바꾸지 마세요.
- `any`를 쓰지 마세요. 서버 응답, 이벤트 payload, 저장소 값처럼 신뢰할 수 없는 경계 데이터는 `unknown`으로 받고 타입가드(`isX(value): value is X`)로 좁히세요.
- 공개 계약, 도메인 상태, 경계 데이터처럼 의도를 고정해야 하는 곳에는 타입을 명시하세요. 추론되는 지역 값이나 단순 JSX 반환에는 타입을 덧붙이지 않아도 됩니다.

## import

- `src` 안의 모듈은 `@/` 별칭으로 가져오세요(예: `import { cn } from '@/utils/cn'`). 상대 경로는 같은 폴더의 파일(`./X`)에만 쓰세요.
- `index.ts` 재수출(barrel) 파일을 새로 만들지 마세요. 실제 파일 경로로 import하세요.

## 이름

| 대상                   | 규칙                                 | 예                                          |
| ---------------------- | ------------------------------------ | ------------------------------------------- |
| 컴포넌트 파일·컴포넌트 | PascalCase, 도메인 접두어            | `DashboardCard.tsx`, `WorkflowListCard.tsx` |
| 페이지                 | PascalCase + `Page`                  | `MainPage.tsx`                              |
| 훅                     | `use` + camelCase, 파일명 = 훅 이름  | `useWorkflowListViewModel.ts`               |
| 함수 모듈              | camelCase, 파일명 = 주 함수 이름     | `mapWorkflowDtoToListItem.ts`               |
| 상수·클래스·모션 모듈  | camelCase, 파일명 = 주제 이름        | `queryCache.ts`, `routeTransitionMotion.ts` |
| 모듈 수준 상수         | UPPER_SNAKE_CASE                     | `QUERY_STALE_TIME_MS`, `LAYOUT_CLASS`       |
| boolean                | `is`/`has`/`can` 접두어              | `isLoading`, `hasNextPage`, `canSave`       |
| 이벤트 핸들러          | 정의는 `handleX`, props 이름은 `onX` | `handleSubmit`, `onSubmit`                  |

- DOM 속성과 같은 의미의 boolean prop(`disabled`, `required`, `open`)은 DOM 이름을 그대로 써도 됩니다.
- 함수는 화살표 함수로 선언하세요. 다른 모듈에서 쓰는 함수만 `export const fn = (...) =>`로 내보내고, 파일 안에서만 쓰는 헬퍼는 `const fn = (...) =>`로 두어 export하지 마세요.

## 계층 의존 방향

```
pages → components → hooks(ViewModel) → hooks/<domain>/queries·mutations → api → utils/AxiosInstance
                                       ↘ stores, utils, constants, types
```

- View(`components`, `pages`)는 `@/api`, `@tanstack/react-query`, `axios`를 직접 import하지 않습니다. 데이터와 동작은 ViewModel 훅으로 받습니다.
- `api`, `types`, `schemas`, `utils`, `constants`는 React 컴포넌트와 훅을 import하지 않습니다. 예외는 `model.md` 첫 문단에 정리된 constants의 아이콘·로고 매핑뿐입니다.
- `utils`, `types`, `constants`는 `components`, `pages`, `hooks`를 import하지 않습니다.

## React

- React Compiler가 켜져 있어 렌더 최적화가 자동으로 적용됩니다. 성능만을 이유로 `memo`, `useMemo`, `useCallback`을 새로 추가하지 마세요. effect 의존성이나 외부 라이브러리 콜백처럼 참조 안정성이 동작에 필요한 경우에만 쓰고, 기존 코드의 것은 이유 없이 제거하지 마세요.
- `React.FC`, `forwardRef`, `import React`는 쓰지 않습니다. 타입은 `import type { ReactNode } from 'react'`처럼 가져오세요.
- props나 다른 상태에서 계산할 수 있는 값을 `useState`로 따로 들고 있지 마세요.
