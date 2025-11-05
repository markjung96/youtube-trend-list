import { NextRequest, NextResponse } from "next/server";

// 동적 라우트로 설정 (searchParams 사용)
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
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const maxResults = searchParams.get("maxResults") || "25";
    const regionCode = searchParams.get("regionCode") || "KR";
    const order = searchParams.get("order") || "viewCount";

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "YouTube API key is not configured" }, { status: 500 });
    }

    // 1. 인기 영상 검색 (mostPopular)
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=${maxResults}&key=${apiKey}`
    );

    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      return NextResponse.json(
        { error: error.error?.message || "YouTube API error" },
        { status: searchResponse.status }
      );
    }

    const data = await searchResponse.json();

    // 조회수 기준으로 정렬
    const videos = (data.items || []).sort((a: YouTubeVideo, b: YouTubeVideo) => {
      const aViews = parseInt(a.statistics?.viewCount || "0");
      const bViews = parseInt(b.statistics?.viewCount || "0");
      return bViews - aViews;
    });

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
      totalResults: data.pageInfo?.totalResults || videos.length,
    });
  } catch (error) {
    console.error("YouTube API Error:", error);
    return NextResponse.json({ error: "Failed to fetch YouTube videos" }, { status: 500 });
  }
}
