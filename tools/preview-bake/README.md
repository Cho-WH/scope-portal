# 미리보기 데이터 제작

원본 앱의 계산을 Node에서 실행해 정적 장면 데이터를 만든다. 포털은 이 결과만 사용한다. 이 폴더의 의존성은 루트 앱과 분리되어 있으며, 배포 빌드에 Three.js·원본 해석기·esbuild를 포함하지 않는다. 일반 포털 빌드는 이미 저장된 `public/previews/`를 검증·복사할 뿐이다.

## 재생성

1. Node 24 이상에서 `npm ci --prefix tools/preview-bake --ignore-scripts`를 실행한다.
2. `sources.lock.json`의 저장소를 `.local/preview-sources/circuit`, `interference`, `bme280`에 복제하고 각 기록된 commit을 checkout한다. 다른 위치는 `PREVIEW_SOURCE_DIR` 환경 변수로 지정한다. 세 복제본의 상위 폴더를 가리켜야 한다.
3. 원본 파일을 수정하지 않는다. `build.mjs`가 HEAD와 tracked 파일의 변경 여부를 검사한다. 얕은 복제본에 해당 커밋이 없으면 해당 커밋을 fetch한 뒤 checkout한다.
4. 루트에서 `node tools/preview-bake/build.mjs`를 실행한다.
5. `npm run validate:content`, `npm test`, `npm run check`, `npm run build`를 실행하고 배너의 시작·전환·완료 구도를 확인한다.

원본 복제본과 제작 중간 번들은 `.local/`에만 놓인다. 배포에는 `public/previews/`의 결과와 포스터만 들어간다. 동일 입력·소스·도구 버전이면 파일 내용은 같으며 생성 시각을 넣지 않는다.

## 파일 책임

- `sources.lock.json`: 원본 URL·커밋 고정.
- `scenes.ts`: 제작 입력과 원본 함수 어댑터, 계산값 검증, 좌표·포스터 추출. 원본 API가 바뀌면 여기서 대응한다.
- `build.mjs`: 소스 확인과 제작 스크립트 번들링.
- `package-lock.json`: 제작 의존성 고정. 포털의 루트 lock과 별개.
- `public/previews/{scene}/{revision}/manifest.json`: 파일 크기·SHA-256·원본 커밋·물리 입력 해시·제작 형식 버전.

## 장면의 입력과 확인 조건

회로는 FIX-04 예제의 12V 전원, 직렬 2Ω와 병렬 3Ω·6Ω다. 원본 `compileCircuit`·`solveCircuit`를 실행하고 12/6/0V, 3/2/1A를 fixture 기대값과 대조한다. 36개의 같은 도형 ID를 가진 자세로 변환하며, 3D 재질·조명 대신 기호와 전위색을 보존한 선으로 표시한다. 원본 카메라의 빈 바닥 영역은 배너 프레이밍에서 제외한다. 숫자 라벨은 어두운 배경에서 읽히도록 중립색을 쓴다.

파동은 원본 기본 두 파원·파장을 사용한다. x=0.85m에서 경로차가 0.075m인 관측점 y를 제작 시 찾고 정상 상태를 샘플링한다. 경로차 λ/2, 합성 진폭 0, 경로 끝 변위와 관측점 성분 변위의 일치를 검사한다. 고정 필드는 384×205 RGB이고 런타임에서 한 번만 Canvas로 변환한다. 경로 좌표의 회전·이동 중 파동 위상이나 물리 시간은 갱신하지 않는다.

기체는 20–50°C의 12개 예시 온도와 고정된 오차 목록을 사용한다. 원본 `linearFit`·`predict`로 회귀하고 양의 기울기와 R²>0.99를 확인한다. 압력은 hPa이며, 합성 입력이라는 정보는 데이터와 접근성 설명에 남긴다. 배너에는 설명 문구를 표시하지 않는다. 장비 SVG는 원본에서 색과 하단 설명만 조정한다. 전지와 micro:bit가 밀폐 용기 안에 있는 구조를 유지한다.

## 갱신과 확장

현재 첫 제작 버전은 `1`이다. 공개 배포 후 데이터를 바꾸면 `scenes.ts`의 출력·참조 경로에 새 revision을 사용하고 콘텐츠 JSON도 함께 갱신한다. 포스터도 새 파일명을 사용한다. 이전 버전 파일은 기존 클라이언트가 사용할 수 있도록 유지한다. 생성 파일을 수작업으로 편집하면 해시 검사가 실패한다.

새 장면은 제작 함수뿐 아니라 `src/features/preview/types.ts`의 데이터 타입, `scenes/` 렌더러, 공통 제어기의 factory 등록, 콘텐츠 스키마의 scene 목록, `scripts/preview-validation.ts`를 함께 확장한다. 물리 계산은 이 제작 도구에만 둔다. 시간 제어·화면 밖 정지·모바일 정책은 공통 제어기에서 담당한다.
