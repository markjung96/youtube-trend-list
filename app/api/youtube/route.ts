import { NextRequest, NextResponse } from "next/server";
import { youtube } from "@googleapis/youtube";

export const dynamic = "force-dynamic";

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
  contentDetails?: {
    duration: string;
  };
}

// ISO 8601 duration을 초로 변환
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const maxResults = searchParams.get("maxResults") || "25";
    const pageToken = searchParams.get("pageToken") || "";
    const type = searchParams.get("type") || "popular"; // "popular" or "shorts"
    const regionCode = searchParams.get("regionCode") || "KR"; // 국가 코드
    const dateFilter = searchParams.get("dateFilter") || "all"; // 날짜 필터
    const sortOrder = searchParams.get("sortOrder") || "date"; // 정렬 순서

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "YouTube API key is not configured" }, { status: 500 });
    }

    const youtubeClient = youtube({
      version: "v3",
      auth: apiKey,
    });

    let videos: any[] = [];
    let nextToken: string | undefined;
    let prevToken: string | undefined;
    let totalResults: number;

    if (type === "shorts") {
      // Shorts 검색: search.list 사용
      console.log("Fetching Shorts...");

      // 지역별 검색 키워드 매핑
      const searchKeywordMap: Record<string, string> = {
        KR: "쇼츠",
        US: "shorts",
        JP: "ショート",
      };

      // 지역별 언어 매핑
      const languageMap: Record<string, string> = {
        KR: "ko",
        US: "en",
        JP: "ja",
      };

      const searchKeyword = searchKeywordMap[regionCode] || "shorts";
      const relevanceLanguage = languageMap[regionCode];

      // 날짜 필터 계산
      let publishedAfter: string | undefined = undefined;
      const now = new Date();
      console.log(`[Date Filter Debug] Current time: ${now.toISOString()}`);
      console.log(`[Date Filter Debug] Requested dateFilter: ${dateFilter}`);

      const daysMap: Record<string, number> = {
        today: 1,
        week: 7,
        month: 30,
        "3months": 90,
      };
      const days = daysMap[dateFilter];
      if (days) {
        const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        publishedAfter = pastDate.toISOString();
        console.log(`[Date Filter Debug] Calculated publishedAfter: ${publishedAfter} (${days} days ago)`);
      } else {
        console.log(`[Date Filter Debug] No valid days found for dateFilter: ${dateFilter}`);
      }

      // sortOrder에 따라 API order 파라미터 설정
      // - "popular": relevance (관련성 높은 = 보통 인기있는 영상 우선)
      // - "date": date (최신순)
      const apiOrder = sortOrder === "popular" ? "relevance" : "date";

      const searchParams = {
        part: ["snippet"],
        q: searchKeyword,
        type: ["video"],
        videoDuration: "short", // ≤4분
        order: apiOrder,
        regionCode: regionCode,
        relevanceLanguage: relevanceLanguage,
        maxResults: 50,
        pageToken: pageToken || undefined,
        publishedAfter: publishedAfter,
      };

      console.log(`[API Order] sortOrder: ${sortOrder} → API order: ${apiOrder}`);

      console.log("=== YouTube API Search Params ===");
      console.log(JSON.stringify(searchParams, null, 2));

      const searchResponse = await youtubeClient.search.list(searchParams);

      const searchData = searchResponse.data;
      const videoIds = (searchData.items || []).map((item: any) => item.id?.videoId).filter(Boolean);

      console.log(`Found ${videoIds.length} video IDs from search`);

      if (videoIds.length > 0) {
        // 비디오 상세 정보 가져오기 (duration 확인을 위해)
        const videosResponse = await youtubeClient.videos.list({
          part: ["snippet", "statistics", "contentDetails"],
          id: videoIds,
        });

        // 60초 이하만 필터링
        const filteredVideos = (videosResponse.data.items || []).filter((video: any) => {
          const duration = video.contentDetails?.duration;
          if (!duration) return false;
          const seconds = parseDuration(duration);
          return seconds <= 60;
        });

        console.log(`Filtered to ${filteredVideos.length} shorts (≤60s)`);

        // 날짜 범위 확인
        if (filteredVideos.length > 0) {
          const dates = filteredVideos
            .map((v: any) => new Date(v.snippet?.publishedAt || 0))
            .sort((a, b) => a.getTime() - b.getTime());
          const oldest = dates[0];
          const newest = dates[dates.length - 1];
          console.log(`=== Date Range ===`);
          console.log(`Oldest video: ${oldest.toISOString()}`);
          console.log(`Newest video: ${newest.toISOString()}`);
          console.log(`Range: ${Math.floor((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24))} days`);
        }

        // 정렬 전 상위 3개 영상 정보 출력 (디버깅용)
        if (filteredVideos.length > 0) {
          console.log("=== Top 3 videos BEFORE sorting ===");
          filteredVideos.slice(0, 3).forEach((v: any, i: number) => {
            console.log(`${i + 1}. [${v.id}] ${v.snippet?.title?.substring(0, 50)}...`);
            console.log(`   Published: ${v.snippet?.publishedAt}`);
            console.log(`   Views: ${v.statistics?.viewCount}`);
          });
        }

        // 정렬 적용
        if (sortOrder === "popular") {
          // 인기순: 조회수 내림차순
          filteredVideos.sort((a: any, b: any) => {
            const aViews = parseInt(a.statistics?.viewCount || "0");
            const bViews = parseInt(b.statistics?.viewCount || "0");
            return bViews - aViews;
          });
          console.log("Sorted by popularity (viewCount)");
        } else {
          // 최신순: publishedAt 내림차순
          filteredVideos.sort((a: any, b: any) => {
            const aDate = new Date(a.snippet?.publishedAt || 0).getTime();
            const bDate = new Date(b.snippet?.publishedAt || 0).getTime();
            return bDate - aDate;
          });
          console.log("Sorted by date (newest first)");
        }

        // 정렬 후 상위 3개 영상 정보 출력 (디버깅용)
        if (filteredVideos.length > 0) {
          console.log("=== Top 3 videos AFTER sorting ===");
          filteredVideos.slice(0, 3).forEach((v: any, i: number) => {
            console.log(`${i + 1}. [${v.id}] ${v.snippet?.title?.substring(0, 50)}...`);
            console.log(`   Published: ${v.snippet?.publishedAt}`);
            console.log(`   Views: ${v.statistics?.viewCount}`);
          });
        }

        // 쇼츠는 필터링된 모든 결과를 반환 (보통 50개 미만)
        videos = filteredVideos;
      }

      // 쇼츠는 페이지네이션 없이 모든 결과를 한 번에 표시
      nextToken = undefined;
      prevToken = undefined;
      totalResults = videos.length;
    } else {
      // 일반 인기 동영상: videos.list 사용
      const response = await youtubeClient.videos.list({
        part: ["snippet", "statistics"],
        chart: "mostPopular",
        regionCode: regionCode,
        maxResults: parseInt(maxResults),
        pageToken: pageToken || undefined,
      });

      const data = response.data;
      let popularVideos = data.items || [];

      // 날짜 필터 적용 (서버 사이드)
      const now = new Date();
      console.log(`[Popular Videos Date Filter] Current time: ${now.toISOString()}`);
      console.log(`[Popular Videos Date Filter] Requested dateFilter: ${dateFilter}`);

      const daysMap: Record<string, number> = {
        today: 1,
        week: 7,
        month: 30,
        "3months": 90,
      };
      const days = daysMap[dateFilter];
      if (days) {
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        console.log(`[Popular Videos Date Filter] Cutoff date: ${cutoffDate.toISOString()} (${days} days ago)`);
        const beforeCount = popularVideos.length;
        popularVideos = popularVideos.filter((video: any) => {
          const publishedDate = new Date(video.snippet?.publishedAt || 0);
          return publishedDate >= cutoffDate;
        });
        console.log(`[Popular Videos Date Filter] Before: ${beforeCount}, After: ${popularVideos.length}`);
      } else {
        console.log(`[Popular Videos Date Filter] No valid days found for dateFilter: ${dateFilter}`);
      }

      // 정렬 적용 (mostPopular는 이미 인기순이므로 date만 처리)
      if (sortOrder === "date") {
        popularVideos.sort((a: any, b: any) => {
          const aDate = new Date(a.snippet?.publishedAt || 0).getTime();
          const bDate = new Date(b.snippet?.publishedAt || 0).getTime();
          return bDate - aDate;
        });
        console.log("Sorted popular videos by date");
      }

      videos = popularVideos;
      nextToken = data.nextPageToken || undefined;
      prevToken = data.prevPageToken || undefined;
      totalResults = videos.length;
    }

    return NextResponse.json({
      videos: videos.map((video: any) => ({
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.high.url,
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        viewCount: parseInt(video.statistics?.viewCount || "0"),
        likeCount: parseInt(video.statistics?.likeCount || "0"),
        commentCount: parseInt(video.statistics?.commentCount || "0"),
        url:
          type === "shorts"
            ? `https://www.youtube.com/shorts/${video.id}`
            : `https://www.youtube.com/watch?v=${video.id}`,
      })),
      totalResults,
      nextPageToken: nextToken,
      prevPageToken: prevToken,
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
