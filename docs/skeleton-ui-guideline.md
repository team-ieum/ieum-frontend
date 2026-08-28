# Skeleton UI 개발 가이드

## 목적

비동기 데이터를 표시하는 새 화면이나 섹션은 최초 요청 중에도 최종 콘텐츠와 같은 구조를 유지해야 한다. 이 문서는 loading을 empty나 실제 값으로 오인하지 않게 하고, 프로젝트 전체에서 같은 shimmer와 접근성 계약을 사용하기 위한 팀 기준이다.

## 적용 기준

다음 조건을 모두 만족하면 skeleton UI를 제공한다.

- 원격 데이터를 기다리는 동안 사용자가 인지할 수 있는 대기 시간이 생긴다.
- 데이터가 도착한 뒤 표시할 카드, 목록, 표, 툴바 또는 canvas 구조를 미리 알 수 있다.
- 캐시가 없는 최초 loading 상태다.

캐시 데이터가 있는 background refetch에는 skeleton을 다시 표시하지 않는다. 기존 콘텐츠와 사용자의 입력을 유지하고 `업데이트 중…` 또는 비차단 오류를 표시한다. 로컬 계산처럼 즉시 끝나는 작업이나 최종 구조를 예측할 수 없는 작업에도 임의의 skeleton을 추가하지 않는다.

## 공통 컴포넌트

모든 skeleton block은 `src/components/common/SkeletonPulse.tsx`의 `SkeletonPulse`를 사용한다. 새 gradient, `animate-pulse`, 별도 shimmer keyframe을 화면별로 만들지 않는다.

```tsx
import SkeletonPulse from '@/components/common/SkeletonPulse'

const ExampleCardSkeleton = () => (
	<div role='status' aria-label='프로필 불러오는 중' aria-busy='true'>
		<div aria-hidden='true' className='flex min-h-32 gap-3 rounded-xl border border-neutral-200 p-4'>
			<SkeletonPulse className='size-10 rounded-full bg-neutral-200' />
			<div className='flex flex-1 flex-col gap-2'>
				<SkeletonPulse className='h-5 w-40 rounded bg-neutral-200' />
				<SkeletonPulse className='h-4 w-2/3 rounded bg-neutral-200' />
			</div>
		</div>
	</div>
)
```

### Props

| prop        | 기본값      | 사용 기준                                                                |
| ----------- | ----------- | ------------------------------------------------------------------------ |
| `className` | 필수        | 실제 콘텐츠와 같은 크기, 배경색, radius를 지정한다.                      |
| `as`        | `'div'`     | 기존 DOM이 inline/flex item인 count placeholder에만 `'span'`을 사용한다. |
| `tone`      | `'neutral'` | `bg-main-blue`처럼 색상이 있는 브랜드 block에만 `'brand'`를 사용한다.    |

`SkeletonPulse`는 `aria-hidden`, shimmer overflow, Motion 애니메이션과 reduced-motion 처리를 내부에서 관리한다. 호출부는 이를 다시 구현하지 않는다.

## 화면 상태 계약

| 상태                        | 화면 처리                                             |
| --------------------------- | ----------------------------------------------------- |
| 최초 loading                | 최종 레이아웃과 같은 크기의 domain skeleton           |
| cached data + refetch       | 기존 콘텐츠와 입력 유지, 작은 갱신 상태 표시          |
| 최초 loading error          | 같은 높이의 error shell과 해당 resource의 retry       |
| cached data + refetch error | 기존 콘텐츠 유지, 비차단 경고와 해당 resource의 retry |
| 성공한 빈 결과              | skeleton이 아닌 명시적인 empty state와 다음 액션      |

한 query의 실패가 성공한 다른 영역을 가리지 않도록 resource별 상태를 분리한다. loading 중에는 `0`, 빈 배열, 기본 제목처럼 실제 데이터로 보이는 값을 placeholder로 사용하지 않는다.

## 레이아웃과 접근성

- domain skeleton은 실제 카드 수, 표 행 수, grid column, `min-height`와 viewport shell을 보존한다.
- 공통화하는 것은 shimmer block뿐이다. 페이지마다 다른 skeleton 조합을 범용 컴포넌트 하나로 합치지 않는다.
- 비동기 영역은 `aria-busy`를 사용하고, 상태 전달이 필요하면 `role="status"`와 구체적인 `aria-label`을 제공한다.
- `SkeletonPulse` 자체는 장식 요소이므로 별도 텍스트나 focus 가능한 요소를 넣지 않는다.
- 색상이 있는 block은 `tone='brand'`, 회색 계열 block은 기본 `neutral`을 사용한다.

## 테스트와 리뷰 체크리스트

- delayed cold 진입에서 skeleton이 콘텐츠보다 먼저 보이는가?
- loading 중 empty 문구, 가짜 count, 기본 제목이 노출되지 않는가?
- skeleton과 실제 콘텐츠의 grid, table, 높이가 일치하는가?
- cached refetch와 refetch 실패에서 기존 콘텐츠가 유지되는가?
- 부분 실패와 retry가 해당 resource에만 영향을 주는가?
- `aria-busy`, `role="status"`, reduced-motion 계약이 유지되는가?
- 새 코드에 `animate-pulse`나 별도 shimmer 구현이 추가되지 않았는가?

공통 Motion 동작 자체는 `src/test/components/common/SkeletonPulse.test.tsx`에서 검증한다. 각 화면 테스트는 skeleton의 노출 시점, block 개수·형태, 콘텐츠 전환과 오류 격리를 검증한다.
