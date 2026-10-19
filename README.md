# CursorUsageViewer

Cursor 사용량 CSV 뷰어. CSV 데이터는 서버에 전송하지 않고 브라우저 메모리에서만 분석합니다.

## 시작하기

Node.js 22.12 이상이 필요합니다.

```sh
npm install
npm run dev
```

프로덕션 빌드와 미리보기:

```sh
npm run build
npm run preview
```

코드 검사 및 테스트:

```sh
npm run check
npm run lint
npm test
```

## 입력 CSV

Cursor 사용량 CSV의 `Date`, `Kind`, `Model`과 아래 토큰 열이 필요합니다.

- `Input` ← `Input (w/o Cache Write)`
- `CacheRead` ← `Cache Read`
- `CacheWrite` ← `Input (w/ Cache Write)`
- `Output` ← `Output Tokens`

`Total Tokens`는 네 시리즈 합계의 검증에만 사용합니다. `Kind`는 사용 유형이며 `Cost` 열의 값을 사용 유형으로 해석하지 않습니다. 숫자가 비어 있거나 올바르지 않은 토큰이 있는 행은 차트 집계에서 제외되고 CSV 검증 결과에 기록됩니다. 합계 불일치는 해당 행을 유지하고 경고합니다.

업로드는 CSV 파일을 선택하거나 대시보드에 끌어다 놓아 이용합니다. 지원 용량은 100MB까지입니다. 기본 시간대는 Asia/Seoul이며 UTC를 선택할 수 있습니다. 시간 차트의 주 단위는 월요일부터 시작합니다.

## 기술 스택

React 19, TypeScript 5.9, Redux 3.6, Vite 7.3, Tailwind CSS 4.1, shadcn/ui 컴포넌트, Apache ECharts.
