# PERF-01 route bundle·font 측정 기록

## 목적

데이터 로딩과 별개로 초기 JS와 font 전송 비용을 측정하고, 측정에서 확인한 병목만 최적화한 결과를 남긴다. 이 문서의 수치는 local production build와 측정 전용 MSW 환경의 결과이며, 실제 배포 환경의 네트워크 성능을 나타내지 않는다.

## 측정 환경

| 항목             | 값                                                                      |
| ---------------- | ----------------------------------------------------------------------- |
| 측정일           | 2026-10-12 KST                                                          |
| 변경 전 commit   | `2d3196b23d65c975ce449d630f8e7311147170eb`                              |
| OS               | macOS 27.0.1, build 26A434                                              |
| 브라우저         | Claude desktop in-app browser, 엔진 버전 미노출                         |
| viewport         | 1440×900                                                                |
| Network·CPU 조절 | 없음                                                                    |
| bundle 크기      | `npm run build` 출력의 minified·gzip 크기                               |
| font·chunk 요청  | `npm run preview:measurement`, MSW 지연 `VITE_MEASUREMENT_DELAY_MS=800` |
| 반복             | route·상태별 1회                                                        |

## 정의와 집계 경계

- 초기 JS: 해당 route에 full reload로 진입했을 때 실행에 필요한 JS chunk의 gzip 크기 합이다. 분리 chunk는 그 route가 렌더 중에 요청하는 chunk만 포함한다.
- 패키지별 비중: Rollup `renderedLength`(minify 전, tree-shaking 후 크기)를 `node_modules/<package>` 단위로 합산했다. 일회성 분석 script로 수집했으며 저장소에는 포함하지 않는다.
- 분리 시뮬레이션: entry에서 module graph를 따라가되 지정 module로 들어가는 import만 끊었을 때, 더 이상 도달하지 않는 module의 `renderedLength` 합이다.
- font 전송량: full reload 후 `document.fonts.ready`까지 요청된 font resource의 `encodedBodySize` 합이다. Service Worker 환경에서는 `transferSize`가 0이므로 사용하지 않는다.
- CLS: full reload 후 `layout-shift` entry(`hadRecentInput=false`)의 value 합이다.
- 차트 표시 지연: `/main` full reload 후 `MutationObserver`가 hero 차트 제목을 처음 관찰한 시각에서 dashboard summary API의 `responseEnd`를 뺀 값이다.
- 상세 API 시작: `/workflow/:workflowId` full reload 후 상세 API resource의 `startTime`이다.

## Bundle

### 변경 전 entry 구성

변경 전에는 모든 page를 정적으로 import해 JS가 `index.js` 하나였다(1,502.90 kB, gzip 478.66 kB).

| 패키지         | renderedLength (bytes) |  비중 |
| -------------- | ---------------------: | ----: |
| recharts       |                577,943 | 15.8% |
| src            |                529,605 | 14.5% |
| react-dom      |                514,173 | 14.1% |
| motion-dom     |                259,526 |  7.1% |
| react-router   |                212,558 |  5.8% |
| @xyflow/react  |                149,171 |  4.1% |
| zod            |                115,625 |  3.2% |
| @xyflow/system |                104,026 |  2.9% |
| tailwind-merge |                 99,481 |  2.7% |
| axios          |                 94,652 |  2.6% |
| framer-motion  |                 93,190 |  2.6% |
| sockjs-client  |                 84,840 |  2.3% |
| 합계           |              3,647,521 |  100% |

### 분리 후보 시뮬레이션

| 끊은 module                             | entry에서 빠지는 renderedLength |  비중 | 주 내용                                   |
| --------------------------------------- | ------------------------------: | ----: | ----------------------------------------- |
| `MainPage`                              |                         934,662 | 25.6% | recharts, @reduxjs/toolkit, d3-scale 계열 |
| `DashboardHeroSection`                  |                         889,342 | 24.4% | recharts 계열                             |
| `WorkFlowPage`                          |                         591,661 | 16.2% | @xyflow, d3-zoom 계열, SockJS, STOMP      |
| `DashboardHeroSection` + `WorkFlowPage` |                       1,508,408 | 41.4% |                                           |
| `AuthPage`                              |                         146,646 |  4.0% |                                           |
| `InterSettingPage`                      |                         134,924 |  3.7% |                                           |
| `WorkflowListPage`                      |                          89,381 |  2.5% |                                           |
| `LandingPage`                           |                          20,385 |  0.6% |                                           |
| `UserPage`                              |                           8,638 |  0.2% |                                           |

`MainPage`는 로그인 후 기본 route이므로 page 전체 대신 Recharts를 쓰는 `DashboardHeroSection`만 분리했다. 대시보드 제목·현황·실행 로그는 즉시 렌더되고, 차트 chunk는 `MainPage` mount 시점에 요약 데이터 요청과 병렬로 받는다. 효과가 5% 미만인 page는 분리하지 않았다.

### 변경 전후 chunk

| 파일                                 | 변경 전 (kB) | 변경 전 gzip (kB) | 변경 후 (kB) | 변경 후 gzip (kB) |
| ------------------------------------ | -----------: | ----------------: | -----------: | ----------------: |
| `index.js` (entry)                   |     1,502.90 |            478.66 |       864.02 |            280.36 |
| `WorkFlowPage.js`                    |            — |                 — |       284.13 |             92.63 |
| `DashboardHeroSection.js`            |            — |                 — |       341.33 |            101.33 |
| `with-selector.js` (분리 chunk 공유) |            — |                 — |        11.26 |              4.75 |
| `index.css`                          |        96.47 |             16.50 |       128.11 |             28.35 |
| `WorkFlowPage.css`                   |            — |                 — |        15.85 |              2.65 |

`index.css` 증가분은 Pretendard dynamic subset의 `@font-face` 92개 선언(원본 55,760 bytes, gzip 13,562 bytes)이다. `@xyflow/react` style은 `WorkFlowPage.css`로 이동했다.

### Route별 초기 JS (gzip)

| Route                                                | 변경 전 (kB) | 변경 후 (kB) |
| ---------------------------------------------------- | -----------: | -----------: |
| `/`, `/auth`, `/workflow`, `/inter-setting`, `/user` |       478.66 |       280.36 |
| `/main`                                              |       478.66 |       386.44 |
| `/workflow/:workflowId`, `/workflow/new`             |       478.66 |       377.74 |

## Font

### 변경 내용

- Pretendard 정적 TTF 4개(weight 400·500·600·700, 합계 10,760.24 kB)를 `pretendard@1.3.9`의 Variable dynamic subset WOFF2(92개 조각, unicode-range)로 교체했다. 화면에 쓰인 글자의 조각만 요청된다.
- RixInooAriDuri(951.64 kB)는 라이선스가 폰트 파일의 수정·복제·배포를 금지하므로 변환이나 subset을 만들지 않았다. 아래 CLS·폭 비교에서 변경 근거를 찾지 못해 `font-display: swap`과 preload 없음 상태를 유지했다.

### Route별 font 전송량

| Route                                            | 변경 전 요청 수 | 변경 전 bytes | 변경 후 요청 수 | 변경 후 bytes | 변경 후 중 Rix bytes |
| ------------------------------------------------ | --------------: | ------------: | --------------: | ------------: | -------------------: |
| `/`                                              |               5 |    11,711,884 |              14 |     1,282,296 |              951,644 |
| `/auth`                                          |               4 |     9,040,416 |               6 |     1,087,760 |              951,644 |
| `/main`                                          |               5 |    11,711,884 |              11 |     1,211,436 |              951,644 |
| `/workflow/11111111-1111-4111-8111-111111111111` |               5 |    11,711,884 |               9 |     1,159,368 |              951,644 |

### 렌더링 비교

- 변경 전 build(scratchpad의 base build)와 변경 후 build를 같은 viewport로 열어 `/`, `/auth`, `/main`, workflow 상세 화면을 스크린샷으로 비교했다. 레이아웃이나 weight에서 차이를 찾지 못했다.
- `/`의 `main` 안 leaf text 28개(weight 400·500·600·700)의 렌더링 폭은 변경 전후 0.1px 이내로 같았다.

| Route   | 변경 전 CLS | 변경 후 CLS |
| ------- | ----------: | ----------: |
| `/`     |      0.0002 |      0.0002 |
| `/auth` |           0 |           0 |

## Chunk 요청과 화면 표시 시점

### 미리 받은 chunk의 첫 렌더

`React.lazy`는 이미 resolve된 Promise를 받아도 첫 렌더에서 한 번 suspend하고, React 19는 표시한 fallback을 최소 300ms 유지한다. 그래서 chunk를 미리 받아 두어도 첫 진입에서 skeleton이 약 300ms 더 보였다. `src/app/createPreloadableLazy.ts`는 받은 module을 기억해 두고, 이후 lazy가 then을 동기로 호출하는 thenable을 받게 해 이 지연을 없앤다. 진행 중인 import는 preload와 lazy 렌더가 공유한다.

| 측정 (3회)                     | 변경 전 (분리 없음) |       변경 후 |
| ------------------------------ | ------------------: | ------------: |
| `/main` 차트 표시 지연, 중앙값 |                13ms |          34ms |
| `/main` 차트 표시 지연, raw    |        25, 13, 12ms |  36, 34, 32ms |
| `/main` 차트 fallback 표시     |                   — | 3회 모두 없음 |
| 상세 API 시작, 중앙값          |                94ms |          82ms |
| 상세 API 시작, raw             |        92, 97, 94ms |  74, 82, 88ms |
| 상세 API 요청 수               |              각 1회 |        각 1회 |

- `/main`: `DashboardHeroSection` chunk는 mount 직후 요청되어 summary API 응답보다 먼저 끝난다. 차트는 summary 응답 후 30ms대에 표시됐고 fallback은 관찰되지 않았다.
- 상세: 상세 query가 lazy page 안에 있어 chunk를 받은 뒤에야 상세 API가 시작되던 순서를 없앴다. `WorkflowEditorRoute`가 route 진입 시 같은 query option으로 상세 데이터를 먼저 요청한다. 현재 build에서 상세 API는 `WorkFlowPage` chunk 요청 2ms 뒤에 시작됐다.
- 상세 query에 `staleTime` 10초를 적용했다(`QUERY_STALE_TIME_MS.workflowDetail`). 그래서 prefetch가 page mount보다 먼저 끝나도 같은 상세 API를 다시 요청하지 않는다.

### 의도 기반 preload

- `/user`에서 사이드바 `워크플로우` 메뉴에 hover하면 `WorkFlowPage` JS·CSS chunk를 받는다. 이어서 최근 작업을 눌러 상세로 이동했을 때 chunk를 다시 요청하지 않았다.
- 최근 작업 hover·focus는 편집 page chunk와 해당 워크플로우 상세 데이터를 함께 미리 받는다.
- preload 없이 상세로 이동하면 chunk를 받는 동안 Layout 안에 상세 page shell이 표시됐고, route 영역이 비는 순간은 관찰되지 않았다.

## 해석과 주의사항

- 모든 수치는 throttling이 없는 local 측정값이다. 화면 표시·상세 API 시점은 3회, 나머지는 1회 측정했다. 실제 배포 환경의 전송 시간은 network 조건에 따라 달라지며, 절감 비율 비교에만 사용한다.
- 분리 시뮬레이션은 minify 전 크기 기준이다. 실제 절감량은 위 변경 전후 chunk 표를 기준으로 판단한다.
- 남은 font 비용의 대부분은 Rix 로고 font이며, 라이선스상 파일을 변경할 수 없다. 로고 표시 방식을 바꾸는 것(예: 이미지 로고)은 디자인 결정이 필요한 별도 작업이다.
- chunk 로드 실패(배포 후 이전 chunk 404 등) 시 화면 처리는 이번 범위에서 제외했다. route에 `errorElement`가 없어 React Router 기본 오류 처리로 넘어가며, 실제 화면은 브라우저에서 재현하지 않았다.
- 화면 표시 측정은 browser pane이 숨겨진 상태라, route 전환 애니메이션이 없는 full reload 진입으로만 수집했다.

## 재측정 명령

bundle 크기는 production build 출력에서 확인한다.

```bash
npm run build
```

font·chunk 요청은 측정 production build와 preview에서 수집한다. 명령 자체가 `dist-measurement` 재빌드를 선행한다.

```bash
npm run preview:measurement
```
