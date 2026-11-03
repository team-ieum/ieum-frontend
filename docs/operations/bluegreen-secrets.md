# Frontend DEV Secrets와 Blue/Green 설정

이 문서는 2026-11-01 v17 앱 네트워크 분리·공용 데이터망과 DEV_COM_ 명명 규칙을 반영한다. 이번 수정에서 GitHub 설정·서버·배포·커밋·push는 수행하지 않았다.

## 이름 규칙

Frontend 저장소의 `DEV_` Secrets를 선택하고 접두사를 한 번 제거한다. 공통 설정의 COM_도 한 번 제거한다. 예: DEV_COM_VITE_API_URL → VITE_API_URL.

| GitHub Secret | 사용처 |
|---|---|
| `DEV_COM_NODE_VERSION` | setup-node용 CI 설정. 컨테이너 환경에는 복사하지 않음 |
| `DEV_COM_IMAGE_NAME` | Docker 이미지 이름. 컨테이너 환경에는 복사하지 않음 |
| `DEV_COM_VITE_API_URL` | 필수 앱 설정 `VITE_API_URL`. 빌드와 배포 snapshot에 동일 값 사용 |
| `DEV_COM_VITE_MEASUREMENT_MODE` | 선택 앱 설정 `VITE_MEASUREMENT_MODE` |
| `DEV_COM_VITE_MEASUREMENT_DELAY_MS` | 선택 앱 설정 `VITE_MEASUREMENT_DELAY_MS` |
| `DEV_COM_VITE_NEW_OPTION` | 신규 앱 설정 `VITE_NEW_OPTION`. workflow 개별 매핑 수정 불필요 |
| `DEV_NEW_RUNTIME_OPTION` | 신규 컨테이너 설정 `NEW_RUNTIME_OPTION`. Vite 빌드에는 전달하지 않음 |

기존 Frontend 앱 설정 이름은 그대로 사용하며 별도 앱 별칭 변환은 없다. 접두사 없는 예전
NODE_VERSION·IMAGE_NAME·VITE_API_URL이나 서버 원본 `.env`로 fallback하지 않는다.
`MAIN_`, `DEVELOPMENT_`, `DEVX_`도 선택하지 않는다. 이전에 `DEV_BACKEND_*` 이름을 만들었다면
이 저장소에서는 `BACKEND_*`라는 확장 키가 되므로 `DEV_` + 실제 앱 변수명으로 정리한다.
GitHub 등록값을 자동 복사·변경·삭제하지 않았다. Main/AWS workflow는 변경하지 않았다.

`VITE_*`는 앱에서 참조하면 **브라우저 JavaScript에 포함될 수 있는 공개 설정**이다.
GitHub Secret에 저장해도 빌드된 값이 비밀이 되지 않으므로 백엔드 비밀번호·토큰을 넣지 않는다.
신규 `DEV_*` 키의 빈 값은 `KEY=`로 보존하고, Secret을 삭제하면 다음 후보에서 키가 제거된다.
앱 자체가 그 변수를 읽도록 구현돼 있어야 하며, 프론트 정적 코드가 기본으로 읽는 것은 `VITE_*`다.

## 분리한 앱 네트워크와 공용 데이터 네트워크

```text
호스트 Nginx (기존 외부 주소·수신 포트)
  ├─ ieum_net_blue  : Blue Frontend·Backend·Agent
  └─ ieum_net_green : Green Frontend·Backend·Agent

Backend·Agent만 ieum_net_data에도 연결
  └─ PostgreSQL·Redis·MongoDB 한 세트 공유
```

프론트는 자기 색상망 한 개만 사용한다. Backend·Agent는 자기 색상망과 데이터망 두 개를 사용한다.
컨테이너 생성 후 시작 전에 data network를 연결하고 gateway priority=-1을 지정해 앱 망을 기본
외부 통신 경로로 유지한다. Docker CLI·Engine API 1.48 이상이 필요하다(Docker 28 계열부터 지원).
데이터 복제·두 DB 쓰기·동기화 프로세스는 구성하지 않는다. Data network에 붙은 두 색상의 Backend·Agent는
같은 bridge를 공유하므로 이 구성만으로 모든 포트의 상호 접근이 차단되지는 않는다. 엄격한 포트 격리는 별도 방화벽 정책이 필요하다.

### Frontend 저장소에 등록할 필수 Secrets: 24개

아래는 배포 계획의 예시다. 실제 서버의 현재 값·주소 가용성 확인 결과가 아니다. 기존 접두사 없는
Secrets는 Legacy workflow가 계속 사용하므로 유지한다. 예전 DEV_VITE_API_URL 같은 새 접두사별칭과
DEV_COM_VITE_API_URL을 동시에 등록하면 중복으로 거부한다. 기존 앱 DEV_ 표기는 호환 입력으로 읽지만 CI의
NODE_VERSION·IMAGE_NAME은 DEV_COM_ 이름만 읽는다. Backend·Agent 앱 Secrets 이름을 이번 변경에서 일괄 바꾸지 않는다.

| 공통 Secret | 값 / 예시 |
|---|---|
| DEV_COM_NODE_VERSION | 기존 Node 버전 |
| DEV_COM_IMAGE_NAME | 기존 frontend 이미지 이름 |
| DEV_COM_VITE_API_URL | 기존 DEV 도메인 |
| DEV_COM_DATA_DOCKER_NETWORK | ieum_net_data |
| DEV_COM_DATA_DOCKER_NETWORK_SUBNET | 10.30.10.0/24 |
| DEV_COM_POSTGRES_CONTAINER_NAME | ieum-postgres |
| DEV_COM_REDIS_CONTAINER_NAME | ieum-redis |
| DEV_COM_MONGO_CONTAINER_NAME | ieum-mongo |

| Blue Secret | 값 / 예시 |
|---|---|
| DEV_BLUE_DOCKER_NETWORK | ieum_net_blue |
| DEV_BLUE_DOCKER_NETWORK_SUBNET | 10.20.10.0/24 |
| DEV_BLUE_CONTAINER_NAME | ieum-blue-frontend |
| DEV_BLUE_FRONTEND_IP | 10.20.10.20 |
| DEV_BLUE_BACKEND_IP | 10.20.10.21 |
| DEV_BLUE_AGENT_IP | 10.20.10.24 |
| DEV_BLUE_FRONTEND_ENV_DIR | /home/kwung/deploy/bluegreen/runtime/blue |
| DEV_BLUE_FRONTEND_ENV_FILE | /home/kwung/deploy/bluegreen/runtime/blue/frontend.env |

| Green Secret | 값 / 예시 |
|---|---|
| DEV_GREEN_DOCKER_NETWORK | ieum_net_green |
| DEV_GREEN_DOCKER_NETWORK_SUBNET | 10.10.10.0/24 |
| DEV_GREEN_CONTAINER_NAME | ieum-green-frontend |
| DEV_GREEN_FRONTEND_IP | 10.10.10.30 |
| DEV_GREEN_BACKEND_IP | 10.10.10.31 |
| DEV_GREEN_AGENT_IP | 10.10.10.34 |
| DEV_GREEN_FRONTEND_ENV_DIR | /home/kwung/deploy/bluegreen/runtime/green |
| DEV_GREEN_FRONTEND_ENV_FILE | /home/kwung/deploy/bluegreen/runtime/green/frontend.env |

이전 DEV_COM_DOCKER_NETWORK·DEV_COM_DOCKER_NETWORK_SUBNET의 단일 앱 망 항목은 사용하지 않는다.
각 색상의 망·서브넷 두 개와 공통 데이터망·서브넷으로 대체한다. Blue·Green 이름은 요청된 두 이름으로
검증하며 세 subnet은 RFC1918 IPv4이고 서로 겹치지 않아야 한다. 이 검증이 실제 LAN·VPN·다른 Docker 망의
충돌까지 증명하지는 않으므로 실제 생성 전에 별도 점검한다. 앱 망은 외부 통신 가능한 bridge여야 한다.

모든 앱 IP를 해당 색상 subnet 안에 명시한다. 컨테이너명·IP 충돌, 현재 gateway/endpoint 점유를 확인한다.
이전 Legacy IP는 후보로 사용할 수 없다. 설정 경로는 해당 색상의
`/home/kwung/deploy/bluegreen/runtime/{blue|green}` 아래에서 지정한다. 하위 디렉터리도 허용하되
각 이름은 영문·숫자로 시작하는 64자 이하의 영문·숫자·밑줄·하이픈이다. 파일명은 frontend.env 또는 .env이고
ENV_FILE의 부모가 ENV_DIR이어야 한다. 디렉터리 0700·파일 0600·소유권·symlink를 준비 전에 검사한다.

앱 설정은 frontend.env, 위 배포 메타데이터 21개는 frontend-deployment.json으로 분리한다.
둘을 한 SHA seal로 확인하고 메타데이터는 Node 빌드·앱 환경에 넣지 않는다. 기존 단일 색상의
DEV_CONTAINER_NAME·DEV_FRONTEND_IP·DEV_FRONTEND_ENV_DIR·DEV_FRONTEND_ENV_FILE은 받지 않는다.

### 데이터 연결 설정

Backend DB_URL·REDIS_HOST·MONGO_URI와 Agent MONGODB_URL은 공용 데이터망에 연결된 실제
PostgreSQL·Redis·MongoDB 컨테이너의 이름 또는 해당 데이터망 IP를 가리켜야 한다. 기존 앱망 IP를
남기면 준비 전에 거부한다. URI를 자동 편집하거나 credentials를 출력하지 않는다. DB명·schema·Mongo
DB명·Redis DB 번호와 큐 key prefix는 기존과 동일하게 유지하고 실제 데이터를 확인한다. 데이터 컨테이너
동일성과 health가 모든 논리 데이터 설정의 동일성까지 증명하지는 않는다.
Agent pytest는 runner 호스트에서 실행되므로 Docker DNS 이름만 사용하는 앱 URI라면 테스트 전용
DEV_AGENT_TEST_MONGODB_URL에 호스트에서 접근 가능한 별도 테스트 URI를 제공해야 한다.

### 최초 적용과 재시도

1. 팀 점검 구간에 기존 DEV 배포 동결·백업·앱/DB 연결·주소/권한 점검을 한다. 데이터 컨테이너·볼륨을 재생성하지 않는다.
2. 새 helper/controller와 SHA Variables를 준비한다. pin 없는 옛 slot은 Infra runbook의 retire-stale-slots
   dry-run → ID/SHA 검토 → 확인 실행으로 정리한다. 이미 schema 1 pin이 있으면 자동 업그레이드하지 않으므로 별도 migration이 필요하다.
3. Blue/Green/Data bridge 세 개를 준비한다. 기존 ieum_net_green이 예시 subnet이면 그대로 재사용한다.
   PostgreSQL·Redis·MongoDB 기존 컨테이너를 데이터망에 추가 연결한다. Legacy를 유지하는 동안은 옛 연결을 바로 끊지 않는다.
4. Frontend 수동 workflow의 operation=configure-frontend로 schema 2 root pin을 등록한다. 이 모드는
   앱 교체·Nginx reload를 하지 않는다. 네트워크·데이터 컨테이너를 자동 생성/연결하는 모드도 아니다.
5. 승인된 private 앱 설정 후보로 protocol-2 Backend bootstrap을 수행한다. 필요하면 Agent 환경 후보도 함께
   제공해 데이터망 주소를 반영한다. 후보는 같은 색상 Agent/Backend 주소를 controller가 주입한다.
6. 최초 전환 후 finish-bootstrap이 Legacy 작업/연결을 기다리고 Legacy 앱을 중지한다. 데이터 컨테이너가
   옛 앱망에 남아 있으면 distributed mode 활성화 전에 멈춘다. 이때 Legacy가 정지됐음을 확인한 담당자가
   DB·Redis·MongoDB의 옛 망 연결만 분리한다. 데이터망 연결·컨테이너·볼륨은 유지한다.
7. finish-bootstrap을 다시 실행한다. 데이터 컨테이너가 데이터망에만 연결되어 있어야 ready가 된다.
   정상 전환·역전환·rollback·외부 접속·외부 API 호출을 검증한 뒤 새 DEV 자동 배포를 재개한다.

최초 이전에는 점검 시간이 필요할 수 있다. 같은 pin의 재등록은 허용하지만 이름·IP·서브넷·network·경로·
데이터 컨테이너 이름을 바꾸면 자동 채택하지 않는다. schema 1은 기존 점검·recover용으로 읽을 수 있지만 새
prepare/deploy는 schema 2를 요구한다. app DEV_COM_VITE_* 변경은 새 빌드·배포에서 계속 허용한다.
Backend·Agent workflow는 이 공통 root pin을 읽으므로 그 저장소에 프론트의 topology Secrets를 복제하지 않는다.

## 한 번 만든 설정으로 빌드와 배포

1. CI 설정은 `DEV_COM_NODE_VERSION`, `DEV_COM_IMAGE_NAME`으로 연결하고 비어 있거나 줄바꿈이 있으면
   setup/build 전에 거부한다. 설치 단계의 `HUSKY=0`은 유지한다.
2. 앱 테스트 후 build 단계에만 `IEUM_FRONTEND_SECRETS_JSON: ${{ toJSON(secrets) }}`를 전달한다.
   이 JSON에는 해당 실행이 접근 가능한 **전체 Secrets**가 일시 존재한다. builder가 `DEV_`만
   선택하므로 앱 후보에는 다른 환경·자동 `GITHUB_TOKEN` 등이 들어가지 않는다.
3. `$RUNNER_TEMP/ieum-frontend-settings.*/`의 새 0700 디렉터리에 0600 `frontend.env`와 배포 메타데이터 `frontend-deployment.json`을 만든다.
   이전 파일에 append하거나 서버 공용 파일·배포 중인 환경과 합치지 않는다.
4. Node 자식 프로세스에서 원본 JSON과 ambient `VITE_*`를 제거하고, 후보의 `VITE_*`와 고정
   `NODE_ENV=production`, `HUSKY=0`, 내부 CI marker만 전달한다. 일반 non-VITE 앱 키는 후보에
   보존하지만 Node 빌드에 추가하지 않는다. `npx --no-install vite build`의 인자는 고정이다.
5. `vite.config.ts`는 내부 marker가 있는 snapshot build에서 `envDir: false`로 기본 dotenv 읽기를
   끄고 직접 호출하던 `loadEnv`도 우회한다. 따라서 Secret에서 삭제한 키가 체크아웃의 `.env*`나
   runner의 ambient `VITE_*`로 되살아나지 않는다. marker 없는 로컬 개발 동작은 유지한다.
6. 성공한 앱 후보와 배포 메타데이터 바이트를 함께 묶은 SHA-256을 옆의 private `frontend.sha256`에 기록한다.
   후속 단계에 넘기는 `GITHUB_OUTPUT`은 디렉터리 경로뿐이며 값·원본 JSON·seal 내용은 출력하지 않는다.
7. deploy 단계는 후보·seal의 소유권·권한·내용을 다시 확인한 후 **빌드한 바로 그 파일**을
   controller의 `--env-file --replace-env`와 `--frontend-deployment-file`로 전달한다. 값을 다시 수집하거나 다른 후보를 만들지 않는다.
8. build 실패·검증 실패에서는 controller를 부르지 않는다. build 자체의 실패는 EXIT trap으로 정리하고,
   성공 후 Docker 빌드·검증·배포 중 실패하거나 정상 종료하면 마지막 `always()` 단계에서 정리한다.
   SIGKILL·호스트 장애 때 cleanup은 보장되지 않는다.

seal은 build/deploy 설정 일치 검사용이다. 같은 runner 계정 권한을 이미 가진 악성 프로세스가
후보와 seal을 모두 바꾸는 공격을 막는 별도 보안 저장소로 표현하지 않는다.
Node 빌드 출력은 원시값 노출을 피하도록 감추며 실패는 고정 `frontend_build_failed` 코드로 보고한다.
실제 빌드 문제를 조사할 때도 전체 환경이나 Secret을 로그에 출력하지 않는다.

## 전체 교체와 색상별 snapshot

Frontend도 `--replace-env`를 사용한다. 새 후보는 이번 `DEV_` 선택값으로 전체 교체되므로 제거한
키가 예전 snapshot에서 다시 합쳐지지 않는다. controller가 유지하는 색상별 runtime snapshot·이미지
정체성·다른 앱 환경 재사용·retained rollback 절차는 그대로다. GitHub Secret 변경만으로 실행 중
컨테이너·이미지가 바뀌지는 않으며 새 Frontend 배포가 필요하다. `VITE_*`는 새 이미지 빌드가 필요하다.

Dockerfile은 `dist`와 Nginx 설정만 복사한다. private 후보는 checkout 밖에 보관하고 `.dockerignore`는
`.env`, `.env.*`, `.git`, `node_modules`도 빌드 context에서 제외한다. 원본 JSON·후보 파일을 이미지나
Actions artifact로 복사하지 않는다.

## 검증 정책과 제한

- 입력 JSON은 UTF-8 object이며 96KiB 이하, 후보는 UTF-8 48KiB 이하로 제한한다.
  비선택 Secrets도 원본 JSON 크기에 포함된다. OS/runner 환경변수 전달 제한으로 Python 시작 전에
  실패할 수도 있으며 그 경우 builder의 고정 오류까지 보장하지 않는다.
- 중복 JSON 키, 비표준 NaN/Infinity, 잘못된/과도한 중첩 JSON, 선택값의 문자열 이외 타입을 거부한다.
- 이름을 ASCII 검사 뒤 대문자 정규화하며 대소문자·underscore를 무시한 충돌도 거부한다.
- `VITE_API_URL`은 누락·빈값·공백만 있는 값이면 거부한다. `NODE_ENV`와 `HUSKY`는 미등록이면 각각
  production·0으로 처리하고, 등록했다면 같은 값만 허용한다. HUSKY는 runtime 후보에서 제외한다.
- PATH, NODE_OPTIONS, NODE_PATH, BASH_ENV 등 프로세스 실행 설정과 Nginx/runner/deployment 관리
  namespace 및 단일 색상용 기존 컨테이너·IP·서버 env 경로 설정은 받지 않는다. 위에서 명시한 배포 메타데이터는 앱 설정과 분리해 받는다.
  정확한 목록은 도구의 `RESERVED_KEYS`·`RESERVED_PREFIXES`를 따른다.
- 선택값은 단일 행 literal이다. 줄 구분자·NUL·잘못된 Unicode를 거부하고 `$()`·backtick·따옴표·공백을
  shell 명령으로 해석하지 않는다. 값에 붙인 따옴표를 자동 제거하지 않는다.
- 후보·seal은 배포 계정 소유 regular file·0600·단일 hardlink이며 symlink·기존 내용·공개 권한을 거부한다.
  설정 디렉터리는 해당 RUNNER_TEMP 바로 아래의 지정 prefix·0700·동일 소유자여야 한다.
- Secret 실제 등록·값 의미·API 연결과 브라우저 동작은 별도 확인 대상이다. 테스트는 합성 설정과 모의
  Node/controller만 사용하며 실제 Secrets·서버를 조회하지 않는다.

```bash
python3 -m unittest discover -s scripts/bluegreen -p 'test_*.py'
```

개별 Secret 등록·마스킹이 전체 runner 격리나 관리자에 대한 환경변수 암호화를 제공하지는 않는다.
Docker 관리자는 runtime 환경을 조회할 수 있다.

[GitHub Secrets 컨텍스트](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#secrets-context),
[Vite 환경변수 공개 범위](https://vite.dev/guide/env-and-mode),
[Vite envDir](https://vite.dev/config/shared-options#envdir).

2026-11-01 초기 v16 검증은 46개였으며, 후속 경로 충돌·workflow 실행 가드 보완 뒤 49개가 통과했다.
실패·오류·건너뜀은 0이고 workflow YAML은 후속 수정에서 변경하지 않았다. 실제 GitHub Secrets·서버·Docker daemon을
사용하지 않았으며 실제 Vite 빌드·브라우저 검증은 이번 변경에서 재실행하지 않았다.

## v17 검증 기록

2026-11-01 Frontend 설정·파일·seal·workflow 회귀 52개, Infra 287개 통과. Docker·root 소유권·서비스는
합성/모의 검증이며 실제 서버에 적용하지 않았다. 실제 네트워크/DB/도메인 전환 검증과 앱 전체 테스트는 별도 대상이다.
[Docker gateway priority와 API 1.48](https://docs.docker.com/reference/api/engine/version-history/#v148-api-changes).
