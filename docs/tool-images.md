# 도구 대표 이미지

2026-10-15, 공개 앱을 별도의 임시 브라우저 세션에서 열어 캡처했다. 결과 파일은 `public/images/tools/`에 보관한다. 배너의 계산 데이터와 대체 포스터는 별도로 제작한다.

| 파일 | 실행 화면 출처 | 캡처 상태 |
| --- | --- | --- |
| `circuit.jpg` | https://cho-wh.github.io/circuit/ | 빠른 시작 닫기 → 분석하기 → 3D. 기본 직렬 회로의 전위 화면 |
| `waves.jpg` | https://cho-wh.github.io/interference/ | 일시 정지 후 파동·파원·관측점 영역 |
| `gas.jpg` | https://cho-wh.github.io/bme280/gay-lussac/ | 시작 화면의 실험 장치 그림 |
| `cds.jpg` | https://cho-wh.github.io/CdS/ | 해당 페이지의 `cds2d.png` 배선도 요소를 캡처 |
| `sound.jpg` | https://cho-wh.github.io/MFGko/ | 재생 전 좌우 채널의 주파수·볼륨·위상 설정 영역 |
| `mag.jpg` | https://cho-wh.github.io/MagnetometerBit/ | 장치 연결 전 대시보드, 측정값 없음 |
| `malus.jpg` | https://cho-wh.github.io/MalussBit/ | 장치 연결 전 측정 제어·피팅 화면, 측정값 없음 |
| `bme.jpg` | https://cho-wh.github.io/bme280/ | 장치 연결 전 대시보드, 측정값 없음 |
| `sensor.jpg` | https://cho-wh.github.io/MicrobitSensorDashboard/ | 장치 연결 전 대시보드, 측정값 없음 |

소리 주파수 분석기(`peak`)는 마이크 대기와 빈 그래프만 표시되어 대표 이미지를 등록하지 않았다. 카드의 공통 플레이스홀더를 사용한다. 마이크·Bluetooth·USB 권한을 부여하지 않았고 측정 데이터를 합성하지 않았다. 센서 앱 이미지는 실제 측정 장면을 확보하면 교체할 수 있다.

촬영 화면은 실제 앱의 현재 모양을 소개하기 위한 것이다. 전체 기능이나 실물 장치 동작의 검증 결과를 뜻하지 않는다.

## 배너 장면과 대체 포스터

`public/previews/{scene}/1/`과 `public/images/previews/{scene}-final.svg`는 캡처 영상이 아니라 제작 스크립트의 출력이다. 원본 커밋은 각 manifest와 `tools/preview-bake/sources.lock.json`에 기록한다.

| 장면 | 출처·가공 |
| --- | --- |
| circuit | Cho-WH/circuit의 FIX-04 배치와 실제 이상적 DC 계산. 원본 전위색·높이·3D 카메라 방향을 투영해 SVG 경로·자세로 저장. 원본 기호를 좌표로 재구성하고 배너 구도에 맞게 크기 조정 |
| waves | Cho-WH/interference의 정상 상태 엔진. 경로차 λ/2인 P에서 하나의 물리 시각만 샘플링한 RGB 파동장·두 경로 파형. 전파·진동을 재생하지 않음 |
| gas | Cho-WH/bme280의 gay-lussac/assets/setup.svg와 analysis/regression.js. 장비의 구조를 보존하고 색·하단 설명을 배너용으로 조정. 온도·압력 점은 명시적인 합성 예시이며 실제 측정 자료가 아님 |

포스터는 완료 장면의 요약이며, 재생 중인 동적 화면과 세부 표시가 완전히 동일한 스크린샷은 아니다. 기존 더미 이미지 파일은 호환성을 위해 남아 있지만 세 대표 배너는 새 포스터를 참조한다.
