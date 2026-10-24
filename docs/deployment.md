# 배포·운영 현황

기준일: **2026-10-24**. 실제 확인한 상태와 후속 확인 사항을 구분하여 기록한다.

## 현재 구성

| 항목 | 현재 상태 |
| --- | --- |
| 공개 주소 | https://sco.pe.kr |
| GitHub 저장소 | https://github.com/Cho-WH/scope-portal |
| 로컬 작업 폴더 | `C:\antigravity\work\edulink` (저장소 이름 변경 후에도 유지) |
| 작업 브랜치 | `main` → `origin/main` |
| 포털 | Astro 7.3.8 + TypeScript, 정적 출력 |
| 호스팅 | Cloudflare Workers Static Assets, 프로젝트 `scope-portal` |
| 도메인 등록·갱신 | 호스팅케이알 |
| DNS 관리 | Cloudflare 네임서버 |
| 루트 도메인 연결 | Worker 사용자 지정 도메인, 프로덕션 대상 |
| 개별 실험 앱 | 기존 공개 주소에서 독립 운영 |

```text
로컬 수정 → GitHub에 푸시 → Cloudflare 빌드 → dist/ 배포
                                                ↓
                                         https://sco.pe.kr
                                                ↓ 실행 링크
                                       개별 실험 앱의 기존 주소
```

로컬 개발 서버를 끄더라도 공개 포털은 계속 제공된다. 도메인을 Cloudflare에 연결한 것은 등록 기관 이전이 아니므로 도메인 갱신은 계속 호스팅케이알에서 관리한다. N100 서버는 현재 포털 제공에 사용하지 않는다.

## 배포 설정

| 설정 | 값 |
| --- | --- |
| 저장소 루트 경로 | `/` |
| Node.js | 24 (`.node-version`, `package.json` engines는 24 이상) |
| 빌드 명령 | `npm run build` |
| 배포 명령 | `npx wrangler deploy` |
| Cloudflare 미리보기 명령 | `npx wrangler preview` |
| 정적 파일 디렉터리 | `./dist` |
| Wrangler 이름 | `scope-portal` |
| compatibility_date | `2026-10-23` |

`wrangler.jsonc`에는 이름·호환 날짜·정적 파일 디렉터리만 선언되어 있다. 사용자 지정 도메인은 Cloudflare 대시보드에서 연결했으며 아직 설정 파일에 선언하지 않았다. 추후 배포 설정을 코드로 옮길 때 이 연결을 함께 확인한다.

GitHub 연결 배포를 사용한다. 설정 과정에서 미리보기 빌드를 켜고 Cloudflare Access 보호는 끈 상태로 진행했다. 빌드용 API 토큰은 Cloudflare에서 자동 생성하는 방식을 사용했으며 토큰 값을 저장소에 넣지 않는다. GitHub 앱에서 저장소가 보이지 않으면 설치된 **Cloudflare Workers and Pages** 앱의 저장소 접근 목록에 `scope-portal`이 포함되어 있는지 확인한다.

## 변경 후 공개하는 순서

1. 도구 정보는 `src/content/tools/`, 자료는 `src/content/resources/`에서 수정한다. 구현 변경은 [유지보수 가이드](maintenance.md)를 따른다.
2. 변경 범위에 맞춰 콘텐츠 검사·타입 검사·빌드를 수행하고, UI나 상호작용 변경에는 해당 브라우저 검증을 추가한다. 문서만 바꿀 때는 앱 전체 테스트를 반복하지 않는다.
3. 변경 내용을 검토하고 커밋·푸시한다. 로컬 저장이나 커밋만으로는 공개 사이트에 반영되지 않는다.
4. Cloudflare `Workers & Pages → scope-portal`에서 배포 대상 브랜치·커밋과 빌드 성공 여부를 확인한다. 프로덕션 브랜치 설정은 대시보드가 기준이다.
5. 공개 주소에서 바뀐 내용과 영향을 받는 링크를 확인한다. Cloudflare 배포 성공과 실제 페이지 확인을 구분한다.

실패하면 빌드 로그의 첫 오류부터 확인한다. 배포 후 문제가 생기면 원인을 확인한 뒤 수정하거나, 해당 변경을 되돌리는 커밋을 만들어 재배포한다. DNS를 이전 IP로 돌리는 것을 일반적인 코드 복구 수단으로 사용하지 않는다.

## 도메인 연결 기록

루트 도메인 추가 시 다음 오류가 발생했다.

```text
Hostname 'sco.pe.kr' already has externally managed DNS records (A, CNAME, etc).
Delete them first or try a different hostname.
```

기존 루트 A 레코드 `99.83.196.71`, `75.2.85.42`가 충돌했다. 사용자가 두 레코드를 삭제하고 Worker에 루트 도메인을 다시 추가한 뒤 HTTPS 접속이 성공했다. 이전 A 레코드를 다시 추가하지 않는다.

DNS 화면에는 `www.sco.pe.kr → sco.pe.kr` CNAME도 있었으며 삭제 대상으로 안내하지 않았다. **이 CNAME만으로 www의 Worker 연결·인증서·리디렉션까지 완료되었다고 간주하지 않는다.** www 지원 여부와 대표 주소로의 이동 정책은 후속 확인 사항이다.

## 빌드 장애와 해결 기록

초기 Linux 빌드에서 `gas: 장면 파일 해시 불일치`로 콘텐츠 검증이 실패했다. Windows에서 생성한 SVG의 CRLF 줄바꿈과 Git에 저장된 LF 줄바꿈이 달라 파일 해시가 바뀐 것이 원인이었다.

- `.gitattributes`에 미리보기 JSON·SVG의 LF 고정과 RGB 바이너리 보존을 추가했다.
- 제작 도구가 문자열을 LF로 정규화한 후 기록·해시 계산하도록 수정했다.
- 장면 데이터를 재생성하고 줄바꿈 회귀 검사를 추가했다.
- 단위 테스트 10개, 정적 빌드 13개 경로, Git 인덱스에 저장된 파일의 해시·크기 일치를 확인했다. 이후 사용자가 Cloudflare 배포 성공을 보고했다.

관련 커밋:

- `fc036eb`: Workers Static Assets 배포 설정 추가.
- `ebc8894`: 플랫폼 간 미리보기 파일 줄바꿈·해시 일치 수정.

## 공개 사이트 확인 결과와 남은 범위

### 기존 GitHub Pages 해제 (2026-10-24)

이전 EduLink의 GitHub Pages 설정(`main`, `/`, legacy 빌드)이 남아 있어 10월 23일의 푸시 3건에서 `pages build and deployment`가 실패했다. Jekyll이 Astro 소스의 코드 구간을 YAML로 해석하여 `Invalid YAML front matter` 오류를 냈다. Cloudflare 빌드 및 앞서 수정한 장면 해시 오류와는 별개다.

사용자 요청에 따라 `Cho-WH/scope-portal`의 GitHub Pages 사이트를 API로 해제했다. 삭제 요청 성공 후 Pages 조회가 404를 반환하는 것을 확인했으며, `https://sco.pe.kr`은 계속 HTTP 200을 반환했다. 다른 실험 앱 저장소의 Pages 설정은 변경하지 않았다. 과거 실패 실행 기록은 남겨 두며, 해제된 기존 Pages 배포를 재실행하지 않는다.

### 공개 연결 확인

2026-10-23에 외부 HTTPS 요청으로 다음을 확인했다.

- `https://sco.pe.kr` 응답: **HTTP 200 OK**, Cloudflare 제공.
- 페이지 제목: **관찰하고 측정하는 과학 | sco.pe.kr**.
- 응답 HTML에 **회로봄·파동의 간섭·게이뤼삭 실험** 콘텐츠 포함.

이는 연결과 HTML 제공 확인이다. 배포된 사이트에서 모든 미리보기 조작·반응형 화면·실물 센서 기능을 새로 검증했다는 뜻은 아니다.

후속 확인 사항:

- 공개 사이트의 데스크톱·모바일 화면과 검색·탭·도구 실행 링크 확인.
- `www.sco.pe.kr` 지원 및 루트 주소로의 리디렉션 여부 결정·검증.
- 기존 EduLink를 가리키던 단축주소를 새 포털로 변경했는지 확인.
- DNSSEC 활성화 상태는 별도로 확인되지 않았다. 이메일 서비스도 이번 배포 범위에서 설정하지 않았다.

포털은 현재 도구 10개·자료 5개, 대표 미리보기 3개를 제공한다. 로그인·수업 관리·서버 저장은 구현하지 않았고 향후 필요에 따라 확장한다. 화면과 모듈 설계는 [아키텍처](architecture.md), 미리보기 제작 원칙은 [미리보기 설계](preview-animation-design.md)를 참고한다.
