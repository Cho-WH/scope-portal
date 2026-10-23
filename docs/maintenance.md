# 유지보수 가이드

## 먼저 확인할 위치

| 바꾸려는 것 | 파일 |
| --- | --- |
| 도구 이름·설명·준비물·실행 주소 | `src/content/tools/{id}.json` |
| 대표 도구와 배너 문구 | 해당 도구 파일의 `featured` |
| 정적 미리보기 포스터 | 해당 도구 파일의 `preview`, `public/images/previews/` |
| 장면 재생·일시 정지·반응형 정책 | `src/features/preview/controller.ts` |
| 장면별 표현 | `src/features/preview/scenes/` |
| 계산 데이터·포스터 재생성 | `tools/preview-bake/`와 해당 README |
| 목록 대표 이미지 | 해당 도구 파일의 `thumbnail`, `public/images/tools/` |
| 자료와 도구의 연결 | `src/content/resources/{id}.json` |
| 주제와 활동 분류 | `src/lib/catalog/taxonomy.ts` |
| 허용 필드·자료 형식 | `src/lib/catalog/schema.ts` |
| 3열·2열 카드 모듈 | `src/components/catalog/FeaturedToolCard.astro`, `CompactToolCard.astro` |
| 공통 카드 내용·이미지 | `src/components/catalog/ToolCard.astro`, `ToolImage.astro` |
| 공통 상세 소개 | `src/features/tool-detail/ToolDetail.astro` |
| 검색·필터 | `src/features/catalog/`와 `src/lib/catalog/search.ts` |
| 대표 소개 배너 | `src/features/featured/` |
| 색·글꼴·공통 치수 | `src/styles/tokens.css`, `src/styles/global.css` |

## 도구 추가

1. `npm run new:tool -- pendulum`을 실행한다.
2. `src/content/tools/pendulum.json`에 확인한 설명, 준비물, 지원 환경, 실제 실행 URL을 입력한다.
3. 주제는 `topics`, 활동은 `activity`, 검색 동의어는 `keywords`에 넣는다. 장비는 분류 대신 `equipment`에 적는다.
4. 공개 준비가 끝나면 `draft`를 `false`로 바꾼다. 초안은 목록과 경로에서 제외된다.
5. `npm run validate:content`, `npm run check`, `npm run build`로 검증한다.
6. 목록과 `/tools/pendulum/`를 확인한다. 도구별 페이지 파일을 새로 만들 필요가 없다.

파일명은 공개 ID다. 영문 소문자·숫자·하이픈만 사용하며, 공개 후에는 실행 주소가 변경되어도 파일명을 유지한다. ID를 바꿔야 한다면 기존 경로의 리디렉션을 별도로 설계한다.

`order`는 목록 순서다. 같은 값이면 ID 순서로 정렬된다. 첫 3개는 3열 큰 이미지형, 나머지는 2열 오른쪽 이미지형으로 표시한다. 배너의 `featured.order`는 이 목록 순서와 독립적이다. 확인되지 않은 학년·소요 시간·지원 브라우저·완성도는 임의로 추가하지 않는다.

## 목록 대표 이미지

실제 앱 실행 화면을 캡처하여 `public/images/tools/`에 저장하고 다음 선택 필드를 등록한다. 배너 미리보기와 별개이며 모바일에서도 표시된다.

```json
"thumbnail": {
  "src": "/images/tools/example.jpg",
  "alt": "실제 화면의 내용과 연결 상태를 설명하는 문장",
  "width": 1280,
  "height": 800,
  "fit": "cover"
}
```

`width`, `height`는 실제 파일 치수다. 화면을 자르지 않으려면 `contain`, 영역을 채우려면 `cover`를 사용한다. `thumbnail`을 생략하면 공통 플레이스홀더가 자동 표시된다. 빈 파일이나 존재하지 않는 경로를 넣지 않는다. 출처·촬영 상태는 `docs/tool-images.md`에 남기고, 센서 데이터가 없는 화면에 가짜 측정값을 채워 넣지 않는다.

현재 목록의 배경형 이미지는 `fit` 대신 `cover`를 사용한다. `thumbnail`에 `"focalPoint": { "x": 70, "y": 40 }`을 추가하면 크롭 기준점을 조절할 수 있다(0–100%, 기본 50/50). 이 값은 `object-position`에 대응한다. 사진은 페이드 영역 전체를 채우고, 기준점은 그 안에서 중요한 내용이 보이도록 조정한다. 사진 영역 자체를 이동하면 페이드와 실제 이미지의 끝이 어긋날 수 있으므로 여백으로 구도를 조정하지 않는다. 원본 파일은 다시 편집할 필요가 없다.

## 대표 도구 배너

대표로 소개할 도구 파일에 다음 필드를 추가한다. 보통 2–3개를 선별한다.

```json
"featured": {
  "order": 20,
  "shortLabel": "파동",
  "headline": "두 파동은 어디에서 만날까요?",
  "description": "관측점을 옮겨 두 경로의 차이를 비교하세요."
}
```

`order`는 대표 도구끼리 중복되지 않아야 한다. `shortLabel`은 모바일의 작은 하단 선택 글씨다. 선택 시 밑줄이 이동하고 동작 줄이기 설정을 존중한다. 자동 순환은 하지 않는다. `headline`, `description`에서 `\n`으로 시안의 줄바꿈을 지정할 수 있다.

미리보기는 생략할 수 있다. 정적 소개만 필요하면 다음 형식을 사용한다.

```json
"preview": {
  "kind": "placeholder",
  "poster": {
    "src": "/images/previews/example.svg",
    "alt": "이미지의 내용을 설명하는 문장",
    "width": 520,
    "height": 230,
    "fit": "contain"
  }
}
```

포스터는 `public/images/previews/`에 넣거나 기존 현상 이미지를 참조한다. 앱 전체 화면보다 현상 중심의 이미지를 선택한다. 투명 배경의 SVG 개념 그림은 `contain`, 넓게 펼치는 현상 이미지는 `cover`를 사용한다. 선택 필드 `focalPoint`로 구도를 조절할 수 있다. 배너는 공통 페이드와 고정된 높이를 사용하며 모바일에서는 더미 영역도 만들지 않는다. 실제 이미지 파일이 없으면 콘텐츠 검사가 실패한다.

계산 결과를 저장한 애니메이션은 다음처럼 등록한다. 현재 `scene`은 `circuit`, `waves`, `gas`를 지원한다.

```json
"preview": {
  "kind": "baked-scene",
  "scene": "waves",
  "revision": "1",
  "manifest": "/previews/waves/1/manifest.json",
  "poster": {
    "src": "/images/previews/waves-final.svg",
    "alt": "정상 상태에서 두 경로를 펼쳐 반파장 경로차를 비교하는 장면",
    "width": 1200,
    "height": 480,
    "fit": "contain"
  }
}
```

장면 파일을 직접 수정하지 않고 [제작 도구 안내](../tools/preview-bake/README.md)에 따라 재생성한다. 일반 `npm ci`·빌드는 원본 앱 복제본이나 제작 도구 설치를 요구하지 않는다. `validate:content`가 manifest·출처 커밋·파일 크기·해시·좌표 대응·파동장 크기를 확인한다. 배포된 데이터를 변경할 때에는 새 revision으로 경로를 바꾸고 이전 파일을 유지한다. 회로 36개 자세의 도형 순서·점 개수를 일치시켜야 보간할 수 있다.

원본 물리 계산을 포털 컴포넌트에 넣지 않는다. 새 장면은 `types.ts`, `controller.ts`의 factory 목록, 장면 렌더러, 제작 함수와 검증을 함께 추가한다. 화면은 `renderAt(timeMs)`로 결정하고 `dispose()`로 해제한다. 장면별 타이머나 자동 반복을 추가하지 않는다. 파동의 물리 시간은 저장된 한 시각으로 고정한다. 기체의 합성 입력 출처는 접근성 설명과 제작 데이터에 남기며 배너의 설명 문구는 생략한다.

## 수업 자료 추가

`src/content/resources/`에 JSON 파일을 추가한다.

```json
{
  "title": "활동지 이름",
  "description": "무엇에 쓰는 자료인지 설명",
  "kind": "worksheet",
  "url": "https://실제-자료-주소.example/",
  "toolIds": ["circuit"],
  "order": 60,
  "draft": false,
  "showOnHome": false
}
```

예제 URL을 실제 HTTPS 주소로 바꾼다. `kind`는 `worksheet`, `teacher-guide`, `setup-guide`, `language-version` 중 하나다. `toolIds`에 여러 도구를 연결할 수 있다. 공개 자료는 존재하는 공개 도구만 참조해야 한다. `showOnHome`이 `true`인 자료는 홈에도 노출되며, 나머지는 전체 자료와 해당 도구 상세에 표시된다.

## 분류 확장

새 과학 분야는 `taxonomy.ts`의 `topics`에 안정적인 ID와 표시 이름을 추가한다. 스키마·필터가 이 정의를 같이 사용하므로 카드나 필터 HTML을 별도로 수정하지 않는다. 기존 ID를 삭제하거나 이름을 바꿀 때에는 사용 중인 콘텐츠와 공유된 URL의 영향을 확인한다.

새로운 콘텐츠 형식이 필요하면 스키마부터 변경한다. 표현 차이만 있다면 컴포넌트를 개선하고, 별도 데이터·상태·생명주기를 가진 기능에 한해서 `features/`에 새 모듈을 만든다. 새 도구마다 기능 모듈을 만들지는 않는다.

스키마에 필드를 추가한 뒤 개발 서버가 `Unrecognized key`를 표시하거나 이전 콘텐츠를 유지하면 `npm run dev`를 재시작한다. 일반적인 도구 JSON 수정은 자동 반영되지만, 분리된 스키마 모듈 변경은 재시작이 필요할 수 있다.

## 검증

```sh
npm run validate:content
npm run check
npm test
npm run build
npm run test:e2e
```

- 콘텐츠 검사: 필수 필드·HTTPS 주소 형식·분류·대표 순서·자료 참조·로컬 이미지·장면 해시와 좌표.
- 단위 검사: 한글/영문 검색, 복합 조건, URL 왕복, 초안·잘못된 참조 차단, 장면 파일의 일관성과 경로차·상쇄 조건.
- 브라우저 검사: 검색과 한글 조합, 상세 이동·뒤로 가기, 키보드 탭·밑줄 이동, 3열/2열 배치와 초기화, 이미지 로딩·플레이스홀더, 모바일 배너 이미지 요청 없음, 반응형·다크 모드, 자바스크립트 없는 기본 링크.
- 원격 실험 앱의 모든 기능이나 실제 센서 동작까지 검증하는 것은 아니다.
- 미리보기 브라우저 검사: 탭 전환·일시 정지·재개·종료·재생, 고정 파동장, 화면 밖 정지, 동작 줄이기·태블릿 포스터, 요청 실패·재시도, 늦은 응답 폐기.

브라우저 검사는 `dist/`를 4322 포트에서 제공하고 종료 시 테스트 서버를 정리한다. Windows는 Edge를 사용한다. 화면 확인 파일은 `.local/qa/`에 생성되며 Git에 포함하지 않는다.

## 빌드와 배포 경계

`npm run build` 결과는 `dist/`다. `wrangler.jsonc`는 Cloudflare Workers Static Assets에 이 폴더만 배포한다. `backups/`, `.agents/`, `docs/`, 테스트 결과를 배포하지 않는다. `.node-version`은 Node 24를 지정한다. 대시보드 프로젝트 이름은 `scope-portal`, 빌드 명령은 `npm run build`, 배포 명령은 `npx wrangler deploy`, 미리보기 명령은 `npx wrangler preview`를 사용한다. 저장소 루트에서 실행하며, 실제 배포 성공과 사용자 지정 도메인 활성화는 대시보드에서 별도로 확인한다.

실험 앱 주소를 옮기기 전에는 기존 공유 링크, 브라우저 저장 데이터와 기기 권한을 별도로 확인한다. 포털에 새 링크를 등록하는 것만으로 해당 데이터가 옮겨지지는 않는다.
