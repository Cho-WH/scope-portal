# 포털과 센서 실험실 배포 운영

**배포 변경 주관은 `Cho-WH/scope-portal`이다.** 이 문서는 `sco.pe.kr`과 `lab.sco.pe.kr`의 공통 운영 기준이다. 2026-11-04 기준 두 사이트 모두 Vercel에서 제공하며, 각각 자기 저장소의 `main`에서 빌드한다.

## 변경 소유권

| 변경 | 주관과 기록 위치 |
| --- | --- |
| 호스팅·도메인·DNS·HTTPS, 배포 플랫폼이나 자동 배포 방식 변경, 예비 호스팅 전환·복귀 | 포털 프로젝트가 영향 범위와 복구 방법을 정하고 전환을 주관한다. 두 사이트 중 하나만 바뀌어도 결정과 결과는 여기에 기록한다. |
| 앱 기능·정적 파일 빌드·일상 릴리스 | 각 앱 저장소에서 검증하고 자체 `main`으로 배포한다. 센서 실험실의 경로·QR·저장 자료·펌웨어 검사는 [센서 실험실 배포 안내](https://github.com/Cho-WH/MicrobitSensorDashboard/blob/main/docs/m5-deployment.md)에서 관리한다. |
| 배포 변경에 앱 설정 수정이 필요한 경우 | 포털에서 변경 방향을 정하고 해당 앱 저장소의 설정과 테스트에 반영한다. 공개 주소에서 확인한 뒤 양쪽 문서를 서로 연결한다. |

## 현재 구성

| 서비스 | 운영 주소 | Vercel 프로젝트 | Cloudflare 예비 Worker |
| --- | --- | --- | --- |
| 과학 포털 | [sco.pe.kr](https://sco.pe.kr/) | `scope-portal` | `scope-portal` |
| 센서 실험실 | [lab.sco.pe.kr](https://lab.sco.pe.kr/) | `scope-sensor-lab` | `sensor-lab` |

두 앱 모두 Node 24에서 `npm run build`로 만든 `dist/`를 제공한다. 센서 실험실은 `PUBLIC_BASE_URL=https://lab.sco.pe.kr/`로 공유 주소를 생성한다. 도메인 등록·갱신은 호스팅케이알, DNS는 Cloudflare, 운영 HTTPS 인증서 발급·갱신은 Vercel에서 관리한다.

## 배포 확인과 복구

1. 해당 저장소에서 변경 범위를 검증하고 `main`에 반영한다. Vercel의 해당 프로젝트에서 운영 배포의 커밋과 `Ready` 상태를 확인한다.
2. 포털은 운영 주소에서 검색 → 도구 상세 → 실행 링크를 확인한다. 실험실은 운영 주소에서 입장과 변경된 센서·실험 경로를 확인한다. Cloudflare 예비 빌드 결과는 별도로 확인한다.
3. 앱 변경에 문제가 있으면 해당 사이트의 마지막 정상 Vercel 배포로 복구하고 소스 변경도 정리한다. 호스팅 전환이 필요하면 포털 주관으로 해당 Worker의 버전과 정적 파일을 먼저 확인하고 현재 DNS 값을 기록한다.
4. Cloudflare로 수동 전환할 때는 대상 호스트의 Vercel DNS 레코드를 제거하고 대응하는 Worker의 사용자 도메인으로 연결한다. 복귀할 때는 Worker 도메인 연결을 해제하고 Vercel 프로젝트에 표시된 권장 DNS 값을 `DNS only`로 복원한다. 양방향 모두 같은 공개 주소에서 HTTPS·앱 진입을 확인한다. 실험실의 공개 주소는 QR 링크와 브라우저 저장 자료의 기준이다.

## 2026-11-04 전환 기록

포털 `7d833bb`과 실험실 `d9994b1` 배포 후 두 운영 주소에서 HTTPS 200과 ICN 응답을 확인했다. 당시 루트는 DNS only A 레코드 `216.198.79.1`, `64.29.17.1`, 실험실은 DNS only CNAME `882815932a61bf00.vercel-dns-017.com`이었다. 다음 전환 시에는 Vercel의 당시 권장값을 확인한다. 실험실은 저장한 예시 실험 다시 열기·QR·펌웨어 다운로드까지 확인했고 USB·Bluetooth 실기기 측정은 별도 확인 대상이다. [데스크톱 비교 결과](korea-region-plan.md)

## 이전 Cloudflare 운영 기록 (2026-10)

### 도메인 연결 기록

루트 도메인 추가 시 다음 오류가 발생했다.

```text
Hostname 'sco.pe.kr' already has externally managed DNS records (A, CNAME, etc).
Delete them first or try a different hostname.
```

기존 루트 A 레코드 `99.83.196.71`, `75.2.85.42`가 충돌했다. 사용자가 두 레코드를 삭제하고 Worker에 루트 도메인을 다시 추가한 뒤 HTTPS 접속이 성공했다. 이전 A 레코드를 다시 추가하지 않는다.

DNS 화면에는 `www.sco.pe.kr → sco.pe.kr` CNAME도 있었으며 삭제 대상으로 안내하지 않았다. **이 CNAME만으로 www의 Worker 연결·인증서·리디렉션까지 완료되었다고 간주하지 않는다.** www 지원 여부와 대표 주소로의 이동 정책은 후속 확인 사항이다.

### 빌드 장애와 해결 기록

초기 Linux 빌드에서 `gas: 장면 파일 해시 불일치`로 콘텐츠 검증이 실패했다. Windows에서 생성한 SVG의 CRLF 줄바꿈과 Git에 저장된 LF 줄바꿈이 달라 파일 해시가 바뀐 것이 원인이었다.

- `.gitattributes`에 미리보기 JSON·SVG의 LF 고정과 RGB 바이너리 보존을 추가했다.
- 제작 도구가 문자열을 LF로 정규화한 후 기록·해시 계산하도록 수정했다.
- 장면 데이터를 재생성하고 줄바꿈 회귀 검사를 추가했다.
- 단위 테스트 10개, 정적 빌드 13개 경로, Git 인덱스에 저장된 파일의 해시·크기 일치를 확인했다. 이후 사용자가 Cloudflare 배포 성공을 보고했다.

관련 커밋:

- `fc036eb`: Workers Static Assets 배포 설정 추가.
- `ebc8894`: 플랫폼 간 미리보기 파일 줄바꿈·해시 일치 수정.

### 공개 사이트 확인 결과와 남은 범위

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
