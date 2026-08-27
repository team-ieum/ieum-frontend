# UX-01 전환·로딩 기준값

## 목적

주요 route의 cold 최초 진입과 warm 재방문을 동일한 fixture와 측정 경계에서 반복해, 이후 로딩·캐시·전환 리팩터링의 비교 기준과 회귀 판단 근거를 남긴다. 이 문서의 수치는 측정 전용 MSW 환경의 기준값이며 실제 백엔드 성능을 나타내지 않는다.

## 측정 환경

| 항목               | 값                                                                  |
| ------------------ | ------------------------------------------------------------------- |
| 측정일             | 2026-08-27 KST                                                      |
| 측정 commit        | `c1a321885ca365af6cb3d51ae59053047c7b675f`                          |
| OS                 | macOS 26.5.1, build 25F80, arm64                                    |
| 브라우저           | Codex In-app Browser, 엔진 버전 미노출                              |
| viewport           | 1440×900                                                            |
| Network throttling | 없음                                                                |
| CPU throttling     | 없음                                                                |
| MSW 지연           | `VITE_MEASUREMENT_DELAY_MS=800`                                     |
| reduced motion     | 브라우저 override 없음, OS explicit value unset                     |
| 반복               | route·상태별 3회, 중앙값 사용                                       |
| Network 실행       | `build:measurement` + `preview:measurement`, React production build |
| Profiler 실행      | `dev:measurement`, React development build, StrictMode 활성         |
| ReactQueryDevtools | 측정 모드에서 제외                                                  |

## 정의와 집계 경계

- Cold: full reload로 새 QueryClient와 빈 query cache를 만든 뒤 대상 route에 직접 진입한다.
- Warm: cold 응답 완료 후 `/user`로 이동하고, SideBar를 통해 동일 route를 재방문한 뒤 URL을 검증한다. 같은 QueryClient와 query cache를 유지한다.
- 중앙값: 같은 route·상태에서 얻은 3회 값의 중앙값이다.
- Network wall: 관찰된 API resource 중 `max(responseEnd) - min(startTime)`이다.
- encoded body: API resource의 `encodedBodySize` 합이다.
- `transferSize`는 Service Worker 응답 특성상 모두 0이므로 기준값에 사용하지 않는다.
- Network 이벤트의 `completedAtPathname`은 ResourceTiming observer가 entry를 전달한 시점의 route다. 모든 측정은 URL이 안정된 상태에서 수집했다.
- Cold Profiler 경계: cold mount부터 마지막 API 완료 후 150ms까지다.
- Warm Profiler 경계: `/user` commit 이후부터 마지막 API 완료 후 150ms까지다.
- Profiler commit window: 위 집계 경계 안에서 첫 commit의 `startTime`부터 마지막 commit의 `commitTime`까지다.
- `total actualDuration`은 경계 안 commit의 `actualDuration` 합이며, `max actualDuration`과 `max baseDuration`은 각각 경계 안 최댓값이다.

## Network 중앙값

| Route                                            | 상태 | API 요청 수 | Network wall (ms) | encoded body 합 (bytes) |
| ------------------------------------------------ | ---- | ----------: | ----------------: | ----------------------: |
| `/main`                                          | cold |           4 |             818.5 |                   1,969 |
| `/main`                                          | warm |           3 |             808.3 |                   1,108 |
| `/workflow`                                      | cold |           1 |             806.4 |                     861 |
| `/workflow`                                      | warm |           1 |             810.4 |                     861 |
| `/inter-setting`                                 | cold |           5 |             809.1 |                   1,969 |
| `/inter-setting`                                 | warm |           3 |             810.0 |                     800 |
| `/workflow/11111111-1111-4111-8111-111111111111` | cold |           4 |             811.0 |                   2,280 |
| `/workflow/11111111-1111-4111-8111-111111111111` | warm |           2 |             811.2 |                   1,111 |

## Profiler 중앙값

| Route                                            | 상태 | Commit 수 | total actualDuration (ms) | max actualDuration (ms) | max baseDuration (ms) | Commit window (ms) |
| ------------------------------------------------ | ---- | --------: | ------------------------: | ----------------------: | --------------------: | -----------------: |
| `/main`                                          | cold |        23 |                      50.5 |                    12.3 |                  22.7 |              977.6 |
| `/main`                                          | warm |       141 |                     104.2 |                     6.4 |                  14.7 |              989.4 |
| `/workflow`                                      | cold |         3 |                      20.7 |                    10.9 |                  12.8 |              834.2 |
| `/workflow`                                      | warm |         3 |                      12.2 |                    11.6 |                  10.9 |               20.4 |
| `/inter-setting`                                 | cold |         4 |                      16.6 |                     8.1 |                   9.3 |              839.6 |
| `/inter-setting`                                 | warm |         2 |                       7.6 |                     7.6 |                   7.7 |               10.0 |
| `/workflow/11111111-1111-4111-8111-111111111111` | cold |        10 |                      29.4 |                    14.4 |                  17.0 |              858.4 |
| `/workflow/11111111-1111-4111-8111-111111111111` | warm |         7 |                      14.9 |                    10.5 |                  10.6 |               25.8 |

## Network 3회 raw

| Route                                            | 상태 | Run | API 요청 수 | Network wall (ms) | encoded body 합 (bytes) |
| ------------------------------------------------ | ---- | --: | ----------: | ----------------: | ----------------------: |
| `/main`                                          | cold |   1 |           4 |             821.5 |                   1,969 |
| `/main`                                          | cold |   2 |           4 |             817.9 |                   1,969 |
| `/main`                                          | cold |   3 |           4 |             818.5 |                   1,969 |
| `/main`                                          | warm |   1 |           3 |             806.9 |                   1,108 |
| `/main`                                          | warm |   2 |           3 |             808.3 |                   1,108 |
| `/main`                                          | warm |   3 |           3 |             808.3 |                   1,108 |
| `/workflow`                                      | cold |   1 |           1 |             805.7 |                     861 |
| `/workflow`                                      | cold |   2 |           1 |             807.2 |                     861 |
| `/workflow`                                      | cold |   3 |           1 |             806.4 |                     861 |
| `/workflow`                                      | warm |   1 |           1 |             816.3 |                     861 |
| `/workflow`                                      | warm |   2 |           1 |             805.8 |                     861 |
| `/workflow`                                      | warm |   3 |           1 |             810.4 |                     861 |
| `/inter-setting`                                 | cold |   1 |           5 |             814.3 |                   1,969 |
| `/inter-setting`                                 | cold |   2 |           5 |             809.1 |                   1,969 |
| `/inter-setting`                                 | cold |   3 |           5 |             809.0 |                   1,969 |
| `/inter-setting`                                 | warm |   1 |           3 |             807.5 |                     800 |
| `/inter-setting`                                 | warm |   2 |           3 |             812.2 |                     800 |
| `/inter-setting`                                 | warm |   3 |           3 |             810.0 |                     800 |
| `/workflow/11111111-1111-4111-8111-111111111111` | cold |   1 |           4 |             813.4 |                   2,280 |
| `/workflow/11111111-1111-4111-8111-111111111111` | cold |   2 |           4 |             809.8 |                   2,280 |
| `/workflow/11111111-1111-4111-8111-111111111111` | cold |   3 |           4 |             811.0 |                   2,280 |
| `/workflow/11111111-1111-4111-8111-111111111111` | warm |   1 |           2 |             807.9 |                   1,111 |
| `/workflow/11111111-1111-4111-8111-111111111111` | warm |   2 |           2 |             814.0 |                   1,111 |
| `/workflow/11111111-1111-4111-8111-111111111111` | warm |   3 |           2 |             811.2 |                   1,111 |

## Profiler 3회 raw

| Route                                            | 상태 | Run | Commit 수 | total actualDuration (ms) | max actualDuration (ms) | max baseDuration (ms) | Commit window (ms) |
| ------------------------------------------------ | ---- | --: | --------: | ------------------------: | ----------------------: | --------------------: | -----------------: |
| `/main`                                          | cold |   1 |        23 |                      50.6 |                    12.3 |                  22.7 |              986.6 |
| `/main`                                          | cold |   2 |        25 |                      47.9 |                    10.9 |                  20.7 |              977.6 |
| `/main`                                          | cold |   3 |        23 |                      50.5 |                    13.2 |                  23.0 |              976.6 |
| `/main`                                          | warm |   1 |       141 |                      99.5 |                     6.4 |                  14.7 |              989.4 |
| `/main`                                          | warm |   2 |       141 |                     109.4 |                     5.7 |                  12.8 |              977.3 |
| `/main`                                          | warm |   3 |       142 |                     104.2 |                     7.1 |                  15.5 |              994.7 |
| `/workflow`                                      | cold |   1 |         3 |                      19.8 |                    10.9 |                  11.9 |              832.7 |
| `/workflow`                                      | cold |   2 |         3 |                      21.8 |                    11.1 |                  14.7 |              834.2 |
| `/workflow`                                      | cold |   3 |         3 |                      20.7 |                    10.8 |                  12.8 |              839.8 |
| `/workflow`                                      | warm |   1 |         3 |                      10.3 |                     9.9 |                   9.8 |               18.2 |
| `/workflow`                                      | warm |   2 |         3 |                      13.3 |                    12.9 |                  12.6 |               20.4 |
| `/workflow`                                      | warm |   3 |         3 |                      12.2 |                    11.6 |                  10.9 |               20.5 |
| `/inter-setting`                                 | cold |   1 |         4 |                      16.6 |                     8.1 |                   9.2 |              839.6 |
| `/inter-setting`                                 | cold |   2 |         4 |                      14.8 |                     7.4 |                   9.3 |              834.9 |
| `/inter-setting`                                 | cold |   3 |         4 |                      18.7 |                     8.6 |                  11.2 |              840.1 |
| `/inter-setting`                                 | warm |   1 |         2 |                       7.0 |                     7.0 |                   7.1 |               10.0 |
| `/inter-setting`                                 | warm |   2 |         2 |                       7.6 |                     7.6 |                   7.7 |                9.7 |
| `/inter-setting`                                 | warm |   3 |         2 |                       9.0 |                     9.0 |                   8.9 |               11.6 |
| `/workflow/11111111-1111-4111-8111-111111111111` | cold |   1 |        10 |                      30.4 |                    14.5 |                  18.2 |              863.3 |
| `/workflow/11111111-1111-4111-8111-111111111111` | cold |   2 |        10 |                      29.3 |                    13.1 |                  17.0 |              858.4 |
| `/workflow/11111111-1111-4111-8111-111111111111` | cold |   3 |        10 |                      29.4 |                    14.4 |                  16.8 |              857.8 |
| `/workflow/11111111-1111-4111-8111-111111111111` | warm |   1 |         7 |                      14.4 |                     9.6 |                  10.2 |               24.9 |
| `/workflow/11111111-1111-4111-8111-111111111111` | warm |   2 |         7 |                      14.9 |                    10.5 |                  10.6 |               25.8 |
| `/workflow/11111111-1111-4111-8111-111111111111` | warm |   3 |         7 |                      16.6 |                    10.9 |                  11.4 |               28.0 |

## Route별 요청 경로

| Route                                            | 상태      | 요청 경로                                                                                                                                                                |
| ------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/main`                                          | cold      | `/api/v1/workflows?size=20`<br>`/api/v1/workflows/dashboard/summary`<br>`/api/v1/workflows/dashboard/executions?size=20`<br>`/api/v1/workflows/dashboard/errors?size=20` |
| `/main`                                          | warm      | `/api/v1/workflows/dashboard/summary`<br>`/api/v1/workflows/dashboard/executions?size=20`<br>`/api/v1/workflows/dashboard/errors?size=20`                                |
| `/workflow`                                      | cold/warm | `/api/v1/workflows?size=20`                                                                                                                                              |
| `/inter-setting`                                 | cold      | `/api/v1/workflows?size=20`<br>`/api/v1/providers`<br>`/api/v1/credentials`<br>`/api/v1/oauth/connections`<br>`/api/v1/webhook-credentials`                              |
| `/inter-setting`                                 | warm      | `/api/v1/credentials`<br>`/api/v1/oauth/connections`<br>`/api/v1/webhook-credentials`                                                                                    |
| `/workflow/11111111-1111-4111-8111-111111111111` | cold      | `/api/v1/workflows?size=20`<br>`/api/v1/providers`<br>`/api/v1/credentials`<br>`/api/v1/workflows/11111111-1111-4111-8111-111111111111`                                  |
| `/workflow/11111111-1111-4111-8111-111111111111` | warm      | `/api/v1/credentials`<br>`/api/v1/workflows/11111111-1111-4111-8111-111111111111`                                                                                        |

각 route의 cold와 warm phase 내부에서 같은 요청 경로가 중복 호출된 사례는 없다.

## 해석과 주의사항

- Warm에서도 stale query의 background refetch가 발생하므로 Network wall 중앙값은 모든 route에서 약 800ms로 유지된다. 이는 캐시가 사용되지 않는다는 뜻이 아니라, 화면 복원과 background refetch가 분리되어 있다는 뜻이다.
- `/workflow`, `/inter-setting`, workflow detail은 warm 재방문 시 캐시 콘텐츠로 commit이 약 10~26ms 안에 완료된다. Network 요청은 그 뒤 background에서 계속된다.
- `/main` warm은 commit 수 141회, total actualDuration 104.2ms, commit window 989.4ms로 다른 warm route보다 큰 값이 관찰됐다. root Profiler만으로 특정 컴포넌트가 원인이거나 사용자 체감 병목이라고 단정할 수는 없다.
- 대시보드 Recharts animation은 우선 조사할 가설이다. 원인을 확인하려면 reduced-motion 계산값을 고정하고, 컴포넌트 단위 Profiler와 animation-off 대조 측정을 추가해야 한다.
- Profiler 수치는 React development build와 StrictMode에서 수집했으므로 production Network 수치와 하나의 절대 성능값으로 합산하거나 직접 비교하지 않는다. 이후 비교도 동일한 실행 모드와 경계를 사용한다.
- Network 지연은 고정 800ms MSW fixture의 결과다. 실제 서버 응답시간이나 인터넷 품질을 나타내지 않는다.
- 측정 전용 fake auth와 MSW fixture만 사용했으며 실제 백엔드 요청은 발생하지 않았다.
- body 크기는 `Timing-Allow-Origin`이 설정된 성공 fixture의 `encodedBodySize`를 합산했다. Service Worker 환경의 `transferSize=0`은 전송량 지표로 해석하지 않는다.
- Browser engine 버전과 reduced-motion의 실제 계산값은 노출되지 않았다. 브라우저 override는 적용하지 않았고 OS explicit value는 unset 상태였다.

## 재측정 명령

Network 기준값은 측정 production build와 preview에서 수집한다. 명령 자체가 `dist-measurement` 재빌드를 선행한다.

```bash
npm run preview:measurement
```

Profiler 기준값은 React development build에서 수집한다. 이 모드에서는 Network와 Profiler console event가 함께 출력되고 ReactQueryDevtools는 렌더링되지 않는다.

```bash
npm run dev:measurement
```
