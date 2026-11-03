@AGENTS.md

## Claude Code

- 팀 공용 지침은 위의 `AGENTS.md`가 기준 문서입니다. 공통 규칙은 이 파일이 아니라 `AGENTS.md`에 추가하세요.
- `.claude/rules/`의 규칙 문서는 `paths` frontmatter에 맞는 파일을 다룰 때 자동으로 불러옵니다. `general.md`는 항상 불러옵니다. 새 파일을 만들 때처럼 해당 규칙이 아직 불러와지지 않았으면 `AGENTS.md`의 "세부 규칙 문서" 표를 보고 직접 읽으세요.
- 세션 시작 때 실제로 불러온 지침 파일은 `/context`의 Memory files 목록에서 확인하세요. `/memory`는 아직 없는 파일까지 지침 파일 위치를 모두 보여 줍니다. 공식 문서상 `@AGENTS.md`로 가져온 `AGENTS.md`는 한 번만 읽힙니다.
- 이 저장소에만 적용할 개인 지침은 저장소 루트의 `CLAUDE.local.md`(git 제외)에 두세요. `CLAUDE.local.md`는 worktree 사이에 공유되지 않습니다.
