# sco.pe.kr 과학 포털

과학 실험·측정 도구와 수업 자료를 모으는 **로컬 프로토타입**입니다. Astro로 정적 페이지를 만들고, 검색·필터와 대표 도구 선택에만 작은 TypeScript 모듈을 사용합니다.

## 시작

Node.js 24 이상이 필요합니다.

```sh
npm ci
npm run dev
```

기본 주소는 `http://127.0.0.1:4321/`입니다. `index.html`을 직접 여는 방식이 아닙니다.

## 구조

```text
src/
  content/tools/          도구마다 JSON 파일 하나
  content/resources/      자료와 관련 도구 ID
  content.config.ts       Astro 콘텐츠 컬렉션
  lib/catalog/            스키마·분류·검증·검색·데이터 로딩
  components/             공통 카드·자료 목록·헤더·푸터
  features/catalog/       검색과 필터
  features/featured/      대표 도구 배너와 더미 미리보기
  features/tool-detail/   공통 도구 소개 화면
  layouts/                공통 문서·메타데이터
  pages/                  홈·도구별 소개·수업 자료·404
  styles/                 디자인 토큰과 기본 스타일
public/                   정적 이미지와 아이콘
scripts/                  콘텐츠 검사·새 도구 생성
tests/                    단위·브라우저 테스트
docs/                     구조와 유지보수 안내
backups/                  이전 EduLink 작업본 (Git 제외)
```

## 새 도구 추가

```sh
npm run new:tool -- pendulum
```

생성된 `src/content/tools/pendulum.json`에 실제 정보와 실행 주소를 입력하고 `draft`를 `false`로 바꾸면 목록과 `/tools/pendulum/` 소개 페이지가 함께 생성됩니다. **페이지나 카드 코드를 따로 복제하지 않습니다.**

- 대표 배너에 넣을 도구만 `featured` 정보를 추가합니다.
- 목록 첫 3개는 큰 이미지의 3열 소개, 이후는 오른쪽 이미지가 있는 2열 소개입니다. `thumbnail`이 없으면 플레이스홀더가 표시됩니다.
- 미리보기는 선택 사항이며 현재는 정적 더미만 지원합니다.
- 수업 자료는 `src/content/resources/`에 추가하고 `toolIds`로 도구와 연결합니다.
- 자세한 작업 방법: [유지보수 가이드](docs/maintenance.md)
- 모듈 경계와 설계 이유: [아키텍처](docs/architecture.md)

## 검증과 빌드

```sh
npm run check
npm test
npm run build
npm run test:e2e
```

`build`는 콘텐츠 검증 후 `dist/`에 정적 파일을 만듭니다. 브라우저 테스트는 빌드 결과를 사용하므로 먼저 빌드해야 합니다. Windows에서는 설치된 Edge를 사용합니다. 다른 환경은 `npx playwright install chromium`으로 테스트용 Chromium을 설치합니다.

현재 공개 도구 10개와 관련 자료 5개가 등록되어 있습니다. 목록 이미지 9개는 실제 실행 화면에서 캡처했고, 1개는 플레이스홀더입니다. [이미지 출처·상태](docs/tool-images.md)를 참고하세요. 모바일에서는 배너의 미리보기 DOM과 이미지 요청이 생성되지 않으며, 목록의 대표 이미지는 표시합니다. 실제 시뮬레이션, 로그인, 데이터베이스는 이 프로토타입의 범위가 아닙니다.

## 기존 작업본

`backups/edulink-2026-10-14/`에 이전 파일과 로컬 지침·스킬을 보관했습니다. `backup-manifest.json`에는 원본과 대조한 SHA-256 해시가 있습니다. Git 이력은 현재 `.git`에 그대로 유지됩니다. 백업은 `public/`이나 `dist/`에 포함되지 않습니다.

GitHub 푸시와 도메인 배포는 수행하지 않았습니다. 배포할 경우 현재 빌드 결과는 정적 호스팅에 사용할 수 있으며, 기존 실험 앱은 원래 공개 주소로 실행됩니다.
