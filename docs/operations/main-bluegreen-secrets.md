# Frontend MAIN Blue/Green 배포 설정

MAIN 프론트는 `https://kiacms.co.kr`을 사용한다. DEV와 컨테이너·네트워크·환경설정·배포 상태를
분리한다. DEV 설정은 [DEV 배포 설정](bluegreen-secrets.md)을 따른다.

## Secrets 등록

이 저장소의 Actions Secrets에 공통 값은 `MAIN_COM_`, 색상별 값은 `MAIN_BLUE_`·`MAIN_GREEN_`으로
등록한다. 아래 필수 항목에는 기본값이 없으며, DEV·AWS·접두사 없는 Secrets로 보충하지 않는다.

### 공통 설정

| Secret                                | 필수 여부 | 값·용도                                           |
| ------------------------------------- | --------- | ------------------------------------------------- |
| `MAIN_COM_NODE_VERSION`               | 필수      | 숫자 형식의 Node 버전. 예: `24`                   |
| `MAIN_COM_IMAGE_NAME`                 | 필수      | MAIN 전용 이미지 이름. 예: `ieum-frontend-main`   |
| `MAIN_COM_VITE_API_URL`               | 필수      | 정확히 `https://kiacms.co.kr` 사용. 끝의 `/` 제외 |
| `MAIN_COM_DATA_DOCKER_NETWORK`        | 필수      | `ieum_main_net_data`                              |
| `MAIN_COM_DATA_DOCKER_NETWORK_SUBNET` | 필수      | MAIN 데이터망의 확정된 사설 CIDR                  |
| `MAIN_COM_POSTGRES_CONTAINER_NAME`    | 필수      | `ieum-main-postgres`                              |
| `MAIN_COM_REDIS_CONTAINER_NAME`       | 필수      | `ieum-main-redis`                                 |
| `MAIN_COM_MONGO_CONTAINER_NAME`       | 필수      | `ieum-main-mongo`                                 |
| `MAIN_COM_VITE_MEASUREMENT_MODE`      | 선택      | `true`일 때 모의 API 측정 모드. 미등록 시 비활성  |
| `MAIN_COM_VITE_MEASUREMENT_DELAY_MS`  | 선택      | 측정 모드의 지연 시간(ms). 미등록 시 800          |

일반 MAIN 서비스에서는 모의 API 측정 모드를 켜지 않는다.

### 색상별 설정

아래 8개를 Blue·Green에 각각 등록한다. `{COLOR}`는 `BLUE` 또는 `GREEN`,
`{color}`는 `blue` 또는 `green`으로 바꾼다.

| Secret                               | 값·조건                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `MAIN_{COLOR}_DOCKER_NETWORK`        | `ieum_main_net_{color}`                                                   |
| `MAIN_{COLOR}_DOCKER_NETWORK_SUBNET` | 해당 MAIN 앱 망의 확정된 사설 CIDR                                        |
| `MAIN_{COLOR}_CONTAINER_NAME`        | `ieum-main-{color}-frontend`                                              |
| `MAIN_{COLOR}_FRONTEND_IP`           | 해당 색상 프론트 IP                                                       |
| `MAIN_{COLOR}_BACKEND_IP`            | 해당 색상 백엔드 IP                                                       |
| `MAIN_{COLOR}_AGENT_IP`              | 해당 색상 에이전트 IP                                                     |
| `MAIN_{COLOR}_FRONTEND_ENV_DIR`      | `/home/kwung/deploy/bluegreen-main/runtime/{color}` 또는 허용된 하위 경로 |
| `MAIN_{COLOR}_FRONTEND_ENV_FILE`     | 위 디렉터리의 `frontend.env` 또는 `.env`                                  |

네트워크·IP는 인프라에서 준비한 값과 일치해야 하며 DEV 및 다른 MAIN 대역과 겹치면 안 된다.
MAIN Blue·Green은 MAIN 공용 데이터 서비스를 사용하고, DEV 데이터 서비스와는 분리한다.

## 변수 추가·변경 규칙

- MAIN은 전체 Secrets JSON을 받지 않고 필요한 이름만 워크플로우에 명시한다.
- 새 `MAIN_COM_VITE_*`를 추가하려면 Secret 등록, `frontend_env.py`의 `MAIN_BUILD_KEYS`,
  `frontend-main-server.yml`의 빌드·설정 복원 단계 `env`를 함께 수정한다.
  앱에서도 해당 변수를 읽어야 한다. 등록만으로 자동 수집하지 않는다.
- 이름은 접두사를 제거한 `VITE_*`로 기록한다. 필수값이 없거나 공백뿐이면 중단한다.
- 선택 항목의 미등록·빈 값은 생략해 앱 기본값을 사용한다. 공백·따옴표는 그대로 유지하며 줄바꿈은 받지 않는다.
- `NODE_VERSION`, `IMAGE_NAME`, 연결 설정은 앱 `.env`에서 제외한다.
  빌드용 `NODE_ENV=production`, `HUSKY=0`은 코드가 관리한다.

**`VITE_*`는 브라우저에 공개된다. 비밀번호·토큰·비공개 API 키를 넣지 않는다.**

## 실행 작업과 허용 설정

워크플로우는 `frontend-main-server.yml`이다. 기본 수동 작업은 `build`이며,
빌드는 GitHub `ubuntu-latest`, 서버 작업은 MAIN 전용 러너에서 수행한다.

| 작업                   | 서버 작업 허용 조건                    | 동작                                                 |
| ---------------------- | -------------------------------------- | ---------------------------------------------------- |
| `build`                | 없음                                   | 테스트·타입 검사·이미지 빌드·HTTP 검사·업로드만 수행 |
| `configure-frontend`   | `main` + `MAIN_BOOTSTRAP_ENABLED=true` | 연결 설정만 등록                                     |
| `stage-bootstrap`      | `main` + `MAIN_BOOTSTRAP_ENABLED=true` | 최초 이미지·환경설정 준비. 앱 기동·전환 없음         |
| `deploy` / `main` push | `main` + `MAIN_DEPLOY_ENABLED=true`    | 검증된 이미지로 Blue/Green 배포                      |

현재 `infra/IEUM-FE-95` 작업 브랜치는 수동 `build`만 허용한다. 그 외 서버 작업은 `main`이 필요하다.
서버 러너는 group `ieum_main_server`, labels `self-hosted, linux, x64, ieum-frontend, main, deploy`를 사용한다.

다음은 Secrets가 아닌 Repository Variables다.

| Variable                           | 설정                                                              |
| ---------------------------------- | ----------------------------------------------------------------- |
| `MAIN_BOOTSTRAP_ENABLED`           | 최초 연결 설정·자료 준비 시만 `true`, 평소에는 `false`            |
| `MAIN_DEPLOY_ENABLED`              | 최초 기동·기능 검증 전에는 `false`, 운영 배포 허용 시 `true`      |
| `MAIN_BLUEGREEN_CONTROLLER_SHA256` | 설치한 `/home/kwung/deploy/bluegreen-main/bluegreen.py`의 SHA-256 |
| `MAIN_BLUEGREEN_HELPER_SHA256`     | 설치한 `/usr/local/sbin/ieum-main-bluegreen-nginx`의 SHA-256      |

## 이미지·환경설정과 최초 적용

- 빌드마다 새 `.env`와 연결 설정을 만들고, 서버 단계에서 복원한 설정이 빌드 때와 같은지 검사한다.
- 같은 실행의 이미지 결과물만 받아 파일 해시·태그·플랫폼·실제 이미지 ID를 검증한다. 불일치하면 배포를 중단한다.
- 이미지 아카이브와 검증 정보만 1일간 업로드하며, 비공개 `.env`와 연결 설정 원문은 포함하지 않는다.
- 서버 러너에서 npm 설치나 앱 빌드를 다시 하지 않는다. 임시 설정은 실행 종료 시 정리한다.
- 제어 프로그램은 색상별 이미지·설정 스냅샷을 보존한다. 이전 배포로 복구할 때 당시 설정을 사용한다.
  Secrets 변경만으로 실행 중인 앱은 바뀌지 않으며 `VITE_*` 변경에는 새 빌드·배포가 필요하다.

최초 적용은 `configure-frontend` → 세 앱의 `stage-bootstrap` → 인프라의 최초 기동·검사·전환 순서다.
연결 설정 등록이나 빌드 성공만으로 서비스가 활성화되지는 않는다. 설치·최초 전환·복구는
[인프라 MAIN 운영 절차](https://github.com/team-ieum/ieum-infra/blob/infra/IEUM-SRV-31/docs/main-bluegreen-rollout.md)를 따른다.

## 로컬 확인

```bash
python3 -m unittest discover -s scripts/bluegreen -p 'test_*.py'
npx vitest run --dir src
npm run lint
npm run build
```

실제 MAIN 배포 후에는 도메인·로그인·API 연결·브라우저 동작과 DEV 영향 여부를 별도로 확인한다.
