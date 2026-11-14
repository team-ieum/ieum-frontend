# Frontend DEV Blue/Green 배포 설정

DEV 프론트는 `https://green.kiacms.co.kr`에서 서비스한다. 이 문서는 프론트 저장소의
Secrets 등록과 배포 실행 방법을 다룬다. MAIN은 [MAIN 설정](main-bluegreen-secrets.md)을 따른다.

## Secrets 등록

GitHub의 이 저장소 Actions Secrets에 등록한다. 공통 값은 `DEV_COM_`, 색상별 값은
`DEV_BLUE_`·`DEV_GREEN_`을 사용한다. 아래 필수 항목에는 기본값이 없다.

### 공통 설정

| Secret                               | 필수 여부 | 값·용도                                                        |
| ------------------------------------ | --------- | -------------------------------------------------------------- |
| `DEV_COM_NODE_VERSION`               | 필수      | 빌드할 Node 버전                                               |
| `DEV_COM_IMAGE_NAME`                 | 필수      | Docker 이미지 이름                                             |
| `DEV_COM_VITE_API_URL`               | 필수      | 브라우저가 접근할 DEV API 주소                                 |
| `DEV_COM_DATA_DOCKER_NETWORK`        | 필수      | 공용 데이터망 이름. 예: `ieum_net_data`                        |
| `DEV_COM_DATA_DOCKER_NETWORK_SUBNET` | 필수      | 공용 데이터망의 확정된 사설 CIDR                               |
| `DEV_COM_POSTGRES_CONTAINER_NAME`    | 필수      | 공용 PostgreSQL 컨테이너 이름                                  |
| `DEV_COM_REDIS_CONTAINER_NAME`       | 필수      | 공용 Redis 컨테이너 이름                                       |
| `DEV_COM_MONGO_CONTAINER_NAME`       | 필수      | 공용 MongoDB 컨테이너 이름                                     |
| `DEV_COM_VITE_MEASUREMENT_MODE`      | 선택      | `true`일 때 모의 API 측정 모드. 미등록 시 비활성               |
| `DEV_COM_VITE_MEASUREMENT_DELAY_MS`  | 선택      | 측정 모드의 지연 시간(ms). 미등록·빈 값은 800, `0`은 지연 없음 |

측정 모드는 실제 API 대신 모의 응답을 사용하므로 일반 DEV 배포에는 켜지 않는다.

### 색상별 설정

아래 8개를 Blue·Green에 각각 등록한다. `{COLOR}`는 `BLUE` 또는 `GREEN`,
`{color}`는 `blue` 또는 `green`으로 바꾼다.

| Secret                              | 값·조건                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `DEV_{COLOR}_DOCKER_NETWORK`        | `ieum_net_{color}`                                                   |
| `DEV_{COLOR}_DOCKER_NETWORK_SUBNET` | 해당 앱 망의 확정된 사설 CIDR                                        |
| `DEV_{COLOR}_CONTAINER_NAME`        | 서로 다른 프론트 컨테이너 이름. 예: `ieum-{color}-frontend`          |
| `DEV_{COLOR}_FRONTEND_IP`           | 해당 색상 프론트 IP                                                  |
| `DEV_{COLOR}_BACKEND_IP`            | 해당 색상 백엔드 IP                                                  |
| `DEV_{COLOR}_AGENT_IP`              | 해당 색상 에이전트 IP                                                |
| `DEV_{COLOR}_FRONTEND_ENV_DIR`      | `/home/kwung/deploy/bluegreen/runtime/{color}` 또는 허용된 하위 경로 |
| `DEV_{COLOR}_FRONTEND_ENV_FILE`     | 위 디렉터리의 `frontend.env` 또는 `.env`                             |

세 네트워크의 대역은 서로 겹치면 안 되며, 앱 IP는 해당 색상 대역 안에 있어야 한다.
기존 컨테이너·호스트·VPN과의 충돌은 인프라 준비 단계에서 확인한다.
프론트는 자기 색상망을 사용하고, 백엔드·에이전트는 공용 데이터망에도 연결한다.
Blue·Green이 같은 DB를 사용하므로 별도 DB 동기화는 없다.

## 변수 추가·변경 규칙

- 이전의 접두사 자동 수집 대신 필요한 Secrets만 워크플로우 `env`에 명시하며 전체 Secrets JSON을 전달하지 않는다.
  `DEV_COM_VITE_API_URL`은 접두사를 제거한 `VITE_API_URL`로 기록한다.
- 이미 지원하는 앱 설정의 **값만 변경**하면 Secrets를 갱신한 뒤 새로 빌드·배포한다.
  **새 변수 이름 추가**는 Secrets 등록만으로 반영되지 않으므로 아래 절차에 따라 수집 목록·워크플로우·앱·문서를 함께 갱신한다.
- 허용 목록 밖의 `DEV_*`, MAIN·AWS, 이전 `DEV_VITE_*`·접두사 없는 Secrets,
  전체 Secrets JSON이나 서버 원본 `.env`로 누락값을 보충하지 않는다.
- 필수값이 없거나 공백뿐이면 중단한다. 선택 항목은 미등록·빈 문자열을 생략해 앱 기본값을 사용한다.
  값의 공백·따옴표는 그대로 유지하며 줄바꿈은 받지 않는다. 측정 지연을 없애려면 빈 값 대신 `0`을 등록한다.
- 빌드에는 스냅샷의 `VITE_*`만 전달하며 원본 DEV·MAIN·AWS 입력과 GitHub 토큰은 자식 프로세스에서 제거한다.
- `NODE_ENV=production`, `HUSKY=0`은 빌드 코드가 관리하므로 별도 등록할 필요가 없다.
  실행 경로·Node 옵션·배포 제어용 예약 변수는 앱 Secrets로 설정하지 않는다.

**`VITE_*`는 브라우저에 공개되는 설정이다. 비밀번호·토큰·비공개 API 키를 넣지 않는다.**

### 새 공개 설정 추가 체크리스트

`VITE_NEW_OPTION`을 추가하는 예시다. 현재 필수 등록 목록에 포함된 항목은 아니다.

- [ ] GitHub Actions Secret `DEV_COM_VITE_NEW_OPTION`을 등록한다.
- [ ] [수집기](../../scripts/bluegreen/frontend_env.py)의 `DEV_BUILD_KEYS`에 `VITE_NEW_OPTION`을 추가한다.
      `DEV_SECRET_KEYS`에는 접두사가 붙은 이름이 자동으로 포함된다.
- [ ] [DEV 워크플로우](../../.github/workflows/frontend-dev-server.yml)의 `Build frontend from DEV Secrets` 단계에
      아래 `env` 매핑을 추가한다. `run` 안에 Secret 값을 직접 삽입하지 않는다.
- [ ] 앱에서 `import.meta.env.VITE_NEW_OPTION`을 읽고 필수 여부·기본값을 정한다.
      [DEV 입력 테스트](../../scripts/bluegreen/test_dev_secret_inputs.py)에 미등록·빈 값 처리 검증을 보완한다.
- [ ] 이 문서의 Secrets 표를 갱신하고 아래 로컬 확인을 수행한 뒤 새 빌드·배포에 반영한다.

```yaml
env:
    DEV_COM_VITE_NEW_OPTION: ${{ secrets.DEV_COM_VITE_NEW_OPTION }}
```

`REQUIRED_KEYS`와 연결 설정 목록 `DEPLOYMENT_KEYS`는 DEV·MAIN이 공유한다.
이를 변경할 때는 양쪽 수집기·워크플로우 입력·검증에 미치는 영향을 함께 확인한다.
DEV 공개 옵션만 추가하는 경우 `MAIN_BUILD_KEYS`를 수정할 필요는 없다.

## 배포 실행

워크플로우는 `frontend-dev-server.yml`이며, 수동 실행할 때는 `dev`를 선택한다.

| 실행 방법                  | 동작                                                                  |
| -------------------------- | --------------------------------------------------------------------- |
| `dev` push / 수동 `deploy` | 테스트·빌드·이미지 HTTP 검사 후 Blue/Green 배포                       |
| 수동 `configure-frontend`  | 같은 빌드 검사를 수행한 뒤 연결 설정만 등록. 앱 교체·트래픽 전환 없음 |

수동 실행의 기본값은 `deploy`이며 DEV 워크플로우에는 `build` 전용 작업이 없다.
러너는 group `ieum_dev_server`, labels `self-hosted, linux, x64, ieum-frontend`를 사용한다.

다음 Repository Variables에는 서버에 설치한 파일의 SHA-256을 등록한다.
값이 없거나 설치본과 다르면 설정 등록·배포를 중단한다.

| Variable                      | 검증 대상                                   |
| ----------------------------- | ------------------------------------------- |
| `BLUEGREEN_CONTROLLER_SHA256` | `/home/kwung/deploy/bluegreen/bluegreen.py` |
| `BLUEGREEN_HELPER_SHA256`     | `/usr/local/sbin/ieum-bluegreen-nginx`      |

네트워크·DB·Nginx 준비, 최초 전환, 연결 설정 변경과 복구는
[인프라 DEV 운영 절차](https://github.com/team-ieum/ieum-infra/blob/dev/docs/bluegreen-rollout.md)를 따른다.
이미 등록된 연결 설정의 이름·IP·경로를 Secrets만 바꿔 자동 이전하지 않는다.

## 환경설정과 복구

- 실행마다 새 비공개 디렉터리에 앱 `.env`와 연결 설정을 만들고, 같은 설정으로 빌드·배포한다.
- 체크아웃의 `.env*`나 러너에 남은 `VITE_*` 값이 빌드 설정에 다시 섞이지 않도록 한다.
- Node 버전·이미지 이름·연결 설정은 앱 `.env`에 넣지 않는다.
- 비공개 파일은 이미지에 복사하지 않고 실행 종료 시 정리한다.
- 새 설정은 전체 교체하지만, 제어 프로그램은 색상별 이미지·설정 스냅샷을 별도로 보존한다.
- 이전 배포로 복구할 때는 당시 이미지와 설정을 사용한다. Secrets 변경만으로 실행 중인 앱은 바뀌지 않는다.
- `VITE_*` 값을 바꿨으면 새 이미지를 빌드·배포해야 한다.

## 로컬 확인

```bash
python3 -m unittest discover -s scripts/bluegreen -p 'test_*.py'
npx vitest run --dir src
npm run lint
npm run build
```

실제 배포에서는 이미지 HTTP 검사, 도메인 접속, API 연결과 브라우저 동작을 별도로 확인한다.
