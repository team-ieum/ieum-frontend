# Frontend DEV Secrets와 Blue/Green 설정

이 문서는 2026-10-28 로컬 수정 기준이다. GitHub 설정·서버·배포·커밋·push는 수행하지 않았다.

## 이름 규칙

Frontend 저장소의 `DEV_` Secrets를 선택하고 접두사를 한 번 제거한다.

| GitHub Secret | 사용처 |
|---|---|
| `DEV_NODE_VERSION` | setup-node용 CI 설정. 컨테이너 환경에는 복사하지 않음 |
| `DEV_IMAGE_NAME` | Docker 이미지 이름. 컨테이너 환경에는 복사하지 않음 |
| `DEV_VITE_API_URL` | 필수 앱 설정 `VITE_API_URL`. 빌드와 배포 snapshot에 동일 값 사용 |
| `DEV_VITE_MEASUREMENT_MODE` | 선택 앱 설정 `VITE_MEASUREMENT_MODE` |
| `DEV_VITE_MEASUREMENT_DELAY_MS` | 선택 앱 설정 `VITE_MEASUREMENT_DELAY_MS` |
| `DEV_VITE_NEW_OPTION` | 신규 앱 설정 `VITE_NEW_OPTION`. workflow 개별 매핑 수정 불필요 |
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

## 한 번 만든 설정으로 빌드와 배포

1. CI 설정은 `DEV_NODE_VERSION`, `DEV_IMAGE_NAME`으로 연결하고 비어 있거나 줄바꿈이 있으면
   setup/build 전에 거부한다. 설치 단계의 `HUSKY=0`은 유지한다.
2. 앱 테스트 후 build 단계에만 `IEUM_FRONTEND_SECRETS_JSON: ${{ toJSON(secrets) }}`를 전달한다.
   이 JSON에는 해당 실행이 접근 가능한 **전체 Secrets**가 일시 존재한다. builder가 `DEV_`만
   선택하므로 앱 후보에는 다른 환경·자동 `GITHUB_TOKEN` 등이 들어가지 않는다.
3. `$RUNNER_TEMP/ieum-frontend-settings.*/`의 새 0700 디렉터리에 0600 `frontend.env`를 만든다.
   이전 파일에 append하거나 서버 공용 파일·배포 중인 환경과 합치지 않는다.
4. Node 자식 프로세스에서 원본 JSON과 ambient `VITE_*`를 제거하고, 후보의 `VITE_*`와 고정
   `NODE_ENV=production`, `HUSKY=0`, 내부 CI marker만 전달한다. 일반 non-VITE 앱 키는 후보에
   보존하지만 Node 빌드에 추가하지 않는다. `npx --no-install vite build`의 인자는 고정이다.
5. `vite.config.ts`는 내부 marker가 있는 snapshot build에서 `envDir: false`로 기본 dotenv 읽기를
   끄고 직접 호출하던 `loadEnv`도 우회한다. 따라서 Secret에서 삭제한 키가 체크아웃의 `.env*`나
   runner의 ambient `VITE_*`로 되살아나지 않는다. marker 없는 로컬 개발 동작은 유지한다.
6. 성공한 동일 후보 바이트의 SHA-256을 옆의 private `frontend.sha256`에 기록한다.
   후속 단계에 넘기는 `GITHUB_OUTPUT`은 디렉터리 경로뿐이며 값·원본 JSON·seal 내용은 출력하지 않는다.
7. deploy 단계는 후보·seal의 소유권·권한·내용을 다시 확인한 후 **빌드한 바로 그 파일**을
   controller의 `--env-file --replace-env`로 전달한다. 값을 다시 수집하거나 다른 후보를 만들지 않는다.
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
  namespace 및 기존 컨테이너·IP·네트워크·서버 env 경로 설정은 자동 앱 설정으로 받지 않는다.
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
