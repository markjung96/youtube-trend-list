import { NextRequest, NextResponse } from "next/server";
import { youtube } from "@googleapis/youtube";

// 동적 라우트로 설정 (searchParams 사용)
export const dynamic = "force-dynamic";

// API 키 라운드로빈 관리를 위한 모듈 레벨 변수
let apiKeyIndex = 0;
let apiKeys: string[] = [];

// API 키 초기화 및 라운드로빈 선택 함수
function getNextApiKey(): string {
  if (apiKeys.length === 0) {
    const apiKeyEnv = process.env.YOUTUBE_API_KEY || "";
    apiKeys = apiKeyEnv
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);

    if (apiKeys.length === 0) {
      throw new Error("YouTube API key is not configured");
    }
  }

  // 라운드로빈: 다음 키 선택
  const selectedKey = apiKeys[apiKeyIndex % apiKeys.length];
  apiKeyIndex = (apiKeyIndex + 1) % apiKeys.length;

  return selectedKey;
}

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      high: {
        url: string;
      };
    };
    channelTitle: string;
    publishedAt: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const maxResults = searchParams.get("maxResults") || "25";
    let regionCode = searchParams.get("regionCode") || "KR";
    const pageToken = searchParams.get("pageToken") || "";
    const videoCategoryId = searchParams.get("videoCategoryId") || "";
    const type = searchParams.get("type") || "popular"; // "popular" or "shorts"
    const dateFilter = searchParams.get("dateFilter") || "all"; // "all", "week", "month", "3months"

    // ISO 3166-1 alpha-2 코드 검증 및 정규화 (대문자로 변환)
    regionCode = regionCode.toUpperCase();

    // 유효한 ISO 3166-1 alpha-2 코드인지 확인 (2자리 대문자)
    if (!/^[A-Z]{2}$/.test(regionCode)) {
      console.warn(`Invalid region code: ${regionCode}, using default: KR`);
      regionCode = "KR";
    }

    // YouTube API가 지원하지 않는 regionCode 목록 (예: CN은 YouTube가 차단된 국가)
    const unsupportedRegions = ["CN"]; // 중국은 YouTube가 차단되어 regionCode 사용 불가
    if (unsupportedRegions.includes(regionCode)) {
      console.warn(`Unsupported region code for YouTube API: ${regionCode}, using default: KR`);
      regionCode = "KR";
    }

    console.log("Received dateFilter:", dateFilter, "Type:", typeof dateFilter);
    console.log("Using regionCode:", regionCode);

    // API 키 가져오기 (라운드로빈)
    let apiKey: string;
    try {
      apiKey = getNextApiKey();
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "YouTube API key is not configured" }, { status: 500 });
    }

    // 사용 가능한 API 키 개수 로그
    if (apiKeys.length > 1) {
      console.log(`Using API key ${apiKeyIndex === 0 ? apiKeys.length : apiKeyIndex}/${apiKeys.length} (라운드로빈)`);
    }

    // YouTube API 클라이언트 초기화
    const youtubeClient = youtube({
      version: "v3",
      auth: apiKey,
    });

    // 날짜 필터 계산
    let publishedAfter: string | null = null;
    if (dateFilter !== "all") {
      const now = new Date();
      const daysMap: Record<string, number> = {
        week: 7,
        month: 30,
        "3months": 90,
      };
      const days = daysMap[dateFilter];
      console.log("Date filter processing:", { dateFilter, days, found: days !== undefined });
      if (days) {
        const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        publishedAfter = pastDate.toISOString();
        console.log("PublishedAfter calculated:", publishedAfter);
      } else {
        console.warn("Date filter not found in daysMap:", dateFilter);
      }
    } else {
      console.log("Date filter is 'all', skipping date filtering");
    }

    let searchDataForPagination: any = null;
    let data: any;

    if (type === "shorts") {
      // 쇼츠: 60초 이하, 조회수 높은 순
      // videoCategoryId는 Search API에서 지원하지 않으므로 클라이언트 측에서 필터링
      // order=viewCount는 Search API에서 지원되지 않음 (채널 검색에만 사용)
      // 따라서 최신순으로 가져와서 서버 측에서 조회수 순으로 정렬

      // 쿼터 최적화: Search API는 가장 비싼 API (100 units/call)
      // 100개 가져와서 조회수 순 정렬 (Search API 2회 호출)
      const targetResults = 100; // 정상 모드: 100개
      const maxResultsPerPage = 50; // YouTube Search API 최대값

      // 지역별 언어 매핑 (ISO 639-1 언어 코드)
      // ISO 3166-1 alpha-2 국가 코드에 대응하는 주요 언어
      const languageMap: Record<string, string> = {
        KR: "ko", // 한국
        US: "en", // 미국
        JP: "ja", // 일본
        GB: "en", // 영국
        CN: "zh", // 중국
        DE: "de", // 독일
        FR: "fr", // 프랑스
        ES: "es", // 스페인
        IT: "it", // 이탈리아
        BR: "pt", // 브라질
        RU: "ru", // 러시아
        IN: "hi", // 인도
        AU: "en", // 호주
        CA: "en", // 캐나다
        MX: "es", // 멕시코
        AR: "es", // 아르헨티나
        ID: "id", // 인도네시아
        TH: "th", // 태국
        VN: "vi", // 베트남
        PH: "en", // 필리핀
        MY: "ms", // 말레이시아
        SG: "en", // 싱가포르
        TW: "zh", // 대만
        HK: "zh", // 홍콩
        TR: "tr", // 터키
        SA: "ar", // 사우디아라비아
        AE: "ar", // 아랍에미리트
        NL: "nl", // 네덜란드
        BE: "nl", // 벨기에
        CH: "de", // 스위스
        AT: "de", // 오스트리아
        SE: "sv", // 스웨덴
        NO: "no", // 노르웨이
        DK: "da", // 덴마크
        FI: "fi", // 핀란드
        PL: "pl", // 폴란드
        PT: "pt", // 포르투갈
        GR: "el", // 그리스
        IL: "he", // 이스라엘
        ZA: "en", // 남아프리카공화국
        NZ: "en", // 뉴질랜드
      };
      const relevanceLanguage = languageMap[regionCode];

      console.log("Region filter applied:", {
        regionCode,
        relevanceLanguage: relevanceLanguage || "not set",
      });

      let allSearchItems: any[] = [];
      let currentPageToken: string | undefined = undefined; // 쇼츠는 페이지네이션 없이 항상 처음부터
      let totalFetched = 0;

      // 쇼츠는 페이지네이션 없이 항상 처음부터 200개를 가져오기 위해 여러 번 호출
      while (totalFetched < targetResults && (currentPageToken || totalFetched === 0)) {
        try {
          const searchResponse = await youtubeClient.search.list({
            part: ["snippet"],
            type: ["video"],
            q: "#Shorts",
            maxResults: maxResultsPerPage,
            order: "date",
            regionCode: regionCode,
            relevanceLanguage: relevanceLanguage,
            pageToken: currentPageToken,
            publishedAfter: publishedAfter || undefined,
          });

          const searchData: any = searchResponse.data;
          const items = searchData.items || [];
          allSearchItems = [...allSearchItems, ...items];
          totalFetched += items.length;

          // 다음 페이지 토큰이 없거나 목표 개수에 도달하면 중단
          if (!searchData.nextPageToken || totalFetched >= targetResults) {
            searchDataForPagination = {
              ...searchData,
              items: allSearchItems,
              nextPageToken: searchData.nextPageToken || undefined,
            };
            break;
          }

          currentPageToken = searchData.nextPageToken;
        } catch (error: any) {
          console.error("YouTube Search API Error:", error);
          // 에러 발생 시 지금까지 가져온 데이터로 진행
          if (allSearchItems.length > 0) {
            searchDataForPagination = {
              items: allSearchItems,
              nextPageToken: undefined,
            };
          }
          break;
        }
      }

      const totalSearchApiCalls = Math.ceil(totalFetched / maxResultsPerPage);
      console.log(
        `Fetched ${totalFetched} videos from Search API (${totalSearchApiCalls} calls, ~${
          totalSearchApiCalls * 100
        } units)`
      );

      // 디버깅: 검색 결과 확인
      console.log("Search API Response:", {
        totalResults: searchDataForPagination?.pageInfo?.totalResults,
        itemsCount: searchDataForPagination?.items?.length,
      });

      // 비디오 ID 추출 및 중복 제거
      const videoIdSet = new Set<string>();
      searchDataForPagination?.items?.forEach((item: any) => {
        const videoId = item.id?.videoId;
        if (videoId) {
          videoIdSet.add(videoId);
        }
      });
      const videoIds = Array.from(videoIdSet);

      if (videoIds.length === 0) {
        console.log("No video IDs found in search results");
        return NextResponse.json({
          videos: [],
          totalResults: 0,
          nextPageToken: searchDataForPagination?.nextPageToken || undefined,
          prevPageToken: searchDataForPagination?.prevPageToken || undefined,
        });
      }

      // 비디오 상세 정보 가져오기
      // 쿼터 최적화: videos.list는 상대적으로 저렴 (1 unit/call)
      // 최대 50개씩 배치로 호출 (API 제한)
      const batchSize = 50;
      const allVideoDetails: any[] = [];
      const totalBatches = Math.ceil(videoIds.length / batchSize);

      console.log(`Fetching video details: ${videoIds.length} videos in ${totalBatches} batch(es)`);

      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        try {
          const videosResponse = await youtubeClient.videos.list({
            part: ["snippet", "statistics", "contentDetails"],
            id: batch,
          });

          const items = videosResponse.data.items || [];
          allVideoDetails.push(...items);

          if (batchNumber % 10 === 0 || batchNumber === totalBatches) {
            console.log(`Progress: ${batchNumber}/${totalBatches} batches completed`);
          }
        } catch (error: any) {
          console.error(`Videos API Error (batch ${batchNumber}/${totalBatches}):`, error);
          // 에러 발생 시 해당 배치만 스킵하고 계속
          continue;
        }
      }

      // 쿼터 사용량 계산 (Search API는 이미 위에서 계산됨)
      const estimatedQuota = totalSearchApiCalls * 100 + totalBatches; // Search: 100 units/call, Videos: 1 unit/call
      console.log(`Fetched ${allVideoDetails.length} video details`);
      console.log(
        `쿼터 사용량 예상: Search API ${totalSearchApiCalls}회 (~${
          totalSearchApiCalls * 100
        } units) + Videos API ${totalBatches}회 (~${totalBatches} units) = 총 ~${estimatedQuota} units`
      );

      // 쇼츠의 경우 allVideoDetails를 직접 사용
      data = { items: allVideoDetails };
    } else {
      // 일반 인기 영상 (mostPopular)
      // 주의: mostPopular API는 날짜 필터링을 지원하지 않음
      try {
        const videosResponse = await youtubeClient.videos.list({
          part: ["snippet", "statistics"],
          chart: "mostPopular",
          regionCode: regionCode,
          maxResults: parseInt(maxResults),
          pageToken: pageToken || undefined,
          videoCategoryId: videoCategoryId || undefined,
        });

        data = videosResponse.data;
      } catch (error: any) {
        console.error("YouTube Videos API Error:", error);

        // regionCode 에러인 경우 더 친화적인 메시지 제공
        if (error.message?.includes("regionCode") || error.message?.includes("invalid region code")) {
          return NextResponse.json(
            {
              error: `지원하지 않는 지역 코드입니다: ${regionCode}. 기본 지역(KR)으로 변경해주세요.`,
              details: error.errors,
              errorCode: "INVALID_REGION_CODE",
              suggestedRegionCode: "KR",
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          {
            error: error.message || "YouTube API error",
            details: error.errors,
          },
          { status: error.code || 500 }
        );
      }
    }

    // 쇼츠인 경우 duration 체크 (60초 이하만)
    // 인기영상인 경우 videoCategoryId 필터링
    let filteredVideos = data.items || [];

    // 인기 영상(mostPopular)은 날짜 필터링을 지원하지 않음
    // mostPopular API는 조회수 기반 인기 차트를 반환하며, 날짜 필터링 파라미터가 없음
    // 따라서 날짜 필터링은 쇼츠에서만 적용됨

    if (type === "shorts") {
      console.log("Filtering videos:", {
        totalVideos: filteredVideos.length,
        videoCategoryId,
        publishedAfter,
      });

      filteredVideos = filteredVideos.filter((video: any) => {
        // 1. 날짜 필터링 (publishedAfter가 있으면)
        if (publishedAfter) {
          const publishedDate = new Date(video.snippet?.publishedAt || "");
          const filterDate = new Date(publishedAfter);
          if (publishedDate < filterDate) {
            return false; // 필터 날짜 이전의 비디오 제외
          }
        }

        // 2. Duration 체크 (60초 이하만)
        const duration = video.contentDetails?.duration || "";
        if (!duration) {
          return false;
        }

        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) {
          return false;
        }

        const hours = parseInt(match[1] || "0");
        const minutes = parseInt(match[2] || "0");
        const seconds = parseInt(match[3] || "0");
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        if (totalSeconds > 60) {
          return false; // 60초 초과 제외
        }

        // 3. 카테고리 필터링 (videoCategoryId가 있으면)
        if (videoCategoryId && video.snippet?.categoryId) {
          if (video.snippet.categoryId !== videoCategoryId) {
            return false;
          }
        }

        return true;
      });

      console.log("Filtered videos count:", {
        before: data.items?.length || 0,
        after: filteredVideos.length,
        dateFilter: publishedAfter ? `After ${publishedAfter}` : "None",
        efficiency: `${((filteredVideos.length / (data.items?.length || 1)) * 100).toFixed(1)}% passed filters`,
      });

      // 쇼츠는 페이지네이션 없이 모든 결과를 반환 (최대 200개)
      // 제한하지 않음
    } else if (type === "popular") {
      // 인기영상은 API 레벨에서 이미 videoCategoryId 필터링됨
      // 추가 필터링이 필요하면 여기서 수행
    }

    // 중복 제거 (같은 ID를 가진 비디오 제거)
    const uniqueVideosMap = new Map<string, YouTubeVideo>();
    for (const video of filteredVideos) {
      if (video.id && !uniqueVideosMap.has(video.id)) {
        uniqueVideosMap.set(video.id, video);
      }
    }
    const uniqueVideos = Array.from(uniqueVideosMap.values());

    // 조회수 기준으로 정렬
    // 주의: 인기 영상(mostPopular)은 이미 API에서 인기 순으로 정렬되어 반환됨
    // 하지만 날짜 필터링 후에는 순서가 달라질 수 있으므로, 날짜 필터가 있으면 조회수 순으로 재정렬
    // 쇼츠는 Search API로 최신순으로 가져오므로 항상 조회수 순으로 정렬 필요
    const videos = uniqueVideos.sort((a: YouTubeVideo, b: YouTubeVideo) => {
      const aViews = parseInt(a.statistics?.viewCount || "0");
      const bViews = parseInt(b.statistics?.viewCount || "0");
      return bViews - aViews;
    });

    // 쇼츠의 경우 search API에서 가져온 페이지네이션 정보 사용
    let nextToken: string | undefined;
    let prevToken: string | undefined;
    let totalCount: number;

    if (type === "shorts") {
      // 쇼츠는 페이지네이션 없이 모든 결과를 반환
      nextToken = undefined;
      prevToken = undefined;
      totalCount = filteredVideos.length;
    } else {
      nextToken = data.nextPageToken || undefined;
      prevToken = data.prevPageToken || undefined;
      totalCount = data.pageInfo?.totalResults || videos.length;
    }

    return NextResponse.json({
      videos: videos.map((video: YouTubeVideo) => ({
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.high.url,
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        viewCount: parseInt(video.statistics?.viewCount || "0"),
        likeCount: parseInt(video.statistics?.likeCount || "0"),
        commentCount: parseInt(video.statistics?.commentCount || "0"),
        url: `https://www.youtube.com/watch?v=${video.id}`,
      })),
      totalResults: totalCount,
      nextPageToken: nextToken,
      prevPageToken: prevToken,
      // 디버그 정보 (개발 환경에서만)
      ...(process.env.NODE_ENV === "development" && {
        debug: {
          dateFilter,
          publishedAfter,
          regionCode,
          type,
          videoCategoryId,
        },
      }),
    });
  } catch (error: any) {
    console.error("YouTube API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch YouTube videos",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
