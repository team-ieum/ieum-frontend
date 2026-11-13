# MAIN 프론트 Blue/Green 배포 설정

MAIN은 `https://kiacms.co.kr`을 사용한다. DEV의 Secrets, 네트워크, 컨테이너,
설정 파일과 배포 상태를 공유하지 않는다. DEV 워크플로우는 기존 동작을 유지한다.

## GitHub Secrets

공통 값은 `MAIN_COM_`, 색상별 배포 값은 `MAIN_BLUE_`와 `MAIN_GREEN_`으로 등록한다.
수집기는 `--environment main`을 명시했을 때 이 접두사만 읽으며, 누락된 값을
`DEV_`, `AWS_` 또는 접두사 없는 Secrets에서 보충하지 않는다.

| 공통 Secret | 값·용도 |
| --- | --- |
| `MAIN_COM_NODE_VERSION` | 빌드 Node 버전. 예: `24` |
| `MAIN_COM_IMAGE_NAME` | MAIN 전용 로컬 이미지 이름. 예: `ieum-frontend-main` |
| `MAIN_COM_VITE_API_URL` | `https://kiacms.co.kr` |
| `MAIN_COM_DATA_DOCKER_NETWORK` | `ieum_main_net_data` |
| `MAIN_COM_DATA_DOCKER_NETWORK_SUBNET` | MAIN 데이터 네트워크의 확정된 사설 CIDR |
| `MAIN_COM_POSTGRES_CONTAINER_NAME` | `ieum-main-postgres` |
| `MAIN_COM_REDIS_CONTAINER_NAME` | `ieum-main-redis` |
| `MAIN_COM_MONGO_CONTAINER_NAME` | `ieum-main-mongo` |

아래 항목을 Blue와 Green에 각각 등록한다. `{COLOR}`는 `BLUE` 또는 `GREEN`,
`{color}`는 `blue` 또는 `green`이다. IP와 subnet은 인프라·백엔드·에이전트와
같은 값을 사용하며 DEV 또는 다른 MAIN 네트워크와 겹치면 안 된다.

| 색상별 Secret | 값·용도 |
| --- | --- |
| `MAIN_{COLOR}_DOCKER_NETWORK` | `ieum_main_net_{color}` |
| `MAIN_{COLOR}_DOCKER_NETWORK_SUBNET` | 해당 MAIN 앱 네트워크의 확정된 사설 CIDR |
| `MAIN_{COLOR}_CONTAINER_NAME` | `ieum-main-{color}-frontend` |
| `MAIN_{COLOR}_FRONTEND_IP` | 해당 색상의 프론트 IP |
| `MAIN_{COLOR}_BACKEND_IP` | 해당 색상의 백엔드 IP |
| `MAIN_{COLOR}_AGENT_IP` | 해당 색상의 에이전트 IP |
| `MAIN_{COLOR}_FRONTEND_ENV_DIR` | `/home/kwung/deploy/bluegreen-main/runtime/{color}` |
| `MAIN_{COLOR}_FRONTEND_ENV_FILE` | `/home/kwung/deploy/bluegreen-main/runtime/{color}/frontend.env` |

새 `MAIN_COM_VITE_*` 항목은 접두사를 제거한 `VITE_*` 이름으로 빌드에 자동 반영된다.
Vite 환경변수는 브라우저 번들에 공개되므로 비밀번호·토큰·비공개 API 키를 넣지 않는다.
`NODE_VERSION`, `IMAGE_NAME` 및 배포 메타데이터는 앱 `.env`에서 제외한다.
`NODE_ENV=production`, `HUSKY=0`은 코드가 관리한다.

## Repository Variables와 러너

| Variable | 값·용도 |
| --- | --- |
| `MAIN_BOOTSTRAP_ENABLED` | 최초 설정 등록·이미지 및 설정 준비를 허용할 때만 `true` |
| `MAIN_DEPLOY_ENABLED` | MAIN 초기 구성 준비 후 `true`로 설정. 없거나 다른 값이면 서버 배포 job은 실행하지 않음 |
| `MAIN_BLUEGREEN_CONTROLLER_SHA256` | 설치 승인된 MAIN controller의 SHA-256 |
| `MAIN_BLUEGREEN_HELPER_SHA256` | 설치 승인된 MAIN Nginx helper의 SHA-256 |

배포 러너 group은 `ieum_main_server`, labels는
`self-hosted`, `linux`, `x64`, `ieum-frontend`, `main`, `deploy`이다.
controller는 `/home/kwung/deploy/bluegreen-main/bluegreen.py`, helper는
`/usr/local/sbin/ieum-main-bluegreen-nginx`, 정책 파일은
`/etc/nginx/ieum-main-frontend-deployment.json`을 사용한다.

## 빌드와 배포 흐름

1. `main` push 또는 `main`을 선택한 수동 실행이 GitHub의 `ubuntu-latest`에서
   lint, Python 배포 테스트, 프론트 테스트, 타입 검사와 빌드를 수행한다.
2. MAIN Secrets에서 공개 빌드 값(`VITE_*`, `NODE_ENV`)과 배포 메타데이터 스냅샷을
   만들고 그 값으로 한 번 빌드한다. 그 외 runtime 값은 배포 job에서만 파일에 기록한다.
   빌드된 Nginx 이미지에서 index·asset 응답과 없는 asset의 404를 확인한다.
3. 이미지 tar와 검증 manifest만 보관 기간 1일의 immutable artifact로 전달한다.
   `.env`와 배포 설정 JSON은 업로드하지 않는다. CI의 비공개 설정 파일은 정리한다.
4. 선택한 작업의 실행 허용 Variable이 `true`인 경우에만 MAIN 배포 러너가 같은 실행의
   artifact ID로 다운로드한다. 같은 source SHA·run ID·attempt, 이미지 tar SHA-256,
   공개 빌드 값과 배포 메타데이터의 해시를 검증한다. 두 job 사이 빌드·배포 설정이
   바뀌었으면 배포하지 않는다. 빌드에 사용하지 않는 runtime 값은 이 비교 대상이 아니다.
5. MAIN controller/helper 설치 해시를 확인한 다음 이미지를 불러온다. classic Docker의
   config ID와 containerd의 manifest/index ID를 구분하고, tar 안의 Docker·OCI 참조가
   같은 MAIN 태그와 linux/amd64 설정을 가리키는지 검증한다. 저장 방식 변환으로 새 ID가
   생기면 로드한 이미지를 임시 tar로 다시 저장해 config 해시가 같은지 확인하고 정리한다.
   tag 대신 배포 서버에서 검증된 실제 image ID를 controller에 전달한다.
   이 러너에서 npm 설치·테스트·빌드는 실행하지 않는다.
6. controller가 MAIN 후보 환경 준비·검증·전환을 수행한다. 후보 설정과 임시 다운로드
   파일은 성공 여부와 관계없이 정리하며, controller가 보관하는 색상별 스냅샷은 유지한다.

수동 실행 기본 작업은 `build`이다. 서버 러너를 실행하지 않고 CI 검사와 artifact 생성만
수행하며, summary에 source SHA·image ID·tar SHA-256·artifact ID를 표시한다.

최초 등록은 `MAIN_DEPLOY_ENABLED`를 끈 상태에서 `MAIN_BOOTSTRAP_ENABLED=true`로
설정하고 `configure-frontend`를 선택한다. 다음 `stage-bootstrap` 실행은 검증한
이미지와 비공개 설정을 MAIN controller에 보관할 뿐 컨테이너를 시작하거나 전환하지 않는다.
세 앱의 준비가 끝난 후 인프라의 `init` → `bootstrap-prepare` → `switch` 절차를 따른다.
초기 데이터 서비스·네트워크·Nginx·인증서도 인프라 절차로 별도 준비해야 한다.

초기 전환을 확인한 뒤 `MAIN_BOOTSTRAP_ENABLED`를 끄고 `MAIN_DEPLOY_ENABLED=true`로
설정하면 `main` push 또는 수동 `deploy`가 이후 배포를 수행한다. 이 Variable을 켜는
시점은 팀과 조율한다. 설정 등록이나 artifact 생성만으로 부트스트랩이 끝나는 것은 아니다.

## 검증

```bash
python3 -m unittest discover -s scripts/bluegreen -p 'test_*.py'
npm run lint
npm run build
```

새 테스트는 MAIN/DEV 수집 격리, MAIN 도메인·경로·네트워크·이름 검증,
설정 변경과 이미지 변조·다른 실행 artifact 거절, classic/containerd 간 이미지 전달,
OCI 태그·descriptor·config 변조 및 attestation ID 거절을 다룬다. 실제 MAIN 배포 검증은
서버 준비와 별도 실행 승인이 완료된 뒤 진행한다.
