# YouTube 인기 영상 리스트

유튜브에서 조회수가 높은 인기 영상들을 리스트업하여 볼 수 있는 웹 애플리케이션입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **API**: YouTube Data API v3

## 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 YouTube API 키를 설정하세요:

```bash
# .env 파일에 직접 추가
YOUTUBE_API_KEY=your_youtube_api_key_here
```

`.env` 파일에 `YOUTUBE_API_KEY`에 본인의 YouTube Data API v3 키를 입력하세요.

#### YouTube API 키 발급 방법

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스** > **라이브러리**로 이동
4. "YouTube Data API v3" 검색 후 활성화
5. **API 및 서비스** > **사용자 인증 정보**로 이동
6. **사용자 인증 정보 만들기** > **API 키** 선택
7. 생성된 API 키를 `.env` 파일에 입력

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
youtube-listup/
├── app/
│   ├── api/
│   │   └── youtube/
│   │       └── route.ts      # YouTube API 프록시
│   ├── layout.tsx            # 루트 레이아웃
│   ├── page.tsx              # 메인 페이지
│   ├── providers.tsx         # React Query Provider
│   └── globals.css           # 글로벌 스타일
├── components/
│   ├── video-card.tsx        # 영상 카드 컴포넌트
│   └── video-list.tsx        # 영상 리스트 컴포넌트
├── lib/
│   ├── types.ts              # TypeScript 타입 정의
│   └── utils.ts              # 유틸리티 함수
└── package.json
```

## 주요 기능

- ✅ 조회수 기준 인기 영상 목록 표시
- ✅ 영상 썸네일, 제목, 채널명 표시
- ✅ 조회수, 좋아요, 댓글 수 표시
- ✅ 반응형 디자인 (모바일, 태블릿, 데스크톱)
- ✅ 다크 모드 지원
- ✅ YouTube 영상 링크 연결

## 향후 확장 가능한 기능

- [ ] 검색 기능 (키워드로 영상 검색)
- [ ] 카테고리별 필터링
- [ ] 정렬 옵션 (조회수, 최신순, 좋아요 등)
- [ ] 지역별 인기 영상 선택
- [ ] 영상 상세 정보 모달
- [ ] 무한 스크롤 또는 페이지네이션
- [ ] Supabase 연동 (데이터 저장 및 사용자 기능)

## 배포

Vercel을 사용하여 배포하는 것을 권장합니다:

1. GitHub에 프로젝트 푸시
2. [Vercel](https://vercel.com)에 로그인
3. 새 프로젝트 import
4. **환경 변수 설정** (중요!)
   - Vercel 대시보드 > 프로젝트 설정 > Environment Variables
   - `YOUTUBE_API_KEY` 추가 (프로덕션, 프리뷰, 개발 모두 선택)
5. 배포 완료!

### Vercel 배포 시 주의사항

- `vercel.json` 파일이 자동으로 pnpm을 사용하도록 설정되어 있습니다
- 환경 변수는 Vercel 대시보드에서 설정해야 합니다 (`.env` 파일은 로컬 개발용)
- 빌드 후 자동으로 배포됩니다

## 라이선스

MIT

# youtube-trend-list
