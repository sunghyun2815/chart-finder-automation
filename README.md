# Chart Finder Automation

GitHub Actions + Manus Agent를 활용한 주간 Spotify 차트 자동화 시스템

## 📁 프로젝트 구조

```
chart-finder-automation/
├── .github/
│   └── workflows/
│       └── weekly-chart-update.yml    # GitHub Actions 워크플로우
├── scripts/
│   ├── scrape-kworb.js               # kworb.net 차트 스크래핑
│   ├── trigger-manus-agent.js        # Manus Agent 크레딧 수집
│   ├── get-youtube-links.js          # YouTube API 링크 수집
│   └── generate-html.js              # HTML 파일 생성
├── templates/
│   └── chart-template.html           # HTML 템플릿
├── dist/                             # 생성된 파일들 (GitHub Pages 배포용)
├── data/                             # 임시 데이터 저장
├── package.json                      # Node.js 의존성
├── .env.example                      # 환경변수 예시
└── README.md                         # 프로젝트 설명
```

## 🚀 기능

- **자동 스케줄링**: 매주 월요일 자동 실행
- **차트 데이터 수집**: kworb.net에서 글로벌 Spotify 주간 차트 1-30위 수집
- **크레딧 정보 수집**: Manus Agent를 통한 TIDAL 크레딧 정보 수집
- **YouTube 링크 수집**: YouTube API를 통한 공식 뮤직비디오 링크 수집
- **HTML 생성**: 레트로 터미널 스타일 웹페이지 자동 생성
- **자동 배포**: GitHub Pages를 통한 웹사이트 자동 업데이트

## 🔧 설정

### 1. GitHub Secrets 설정
- `MANUS_API_KEY`: Manus API 키
- `YOUTUBE_API_KEY`: YouTube Data API v3 키

### 2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일에 API 키들 입력
```

### 3. 의존성 설치
```bash
npm install
```

## 📅 실행 스케줄

- **자동 실행**: 매주 월요일 00:00 UTC
- **수동 실행**: GitHub Actions 탭에서 "Run workflow" 버튼 클릭

## 🎯 출력 결과

- 레트로 터미널 스타일의 웹페이지
- 1위부터 30위까지 차트 정보
- 각 곡의 상세 크레딧 정보
- YouTube 뮤직비디오 임베드
- 반응형 디자인 (모바일/데스크톱 지원)

