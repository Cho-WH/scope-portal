# EduLink

Cho-WH의 수업용 HTML 도구와 실험 자료를 모아 보여주는 정적 링크 허브입니다.

## 구조

```text
.
├── index.html
├── assets/
│   ├── app.js
│   └── styles.css
├── data/
│   └── tools.js
└── docs/
    └── maintenance.md
```

- `index.html`: 페이지 뼈대와 접근성 레이블을 관리합니다.
- `data/tools.js`: 도구 목록, 링크, 태그, 분류를 관리합니다.
- `assets/app.js`: 검색, 필터, 카드 렌더링 로직을 담당합니다.
- `assets/styles.css`: 레이아웃, 반응형 스타일, 카드 톤을 담당합니다.

## 도구 추가

새 도구는 `data/tools.js`의 `window.EDULINK_TOOLS` 배열에 객체를 하나 추가합니다.

```js
{
  id: "unique-id",
  name: "도구 이름",
  description: "카드에 표시할 한두 문장 설명",
  categories: ["microbit", "sensor"],
  tags: ["micro:bit", "센서"],
  tone: "teal",
  marker: "ABC",
  status: "실험 도구",
  primaryUrl: "https://cho-wh.github.io/example/",
  sourceUrl: "https://github.com/Cho-WH/example"
}
```

분류를 추가할 때는 `window.EDULINK_CATEGORIES`에도 같은 `id`를 추가해야 필터 버튼이 표시됩니다.