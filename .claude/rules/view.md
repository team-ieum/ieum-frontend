---
paths:
    - 'src/components/**/*.{ts,tsx}'
    - 'src/pages/**/*.{ts,tsx}'
    - 'src/App.tsx'
---

# View 계층 (components, pages)

새 코드를 쓸 때 참고할 기준 폴더는 `src/components/dashboard/`와 `src/components/integration/`입니다. 아래 폴더는 이 규칙과 다른 옛 방식이 남아 있으니 새 코드의 참고 기준으로 삼지 마세요.

- `src/components/aiCredentials/`: named export, hex 색상
- workflow 편집기(`src/components/workflow/`, `src/pages/WorkFlowPage.tsx`), `common/Header`, `common/SideBar`: hex 색상, `text-sm` 같은 원시 글자 크기, 인라인 style, 컴포넌트에서 query 직접 호출

## 컴포넌트 선언

- 화살표 함수로 선언하고 파일 끝에서 `export default X`로 내보내세요. pages는 `src/app/routes.tsx`의 default import와 `src/app/lazyModules.ts`의 `createPreloadableLazy`(`React.lazy`)에 맞춰 반드시 default export입니다.
- named export로 통일된 기존 폴더(`aiCredentials`)에 파일을 추가할 때는 같은 폴더 안의 import 형태를 맞추기 위해 기존 방식을 따르세요.
- 파일 하나에 export하는 컴포넌트는 하나입니다. 그 파일에서만 쓰는 작은 보조 컴포넌트는 export하지 않고 같은 파일에 둘 수 있습니다.
- 한 화면 영역의 비동기 상태 컴포넌트 묶음은 `XxxAsyncState.tsx`에 named export로 모읍니다(`XxxSkeleton`, `XxxError`, `XxxRefreshFeedback`, `XxxResourceStatus`). 예: `src/components/dashboard/DashboardAsyncState.tsx`
- 폴더는 도메인별입니다(`common`, `auth`, `dashboard`, `integration`, `aiCredentials`, `layout`, `routing`, `workflow/list`, `workflow/settings` 등).

## props

- `type XxxProps = { ... }`로 선언하세요. 이름은 컴포넌트 이름 + `Props`입니다. `interface`는 쓰지 않습니다.
- 매개변수 자리에서 구조분해하고, 기본값도 그 자리에 두세요(`({ size = 'md', isOpen = false }: SpinnerProps)`).
- `children`은 `children: ReactNode`로 Props에 직접 선언하세요.
- 의미가 이름만으로 드러나지 않는 prop에는 한국어 JSDoc(`/** ... */`)을 다세요.

## 데이터와 로직

- 컴포넌트와 페이지는 `@/api`, `@tanstack/react-query`, `axios`를 import하지 않습니다. 데이터, 파생 값, 핸들러는 ViewModel 훅(`src/hooks/**`)에서 받으세요.
- 화면에 표시할 라벨, 색상 클래스, 날짜 문자열 같은 변환은 ViewModel 훅이나 `src/utils`의 순수 함수에서 미리 계산하세요. JSX 안에서 도메인 변환 로직을 직접 작성하지 마세요.
- 메뉴 열림, hover, 입력 중 값처럼 그 컴포넌트에만 필요한 UI 상태는 `useState`로 둘 수 있습니다.
- 페이지는 조립만 합니다. ViewModel 훅을 호출해 loading·error·empty·success로 분기하고 도메인 컴포넌트에 props를 넘깁니다. 예: `src/pages/MainPage.tsx`
- 알림·확인 모달은 직접 렌더하지 말고 ViewModel 훅에서 `useModalStore`의 `open(title, message)` 또는 `openConfirm({ ... })`로 여세요. 전역 `Modal`은 `App.tsx`에서 한 번만 렌더합니다.

## 공통 컴포넌트

새로 만들기 전에 아래 컴포넌트를 먼저 쓰세요.

| 컴포넌트                             | 용도                                                                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `common/SkeletonPulse`               | 모든 skeleton block. `animate-pulse`나 별도 shimmer를 만들지 마세요(`docs/skeleton-ui-guideline.md`).                                                            |
| `common/Spinner`                     | 인라인 진행 표시(`size`, `label`)                                                                                                                                |
| `common/DialogFocusTrap`             | 새 dialog의 focus trap, Escape 처리, 닫힐 때 focus 복귀. `createPortal` + `AnimatePresence`와 함께 씁니다(`integration/WebhookCredentialConnectModal.tsx` 참고). |
| `common/ErrorPageView`               | 404·오류 화면(`layout='fullscreen' \| 'content'`)                                                                                                                |
| `common/ChunkLoadErrorBoundary`      | lazy chunk 로드 실패 처리                                                                                                                                        |
| `workflow/settings/SettingsDropdown` | 선택 전용 드롭다운(combobox)                                                                                                                                     |

## 스타일링

- Tailwind 유틸리티 클래스를 쓰세요. 고정 클래스는 `className='...'` 문자열로 쓰고, 조건부 클래스는 `cn()`(`@/utils/cn`)으로 합치세요. 템플릿 리터럴로 클래스를 조합하거나 `clsx`, `tailwind-merge`를 직접 import하지 마세요.
- variant별 클래스는 모듈 수준 상수 맵으로 두세요(`const LAYOUT_CLASS: Record<ErrorPageLayout, string> = { ... }`, `common/ErrorPageView.tsx`). 여러 컴포넌트가 공유하는 클래스 묶음은 별도 `*ClassNames.ts` 파일의 상수로 둡니다(예: `workflow/settings/settingsFieldClassNames.ts`).
- 색상, radius, 브레이크포인트는 `src/styles/tokens.css`의 토큰 유틸리티를 쓰세요(`bg-main-blue`, `text-main-deep-blue`, `border-neutral-200`, `text-danger-500`, `rounded-brand-md`). 새 코드에 `[#hex]` 임의 색상이나 Tailwind 기본 팔레트(`red-500`, `amber-*`)를 쓰지 마세요. 필요한 색이 토큰에 없으면 `tokens.css`에 토큰을 추가하세요.
- 글자 스타일은 `src/styles/typography.css`의 `typo-<스케일>_<굵기>` 유틸리티를 쓰세요(`typo-title2_bold`, `typo-body2_regular`, `typo-caption1_semibold`). `text-sm font-semibold`나 `text-[13px]` 조합을 새로 쓰지 마세요.
- CSS 변수는 Tailwind v4 축약형으로 참조하세요(`h-(--layout-header-height)`). `bg-[var(--x)]` 형태는 쓰지 않습니다.
- 인라인 `style`은 런타임에 계산되는 값(브랜드 색 주입, CSS 변수 주입, 계산된 크기)에만 쓰세요.

## 아이콘과 이미지

- 아이콘은 `lucide-react`에서 이름으로 import하고 `size` prop으로 크기를 지정하세요.
- 장식 아이콘에는 `aria-hidden='true'`를 붙이세요. 아이콘만 있는 버튼에는 `aria-label`을 다세요.
- 아이콘을 데이터나 prop으로 넘길 때는 `LucideIcon` 타입을 쓰세요.
- 이미지는 `import logo from '@/assets/...'`로 가져와 `<img src={logo} alt='...' />`로 쓰세요. 장식 이미지는 `alt=''`입니다. 서비스 로고는 `src/constants/integration/brandConfig.tsx`에서 가져오세요.

## 접근성

- 모든 `<button>`에 `type`을 명시하세요(기본 `type='button'`, 폼 제출만 `type='submit'`).
- 클릭 동작은 `<button>`이나 `<a>`에 두세요. `div`에 `onClick`을 붙이지 마세요(배경 클릭으로 닫기처럼 키보드 대안이 따로 있는 경우는 예외).
- label, 설명, 오류 메시지 연결 id는 `useId()`로 만들고 `aria-labelledby`, `aria-describedby`로 연결하세요.
- 비동기 영역은 skeleton 가이드를 따르세요. loading 영역에 `aria-busy`를 붙이고, skeleton은 `role='status'`와 구체적인 `aria-label`(예: `'워크플로우 상세 불러오는 중'`)을 답니다. 오류 안내는 `role='alert'`입니다.
- 비활성 상태에서도 focus를 유지해야 하면 `disabled` 대신 `aria-disabled`를 쓰고 `aria-disabled:` variant로 스타일을 주세요.
- 상호작용 요소에는 `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue` 계열의 focus 표시를 주세요.
- 패널·팔레트처럼 다른 요소를 덮는 UI는 가려진 요소가 Tab 순서에 남지 않게 하고(`inert` 등), 닫힐 때 연 버튼으로 focus를 되돌리세요.
- Escape로 닫는 요소는 처리 후 `event.stopPropagation()`으로 바깥 요소가 같은 키를 다시 처리하지 않게 하세요.

## 애니메이션

- 애니메이션은 `framer-motion`을 씁니다. `App.tsx`의 `<MotionConfig reducedMotion='user'>`가 전역으로 적용됩니다.
- 위치 이동이나 반복 애니메이션은 `useReducedMotion()`으로 확인해 이동 거리를 0으로 바꾸거나 애니메이션을 렌더하지 마세요.
- transition과 variants가 여러 곳에서 쓰이면 `*Motion.ts` 파일로 빼세요(예: `routing/routeTransitionMotion.ts`).
- CSS 애니메이션(`animate-spin`, `transition-*`)에는 `motion-reduce:animate-none`, `motion-reduce:transition-none`을 함께 붙이세요.

## UI 문구

- 버튼 라벨, 제목, `aria-label` 같은 한 곳에서만 쓰는 문구는 JSX에 직접 쓰세요.
- 여러 곳에서 재사용하거나 코드·상태 값과 매핑되는 문구(상태 라벨, 서버 오류 코드별 메시지)는 `src/constants/<도메인>/`에 `Record<Union, string>` 상수로 두세요.
